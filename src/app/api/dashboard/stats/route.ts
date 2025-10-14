import { NextRequest } from 'next/server'
import { getJsonCache, putJsonCache } from '@/lib/r2'
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
    // R2 JSON 캐시 조회 (커뮤니티 단위 5분 캐시)
    const cacheKey = `stats/${communityId}.json`
    const cached = await getJsonCache(cacheKey)
    if (cached) {
      return new Response(JSON.stringify(cached), { status: 200, headers: { 'content-type': 'application/json', 'Cache-Control': 'public, max-age=60, s-maxage=60' } })
    }
    // 중앙화 사용자 식별/권한
    const authUserId = await resolveUserId(req)
    if (!authUserId) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
    const superId = process.env.SUPER_ADMIN_USER_ID
    const isSuper = !!superId && superId === authUserId
    const access = await getCommunityAccess(supabase, communityId, authUserId, { superAdmin: isSuper })
    if (!access.isOwner && !access.isMember) {
      return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 })
    }

    // 1) 집계 RPC가 있다면 우선 시도 (단일 호출)
    const canUseAdmin = !!process.env.SUPABASE_SERVICE_ROLE_KEY
    const db = isSuper && canUseAdmin ? createAdminClient() : supabase
    try {
      const { data: agg } = await db.rpc('community_dashboard_stats', { p_community_id: communityId })
      if (agg) {
        const payload = {
          memberCount: (agg as any).member_count || 0,
          postCount: (agg as any).post_count || 0,
          commentCount: (agg as any).comment_count || 0,
          classCount: (agg as any).class_count || 0,
          blogCount: (agg as any).blog_count || 0,
          upcomingEventCount: (agg as any).upcoming_event_count || 0,
        }
        await putJsonCache(cacheKey, payload, 300)
        return new Response(JSON.stringify(payload), {
          status: 200,
          headers: {
            'content-type': 'application/json',
            'Cache-Control': 'public, max-age=300, s-maxage=300',
          },
        })
      }
    } catch {}

    // 멤버/게시글/클래스 카운트 + 이벤트 목록 일부
    const [membersRes, postsRes, classesRes, eventsRes] = await Promise.all([
      db.from('community_members').select('*', { count: 'exact', head: true }).eq('community_id', communityId).or('role.is.null,role.neq.pending'),
      db.from('posts').select('*', { count: 'exact', head: true }).eq('community_id', communityId),
      db.from('classes').select('*', { count: 'exact', head: true }).eq('community_id', communityId),
      db.from('community_events').select('id,start_at').eq('community_id', communityId),
    ])

    // 댓글 카운트 (post_id 목록을 한 번에 in)
    let commentCount = 0
    const { data: postIdRows } = await db.from('posts').select('id').eq('community_id', communityId)
    const postIds = (postIdRows || []).map((p: any) => p.id)
    if (postIds.length > 0) {
      const { count } = await db.from('comments').select('*', { count: 'exact', head: true }).in('post_id', postIds)
      commentCount = count || 0
    }

    // 블로그 포스트 카운트
    let blogCount = 0
    try {
      const { data: blogPages } = await db
        .from('community_pages')
        .select('id')
        .eq('community_id', communityId)
        .eq('type', 'blog')
      const ids = (blogPages || []).map((p: any) => p.id)
      if (ids.length > 0) {
        const { count } = await db
          .from('community_page_blog_posts')
          .select('*', { count: 'exact', head: true })
          .in('page_id', ids)
        blogCount = count || 0
      }
    } catch {}

    const payload = {
      memberCount: membersRes.count || 0,
      postCount: postsRes.count || 0,
      commentCount,
      classCount: classesRes.count || 0,
      blogCount,
      upcomingEventCount: Array.isArray(eventsRes?.data)
        ? (eventsRes.data as any[]).filter((e) => new Date(e.start_at) > new Date()).length
        : 0,
    }
    await putJsonCache(cacheKey, payload, 300)

    return new Response(JSON.stringify(payload), { 
      status: 200, 
      headers: { 
        'content-type': 'application/json',
        // 캐시 여유 있게: 5분
        'Cache-Control': 'public, max-age=300, s-maxage=300',
      } 
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'failed to load stats' }), { status: 500 })
  }
}


