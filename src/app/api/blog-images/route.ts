import { NextRequest, NextResponse } from 'next/server'
import { r2Client, PutObjectCommand, buildPublicR2UrlForBucket, BLOG_IMAGE_BUCKET } from '@/lib/r2'
import { processBlogImage, processBlogImageVariants } from '@/lib/image'

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
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
    const safe = file.name.replace(/[^\w.\-]+/g, '_')
    const baseKey = `${Date.now()}_${safe}`.replace(/\.(jpe?g|png|gif|webp)$/i, '')
    const buf = Buffer.from(await file.arrayBuffer())
    const variants = await processBlogImageVariants(buf)
    const smKey = `${baseKey}-sm.webp`
    const mdKey = `${baseKey}-md.webp`
    const lgKey = `${baseKey}-lg.webp`
    await Promise.all([
      r2Client.send(new PutObjectCommand({ Bucket: BLOG_IMAGE_BUCKET, Key: smKey, Body: variants.sm.buffer, ContentType: variants.sm.contentType })),
      r2Client.send(new PutObjectCommand({ Bucket: BLOG_IMAGE_BUCKET, Key: mdKey, Body: variants.md.buffer, ContentType: variants.md.contentType })),
      r2Client.send(new PutObjectCommand({ Bucket: BLOG_IMAGE_BUCKET, Key: lgKey, Body: variants.lg.buffer, ContentType: variants.lg.contentType })),
    ])
    const sm = buildPublicR2UrlForBucket(BLOG_IMAGE_BUCKET, smKey)
    const md = buildPublicR2UrlForBucket(BLOG_IMAGE_BUCKET, mdKey)
    const lg = buildPublicR2UrlForBucket(BLOG_IMAGE_BUCKET, lgKey)
    return NextResponse.json({
      keys: { sm: smKey, md: mdKey, lg: lgKey },
      urls: { sm, md, lg },
      srcset: `${sm} 400w, ${md} 800w, ${lg} 1200w`,
      sizes: '(max-width: 640px) 100vw, (max-width: 1024px) 800px, 1200px'
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'upload failed' }, { status: 500 })
  }
}


