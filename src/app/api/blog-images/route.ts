import { NextRequest, NextResponse } from 'next/server'
import { r2Client, PutObjectCommand, buildPublicR2UrlForBucket, BLOG_IMAGE_BUCKET } from '@/lib/r2'
import { processBlogImage, processBlogImageVariants, getImageMeta } from '@/lib/image'
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
    const pageId = (form.get('pageId') as string | null) || (form.get('page_id') as string | null) || null
    const postId = (form.get('postId') as string | null) || (form.get('post_id') as string | null) || null
    if (!file) return NextResponse.json({ error: 'file is required' }, { status: 400 })
    // MIME 및 크기 제한
    const allowed = new Set(['image/jpeg','image/png','image/webp','image/gif'])
    const contentType = (file as any).type || ''
    if (!allowed.has(contentType)) {
      return NextResponse.json({ error: 'unsupported file type' }, { status: 400 })
    }
    const size = (file as any).size as number | undefined
    if (typeof size === 'number' && size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'file too large (max 5MB)' }, { status: 400 })
    }
    const id = randomUUID()
    const baseKey = `blog/${user.id}/${id}`
    const buf = Buffer.from(await file.arrayBuffer())
    const isGif = contentType === 'image/gif'
    const variants = await processBlogImageVariants(buf, { animated: isGif })
    const smKey = `${baseKey}-sm.webp`
    const mdKey = `${baseKey}-md.webp`
    const lgKey = `${baseKey}-lg.webp`
    await Promise.all([
      r2Client.send(new PutObjectCommand({ Bucket: BLOG_IMAGE_BUCKET, Key: smKey, Body: variants.sm.buffer, ContentType: variants.sm.contentType, CacheControl: 'public, max-age=31536000, s-maxage=31536000, immutable' })),
      r2Client.send(new PutObjectCommand({ Bucket: BLOG_IMAGE_BUCKET, Key: mdKey, Body: variants.md.buffer, ContentType: variants.md.contentType, CacheControl: 'public, max-age=31536000, s-maxage=31536000, immutable' })),
      r2Client.send(new PutObjectCommand({ Bucket: BLOG_IMAGE_BUCKET, Key: lgKey, Body: variants.lg.buffer, ContentType: variants.lg.contentType, CacheControl: 'public, max-age=31536000, s-maxage=31536000, immutable' })),
    ])
    const [smMeta, mdMeta, lgMeta] = await Promise.all([
      getImageMeta(variants.sm.buffer),
      getImageMeta(variants.md.buffer),
      getImageMeta(variants.lg.buffer),
    ])
    const sm = buildPublicR2UrlForBucket(BLOG_IMAGE_BUCKET, smKey)
    const md = buildPublicR2UrlForBucket(BLOG_IMAGE_BUCKET, mdKey)
    const lg = buildPublicR2UrlForBucket(BLOG_IMAGE_BUCKET, lgKey)
    // DB 기록 (blog_images) - RLS 하에서 사용자 토큰으로 insert
    try {
      const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
      const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
      if (token) {
        const sb = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          { global: { headers: { Authorization: `Bearer ${token}` } } }
        )
        const rows = [
          { variant: 'sm', key: smKey, url: sm, width: smMeta.width, height: smMeta.height, bytes: smMeta.bytes, content_type: smMeta.contentType },
          { variant: 'md', key: mdKey, url: md, width: mdMeta.width, height: mdMeta.height, bytes: mdMeta.bytes, content_type: mdMeta.contentType },
          { variant: 'lg', key: lgKey, url: lg, width: lgMeta.width, height: lgMeta.height, bytes: lgMeta.bytes, content_type: lgMeta.contentType },
        ].map(r => ({ ...r, user_id: (user as any).id, page_id: pageId, post_id: postId }))
        await sb.from('blog_images').insert(rows)
      }
    } catch {}

    return NextResponse.json({
      keys: { sm: smKey, md: mdKey, lg: lgKey },
      urls: { sm, md, lg },
      srcset: `${sm} 400w, ${md} 800w, ${lg} 1200w`,
      sizes: '(max-width: 640px) 100vw, (max-width: 1024px) 800px, 1200px',
      meta: { sm: smMeta, md: mdMeta, lg: lgMeta },
      pageId,
      postId,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'upload failed' }, { status: 500 })
  }
}


