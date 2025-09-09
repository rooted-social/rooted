import { NextRequest, NextResponse } from 'next/server'
import { r2Client, PutObjectCommand, buildPublicR2UrlForBucket, CLASS_THUMBNAIL_BUCKET } from '@/lib/r2'
import { processClassThumbnail } from '@/lib/image'

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'file is required' }, { status: 400 })
    const safe = file.name.replace(/[^\w.\-]+/g, '_')
    const key = `${Date.now()}_${safe}`
    const buf = Buffer.from(await file.arrayBuffer())
    const processed = await processClassThumbnail(buf)
    // 버킷 존재 오류 방지: 존재하지 않으면 에러 메시지 개선
    try {
      await r2Client.send(new PutObjectCommand({ Bucket: CLASS_THUMBNAIL_BUCKET, Key: key, Body: processed.buffer, ContentType: processed.contentType }))
    } catch (e: any) {
      const msg = (e?.message || '').toLowerCase()
      if (msg.includes('does not exist') || msg.includes('specified bucket')) {
        return NextResponse.json({ error: `R2 bucket '${CLASS_THUMBNAIL_BUCKET}' not found. Set R2_CLASS_THUMBNAIL_BUCKET or create the bucket.` }, { status: 500 })
      }
      throw e
    }
    const url = buildPublicR2UrlForBucket(CLASS_THUMBNAIL_BUCKET, key)
    return NextResponse.json({ key, url })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'upload failed' }, { status: 500 })
  }
}


