import { NextRequest } from 'next/server'
import { r2Client, COMMUNITY_IMAGE_BUCKET, COMMUNITY_ICON_BUCKET, COMMUNITY_BANNER_BUCKET, CLASS_THUMBNAIL_BUCKET, BLOG_IMAGE_BUCKET } from '@/lib/r2'
import { GetObjectCommand } from '@aws-sdk/client-s3'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const bucket = searchParams.get('bucket') || undefined
  const key = searchParams.get('key') || undefined
  if (!bucket || !key) return new Response('Bad Request: missing bucket/key', { status: 400 })
  // 허용된 버킷 화이트리스트
  const allowed = new Set([
    COMMUNITY_IMAGE_BUCKET,
    COMMUNITY_ICON_BUCKET,
    COMMUNITY_BANNER_BUCKET,
    CLASS_THUMBNAIL_BUCKET,
    BLOG_IMAGE_BUCKET,
    // 클래스 썸네일 버킷 이명(철자 상이) 허용
    'class-thumnails',
  ])
  if (!allowed.has(bucket)) return new Response('Forbidden bucket', { status: 403 })
  // 철자 상이한 클래스 썸네일 버킷 요청은 내부적으로 표준 버킷으로 교정
  const effectiveBucket = bucket === 'class-thumnails' ? CLASS_THUMBNAIL_BUCKET : bucket
  // 키 프리픽스 방어: 커뮤니티/클래스/블로그는 디렉터리 구조 사용을 권장
  if (bucket === COMMUNITY_IMAGE_BUCKET || bucket === COMMUNITY_ICON_BUCKET || bucket === COMMUNITY_BANNER_BUCKET) {
    // 최소한 "<slug>/..." 형태 강제
    if (!key.includes('/') || key.startsWith('/') || key.endsWith('/')) {
      return new Response('Invalid key', { status: 400 })
    }
  }
  try {
    const res = await r2Client.send(new GetObjectCommand({ Bucket: effectiveBucket, Key: key }))
    const chunks: Uint8Array[] = []
    for await (const chunk of res.Body as AsyncIterable<Uint8Array> | any) {
      chunks.push(typeof chunk === 'string' ? new TextEncoder().encode(chunk) : chunk)
    }
    const body = Buffer.concat(chunks as Uint8Array[])
    const headers = new Headers()
    headers.set('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable')
    if (res.ContentType) headers.set('Content-Type', res.ContentType)
    if (res.ETag) headers.set('ETag', res.ETag)
    if (res.LastModified) headers.set('Last-Modified', res.LastModified.toUTCString())
    return new Response(body, { status: 200, headers })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Not Found'
    return new Response(msg, { status: 404 })
  }
}


