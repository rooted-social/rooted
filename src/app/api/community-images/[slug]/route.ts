import { NextRequest, NextResponse } from 'next/server'
import { r2Client, ListObjectsV2Command, PutObjectCommand, DeleteObjectCommand, buildPublicR2UrlForBucket, COMMUNITY_IMAGE_BUCKET, COMMUNITY_ICON_BUCKET, COMMUNITY_BANNER_BUCKET } from '@/lib/r2'
import { processCommunityImage, processCommunityIcon, processCommunityBanner } from '@/lib/image'
import { createServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

async function assertOwner(req: NextRequest, slug: string) {
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
  const { data: comm } = await sb.from('communities').select('id, owner_id').eq('slug', slug).maybeSingle()
  const ownerId = (comm as any)?.owner_id || null
  if (!ownerId || ownerId !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  return { userId: user.id as string, communityId: (comm as any)?.id as string | null }
}

export async function GET(req: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params
  if (!slug) return new Response(JSON.stringify({ error: 'slug is required' }), { status: 400 })

  try {
    // optional limit param: clamp to 1..20 (default 10)
    let limit = 10
    try {
      const url = new URL(req.url)
      const raw = url.searchParams.get('limit')
      if (raw != null) {
        const n = Math.floor(Number(raw))
        if (Number.isFinite(n)) limit = Math.min(20, Math.max(1, n))
      }
    } catch {}
    // 1) 우선 Supabase community_images 테이블 우선 조회 (있다면 정렬/메타 활용)
    try {
      const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
      const { data: rows } = await sb
        .from('community_images')
        .select('key, url, is_main, position, created_at')
        .eq('slug', slug)
        .order('is_main', { ascending: false })
        .order('position', { ascending: true, nullsFirst: true })
        .order('created_at', { ascending: true })
        .limit(limit)
      if (rows && rows.length > 0) {
        const items = rows.map((r: any) => ({
          key: r.key as string,
          // 저장된 url이 잘못된 BASE일 수 있으므로 항상 key로 재구성
          url: buildPublicR2UrlForBucket(COMMUNITY_IMAGE_BUCKET, r.key as string),
        }))
        return new Response(JSON.stringify({ images: items }), { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' } })
      }
    } catch {}

    // 2) 폴백: R2에서 직접 나열 (짧은 캐시)
    const prefix = `${slug}/`
    const list = await r2Client.send(new ListObjectsV2Command({ Bucket: COMMUNITY_IMAGE_BUCKET, Prefix: prefix, MaxKeys: limit }))
    const items = (list.Contents || [])
      .filter(obj => !!obj.Key && !obj.Key.endsWith('/'))
      .slice(0, limit)
      .map(obj => ({ key: obj.Key as string, url: buildPublicR2UrlForBucket(COMMUNITY_IMAGE_BUCKET, obj.Key as string) }))
    return new Response(JSON.stringify({ images: items }), { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Failed to list images' }), { status: 500 })
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params
  try {
    const owner = await assertOwner(req, slug)
    if (owner instanceof NextResponse) return owner as any
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const target = (formData.get('target') as string | null) || 'images' // images | icon | banner
    if (!file) return new Response(JSON.stringify({ error: 'file is required' }), { status: 400 })
    // 형식/크기 제한 (블로그 이미지와 동일 정책, 친절한 메시지)
    const allowed = new Set(['image/jpeg','image/png','image/webp','image/gif'])
    const contentType = (file as any).type || ''
    if (!allowed.has(contentType)) {
      return NextResponse.json({ error: '지원하지 않는 파일 형식입니다. JPG, PNG, WEBP, GIF만 업로드할 수 있어요.' }, { status: 400 })
    }
    const size = (file as any).size as number | undefined
    if (typeof size === 'number' && size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: '파일이 너무 큽니다. 최대 5MB까지 업로드할 수 있어요.' }, { status: 400 })
    }
    const safeName = file.name.replace(/[^\w.\-]+/g, '_')
    const key = `${slug}/${Date.now()}_${safeName}`
    const arrayBuffer = await file.arrayBuffer()
    const bucket = target === 'icon' ? COMMUNITY_ICON_BUCKET : (target === 'banner' ? COMMUNITY_BANNER_BUCKET : COMMUNITY_IMAGE_BUCKET)
    // sharp 처리 단계에서의 오류를 사용자 친화적으로 변환
    let processed: { buffer: Buffer; contentType: string }
    try {
      processed = target === 'icon' ? await processCommunityIcon(Buffer.from(arrayBuffer)) : (target === 'banner' ? await processCommunityBanner(Buffer.from(arrayBuffer)) : await processCommunityImage(Buffer.from(arrayBuffer)))
    } catch (e: any) {
      const msg = (e?.message || '').toLowerCase()
      if (msg.includes('input buffer contains unsupported image format') || msg.includes('heic') || msg.includes('heif')) {
        return NextResponse.json({ error: '이미지 변환에 실패했습니다. HEIC/HEIF 등은 지원되지 않을 수 있어요. JPG/PNG/WEBP로 변환해서 다시 시도해 주세요.' }, { status: 400 })
      }
      return NextResponse.json({ error: '이미지 처리 중 오류가 발생했습니다. 다른 형식으로 다시 시도해 주세요.' }, { status: 400 })
    }
    // 버킷 오류 메시지 개선
    try {
      await r2Client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: processed.buffer, ContentType: processed.contentType }))
    } catch (e: any) {
      const msg = (e?.message || '').toLowerCase()
      if (msg.includes('does not exist') || msg.includes('specified bucket')) {
        return NextResponse.json({ error: `R2 버킷 '${bucket}'을 찾을 수 없습니다. 버킷을 생성했는지 또는 환경변수를 확인해 주세요.` }, { status: 500 })
      }
      throw e
    }
    const url = buildPublicR2UrlForBucket(bucket, key)
    // Supabase 테이블에 메타 저장 (있을 경우)
    try {
      const supa = await createServerClient()
      let commId = owner.communityId
      if (!commId) {
        const { data: comm } = await supa.from('communities').select('id').eq('slug', slug).maybeSingle()
        commId = (comm as any)?.id || null
      }
      if (target === 'icon') {
        // 아이콘은 별도 컬럼(icon_url)에 저장 (image_url과 분리)
        try {
          if (commId) await supa.from('communities').update({ icon_url: url }).eq('id', commId)
        } catch {}
      } else if (target === 'images') {
        // position 계산: 현재 최대 position + 1
        let position = 0
        try {
          const { data: maxRow } = await supa
            .from('community_images')
            .select('position')
            .eq('slug', slug)
            .order('position', { ascending: false })
            .limit(1)
            .maybeSingle()
          position = (maxRow?.position ?? -1) + 1
        } catch {}
        await supa.from('community_images').insert({ slug, community_id: commId ?? null, key, url, position }).select().maybeSingle()
      } else if (target === 'banner') {
        // 커뮤니티 배너 URL 저장 (upsert)
        await supa
          .from('community_settings')
          .upsert({ community_id: commId, banner_url: url, updated_by: owner.userId }, { onConflict: 'community_id' })
          .select()
          .maybeSingle()
      }
    } catch {}
    return new Response(JSON.stringify({ key, url }), { status: 200 })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Upload failed' }), { status: 500 })
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params
  try {
    const owner = await assertOwner(req, slug)
    if (owner instanceof NextResponse) return owner as any
    const { searchParams } = new URL(req.url)
    const key = searchParams.get('key')
    if (!key || !key.startsWith(`${slug}/`)) return new Response(JSON.stringify({ error: 'invalid key' }), { status: 400 })
    await r2Client.send(new DeleteObjectCommand({ Bucket: COMMUNITY_IMAGE_BUCKET, Key: key }))
    try {
      const supa = await createServerClient()
      await supa.from('community_images').delete().eq('key', key)
    } catch {}
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Delete failed' }), { status: 500 })
  }
}


