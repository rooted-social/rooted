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

export async function GET(_req: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params
  if (!slug) return new Response(JSON.stringify({ error: 'slug is required' }), { status: 400 })

  try {
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
        .limit(10)
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
    const list = await r2Client.send(new ListObjectsV2Command({ Bucket: COMMUNITY_IMAGE_BUCKET, Prefix: prefix, MaxKeys: 10 }))
    const items = (list.Contents || [])
      .filter(obj => !!obj.Key && !obj.Key.endsWith('/'))
      .slice(0, 10)
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
    const safeName = file.name.replace(/[^\w.\-]+/g, '_')
    const key = `${slug}/${Date.now()}_${safeName}`
    const arrayBuffer = await file.arrayBuffer()
    const bucket = target === 'icon' ? COMMUNITY_ICON_BUCKET : (target === 'banner' ? COMMUNITY_BANNER_BUCKET : COMMUNITY_IMAGE_BUCKET)
    const processed = target === 'icon' ? await processCommunityIcon(Buffer.from(arrayBuffer)) : (target === 'banner' ? await processCommunityBanner(Buffer.from(arrayBuffer)) : await processCommunityImage(Buffer.from(arrayBuffer)))
    await r2Client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: processed.buffer, ContentType: processed.contentType }))
    const url = buildPublicR2UrlForBucket(bucket, key)
    // Supabase 테이블에 메타 저장 (있을 경우)
    try {
      const supa = createServerClient()
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
      const supa = createServerClient()
      await supa.from('community_images').delete().eq('key', key)
    } catch {}
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Delete failed' }), { status: 500 })
  }
}


