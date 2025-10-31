import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { r2Client, COMMUNITY_IMAGE_BUCKET, COMMUNITY_ICON_BUCKET, COMMUNITY_BANNER_BUCKET, extractKeyFromUrl } from '@/lib/r2'
import { DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { communityId } = await req.json()
    if (!communityId) return NextResponse.json({ error: 'communityId is required' }, { status: 400 })

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

    const { data: comm } = await sb
      .from('communities')
      .select('id, slug, owner_id, image_url, icon_url')
      .eq('id', communityId)
      .maybeSingle()
    if (!comm) return NextResponse.json({ error: 'not found' }, { status: 404 })
    const isOwner = (comm as any).owner_id === user.id || (process.env.SUPER_ADMIN_USER_ID && process.env.SUPER_ADMIN_USER_ID === user.id)
    if (!isOwner) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

    const slug = (comm as any).slug as string

    // 1) community_images 테이블 기반 키 삭제
    try {
      const { data: imgs } = await sb
        .from('community_images')
        .select('key')
        .eq('slug', slug)
      if (imgs && imgs.length > 0) {
        await Promise.allSettled(imgs.map((r: any) => r.key ? r2Client.send(new DeleteObjectCommand({ Bucket: COMMUNITY_IMAGE_BUCKET, Key: r.key })) : Promise.resolve(null)))
      }
    } catch {}

    // 2) R2 prefix 폴백 삭제 (누락 보완)
    try {
      const prefix = `${slug}/`
      const list = await r2Client.send(new ListObjectsV2Command({ Bucket: COMMUNITY_IMAGE_BUCKET, Prefix: prefix }))
      const contents = list.Contents || []
      if (contents.length > 0) {
        await Promise.allSettled(contents.map(obj => obj.Key ? r2Client.send(new DeleteObjectCommand({ Bucket: COMMUNITY_IMAGE_BUCKET, Key: obj.Key! })) : Promise.resolve(null)))
      }
    } catch {}

    // 3) icon/banner 개별 키 삭제(있으면)
    const iconKey = extractKeyFromUrl((comm as any).icon_url || undefined)
    if (iconKey) {
      try { await r2Client.send(new DeleteObjectCommand({ Bucket: COMMUNITY_ICON_BUCKET, Key: iconKey })) } catch {}
    }
    const { data: settings } = await sb
      .from('community_settings')
      .select('banner_url')
      .eq('community_id', communityId)
      .maybeSingle()
    const bannerKey = extractKeyFromUrl((settings as any)?.banner_url || undefined)
    if (bannerKey) {
      try { await r2Client.send(new DeleteObjectCommand({ Bucket: COMMUNITY_BANNER_BUCKET, Key: bannerKey })) } catch {}
    }

    // 4) 커뮤니티 삭제 (연관 테이블은 FK/RLS 정책에 따름)
    const { error: delErr } = await sb.from('communities').delete().eq('id', communityId)
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'delete failed' }, { status: 500 })
  }
}


