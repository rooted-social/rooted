import { NextRequest, NextResponse } from 'next/server'
import { r2Client, PutObjectCommand, buildPublicR2UrlForBucket, CLASS_THUMBNAIL_BUCKET } from '@/lib/r2'
import { processClassThumbnail, processClassThumbnailVariants, getImageMeta } from '@/lib/image'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'

async function assertAuth(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
  const { data: { user } } = await sb.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  return user
}

export async function POST(req: NextRequest) {
  try {
    const user = await assertAuth(req)
    if (user instanceof NextResponse) return user as any
    const form = await req.formData()
    const file = form.get('file') as File | null
    const classId = (form.get('classId') as string | null) || (form.get('class_id') as string | null) || null
    if (!file) return NextResponse.json({ error: 'file is required' }, { status: 400 })
    const id = randomUUID()
    const key = `classes/${user.id}/${id}-thumb.webp`
    const buf = Buffer.from(await file.arrayBuffer())
    const variants = await processClassThumbnailVariants(buf)
    // 버킷 존재 오류 방지: 존재하지 않으면 에러 메시지 개선
    try {
      const baseKey = key.replace(/\.webp$/i, '').replace(/-thumb\.webp$/i, '')
      const smKey = `${baseKey}-thumb-sm.webp`
      const mdKey = `${baseKey}-thumb-md.webp`
      const lgKey = `${baseKey}-thumb-lg.webp`
      await Promise.all([
        r2Client.send(new PutObjectCommand({ Bucket: CLASS_THUMBNAIL_BUCKET, Key: smKey, Body: variants.sm.buffer, ContentType: variants.sm.contentType, CacheControl: 'public, max-age=31536000, s-maxage=31536000, immutable' })),
        r2Client.send(new PutObjectCommand({ Bucket: CLASS_THUMBNAIL_BUCKET, Key: mdKey, Body: variants.md.buffer, ContentType: variants.md.contentType, CacheControl: 'public, max-age=31536000, s-maxage=31536000, immutable' })),
        r2Client.send(new PutObjectCommand({ Bucket: CLASS_THUMBNAIL_BUCKET, Key: lgKey, Body: variants.lg.buffer, ContentType: variants.lg.contentType, CacheControl: 'public, max-age=31536000, s-maxage=31536000, immutable' })),
      ])
      const sm = buildPublicR2UrlForBucket(CLASS_THUMBNAIL_BUCKET, smKey)
      const md = buildPublicR2UrlForBucket(CLASS_THUMBNAIL_BUCKET, mdKey)
      const lg = buildPublicR2UrlForBucket(CLASS_THUMBNAIL_BUCKET, lgKey)
      const [smMeta, mdMeta, lgMeta] = await Promise.all([
        getImageMeta(variants.sm.buffer),
        getImageMeta(variants.md.buffer),
        getImageMeta(variants.lg.buffer),
      ])

      // 선택적으로 classes 테이블에 메타 저장(클래스가 이미 존재하는 경우)
      try {
        if (classId) {
          const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
          const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
          if (token) {
            const sb = createClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
              { global: { headers: { Authorization: `Bearer ${token}` } } }
            )
            await sb
              .from('classes')
              .update({
                thumbnail_url: md,
                thumbnail_key: mdKey as any,
                thumbnail_width: mdMeta.width as any,
                thumbnail_height: mdMeta.height as any,
                thumbnail_bytes: mdMeta.bytes as any,
                thumbnail_content_type: mdMeta.contentType as any,
              })
              .eq('id', classId)
          }
        }
      } catch {}
      return NextResponse.json({
        key: mdKey,
        url: md,
        keys: { sm: smKey, md: mdKey, lg: lgKey },
        urls: { sm, md, lg },
        srcset: `${sm} 400w, ${md} 800w, ${lg} 1200w`,
        sizes: '(max-width: 640px) 100vw, (max-width: 1024px) 800px, 1200px',
        meta: { sm: smMeta, md: mdMeta, lg: lgMeta },
      })
    } catch (e: any) {
      const msg = (e?.message || '').toLowerCase()
      if (msg.includes('does not exist') || msg.includes('specified bucket')) {
        return NextResponse.json({ error: `R2 bucket '${CLASS_THUMBNAIL_BUCKET}' not found. Set R2_CLASS_THUMBNAIL_BUCKET or create the bucket.` }, { status: 500 })
      }
      throw e
    }
    // unreachable: success returns earlier
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'upload failed' }, { status: 500 })
  }
}


