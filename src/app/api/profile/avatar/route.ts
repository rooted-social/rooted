import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { r2Client, PROFILE_IMAGE_BUCKET, buildPublicR2Url, extractKeyFromUrl, PutObjectCommand, DeleteObjectCommand } from "@/lib/r2"
import { processAvatar } from "@/lib/image"
import { GetObjectCommand } from "@aws-sdk/client-s3"

export const runtime = 'nodejs'

// 파일 이름 안전 처리
function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_")
}

export async function POST(req: NextRequest) {
  // 업로드: multipart/form-data
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file) return NextResponse.json({ error: "file is required" }, { status: 400 })

    // 인증: Authorization: Bearer <token>
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )
    const { data: { user } } = await sb.auth.getUser(token)
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

    // 파일 제한(로컬 테스트 기본): 5MB
    const MAX_SIZE = 5 * 1024 * 1024
    if (file.size > MAX_SIZE) return NextResponse.json({ error: "file too large" }, { status: 413 })

    // 최적화: 간단한 이미지 타입 필터
    const allowed = ["image/png", "image/jpeg", "image/webp", "image/gif"]
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: "unsupported file type" }, { status: 415 })
    }

    const bytes = await file.arrayBuffer()
    const original = Buffer.from(bytes)
    const processed = await processAvatar(original)

    // 파일 키: userId/ts-rand.ext
    const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.webp`
    const key = `${user.id}/${filename}`

    await r2Client.send(new PutObjectCommand({
      Bucket: PROFILE_IMAGE_BUCKET,
      Key: key,
      Body: processed.buffer,
      ContentType: processed.contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }))

    const publicUrl = buildPublicR2Url(key)

    // 이전 아바타 URL 확보 후 업데이트
    const { data: current } = await sb
      .from('profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .single()

    const { error } = await sb
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // 이전 파일 정리(있으면)
    try {
      const prevKey = extractKeyFromUrl(current?.avatar_url)
      if (prevKey && prevKey !== key) {
        await r2Client.send(new DeleteObjectCommand({ Bucket: PROFILE_IMAGE_BUCKET, Key: prevKey }))
      }
    } catch {}

    return NextResponse.json({ url: publicUrl, key })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "upload failed" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )
    const { data: { user } } = await sb.auth.getUser(token)
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const targetUrl = searchParams.get("url")

    // 프로필에서 현재 URL 가져오기(쿼리 없을 시)
    let urlToDelete = targetUrl
    if (!urlToDelete) {
      const { data } = await sb
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .single()
      urlToDelete = data?.avatar_url || null
    }

    const key = extractKeyFromUrl(urlToDelete)
    if (key) {
      await r2Client.send(new DeleteObjectCommand({ Bucket: PROFILE_IMAGE_BUCKET, Key: key }))
    }

    // 프로필의 avatar_url 초기화
    const { error } = await sb
      .from('profiles')
      .update({ avatar_url: null })
      .eq('id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "delete failed" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const byKey = searchParams.get('key')
    const byUrl = searchParams.get('url')
    const key = byKey || extractKeyFromUrl(byUrl || undefined)
    if (!key) return NextResponse.json({ error: 'key or url is required' }, { status: 400 })

    const data: any = await r2Client.send(new GetObjectCommand({ Bucket: PROFILE_IMAGE_BUCKET, Key: key }))
    const chunks: Buffer[] = []
    for await (const chunk of data.Body as any) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    const buffer = Buffer.concat(chunks)
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': data.ContentType || 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable',
      }
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'fetch failed' }, { status: 500 })
  }
}


