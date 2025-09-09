import { NextRequest, NextResponse } from 'next/server'
import { r2Client, PutObjectCommand, buildPublicR2UrlForBucket, BLOG_IMAGE_BUCKET } from '@/lib/r2'
import { processBlogImage } from '@/lib/image'

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'file is required' }, { status: 400 })
    const safe = file.name.replace(/[^\w.\-]+/g, '_')
    const key = `${Date.now()}_${safe}`
    const buf = Buffer.from(await file.arrayBuffer())
    const processed = await processBlogImage(buf)
    await r2Client.send(new PutObjectCommand({ Bucket: BLOG_IMAGE_BUCKET, Key: key, Body: processed.buffer, ContentType: processed.contentType }))
    const url = buildPublicR2UrlForBucket(BLOG_IMAGE_BUCKET, key)
    return NextResponse.json({ key, url })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'upload failed' }, { status: 500 })
  }
}


