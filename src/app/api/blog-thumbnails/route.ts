import { NextRequest, NextResponse } from 'next/server'
import { r2Client, PutObjectCommand, buildPublicR2UrlForBucket, BLOG_IMAGE_BUCKET } from '@/lib/r2'
import { processBlogThumbnail } from '@/lib/image'

export async function POST(req: NextRequest) {
  try {
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
    const safe = file.name.replace(/[^\w.\-]+/g, '_')
    const key = `${Date.now()}_${safe}`.replace(/\.(jpe?g|png|gif|webp)$/i, '') + '.webp'
    const buf = Buffer.from(await file.arrayBuffer())
    const processed = await processBlogThumbnail(buf)
    await r2Client.send(new PutObjectCommand({ Bucket: BLOG_IMAGE_BUCKET, Key: key, Body: processed.buffer, ContentType: processed.contentType }))
    const url = buildPublicR2UrlForBucket(BLOG_IMAGE_BUCKET, key)
    return NextResponse.json({ key, url, width: 1200, height: 750 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'upload failed' }, { status: 500 })
  }
}


