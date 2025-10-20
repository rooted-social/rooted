import { NextRequest } from 'next/server'
import { createServerClientWithAuth } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { resolveUserId } from '@/lib/auth/user'
import { getCommunityAccess } from '@/lib/community/access'

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
    // 중앙화 사용자 식별
    const authUserId = await resolveUserId(req)
    if (!authUserId) {
      return new Response(JSON.stringify({ events: [], isOwner: false, brandColor: null }), { status: 401 })
    }

    const superId = process.env.SUPER_ADMIN_USER_ID
    const isSuper = !!superId && superId === authUserId
    const access = await getCommunityAccess(supabase, communityId, authUserId, { superAdmin: isSuper })
    if (!isSuper && !access.isOwner && !access.isMember) {
      return new Response(JSON.stringify({ events: [], isOwner: false, brandColor: null }), { status: 403 })
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
      isOwner: access.isOwner || isSuper,
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


