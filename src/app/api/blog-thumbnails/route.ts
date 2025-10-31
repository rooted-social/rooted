import { NextRequest, NextResponse } from 'next/server'
import { r2Client, PutObjectCommand, buildPublicR2UrlForBucket, BLOG_IMAGE_BUCKET } from '@/lib/r2'
import { processBlogThumbnail, getImageMeta } from '@/lib/image'
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
    if (!file) return NextResponse.json({ error: 'file is required' }, { status: 400 })
    const allowed = new Set(['image/jpeg','image/png','image/webp'])
    const contentType = (file as any).type || ''
    if (!allowed.has(contentType)) {
      return NextResponse.json({ error: 'unsupported file type' }, { status: 400 })
    }
    const size = (file as any).size as number | undefined
    if (typeof size === 'number' && size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'file too large (max 5MB)' }, { status: 400 })
    }
    const id = randomUUID()
    const key = `blog/${user.id}/${id}-thumbnail.webp`
    const buf = Buffer.from(await file.arrayBuffer())
    const processed = await processBlogThumbnail(buf)
    await r2Client.send(new PutObjectCommand({ Bucket: BLOG_IMAGE_BUCKET, Key: key, Body: processed.buffer, ContentType: processed.contentType, CacheControl: 'public, max-age=31536000, s-maxage=31536000, immutable' }))
    const meta = await getImageMeta(processed.buffer)
    const url = buildPublicR2UrlForBucket(BLOG_IMAGE_BUCKET, key)
    return NextResponse.json({ key, url, width: meta.width, height: meta.height, bytes: meta.bytes, contentType: meta.contentType })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'upload failed' }, { status: 500 })
  }
}


