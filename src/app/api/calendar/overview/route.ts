import { NextRequest } from 'next/server'
import { createServerClientWithAuth } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const communityId = searchParams.get('communityId')
  if (!communityId) {
    return new Response(JSON.stringify({ error: 'communityId is required' }), { status: 400 })
  }

  const authHeader = req.headers.get('authorization') || ''
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined
  const supabase = await createServerClientWithAuth(bearer)

  try {
    // 인증 및 멤버십 체크 (1회)
    const { data: { user } } = await supabase.auth.getUser()
    const authUserId = user?.id
    if (!authUserId) {
      return new Response(JSON.stringify({ events: [], isOwner: false, brandColor: null }), { status: 401 })
    }

    const superId = process.env.SUPER_ADMIN_USER_ID
    const isSuper = !!superId && superId === authUserId
    let isOwner = false
    if (!isSuper) {
      const [{ data: community }, { data: member }] = await Promise.all([
        supabase.from('communities').select('owner_id').eq('id', communityId).single(),
        supabase.from('community_members').select('role').eq('community_id', communityId).eq('user_id', authUserId).maybeSingle(),
      ])
      isOwner = !!community && (community as any).owner_id === authUserId
      const isMember = member && (member as any).role && (member as any).role !== 'pending'
      if (!isOwner && !isMember) {
        return new Response(JSON.stringify({ events: [], isOwner: false, brandColor: null }), { status: 403 })
      }
    } else {
      isOwner = true
    }

    // 이벤트 목록 + 브랜드 컬러
    const canUseAdmin = !!process.env.SUPABASE_SERVICE_ROLE_KEY
    const db = isSuper && canUseAdmin ? createAdminClient() : supabase
    const [{ data: events }, { data: settings }] = await Promise.all([
      db
        .from('community_events')
        .select('id, community_id, title, description, location, start_at, end_at, color, created_by, created_at')
        .eq('community_id', communityId)
        .order('start_at', { ascending: true }),
      db
        .from('community_settings')
        .select('brand_color')
        .eq('community_id', communityId)
        .maybeSingle(),
    ])

    const payload = {
      events: (events || []),
      isOwner,
      brandColor: (settings as any)?.brand_color || null,
    }

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'Cache-Control': 'public, max-age=60, s-maxage=60',
      },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'failed to load calendar overview' }), { status: 500 })
  }
}


