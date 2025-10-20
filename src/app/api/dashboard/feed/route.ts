import { NextRequest } from 'next/server'
import { createServerClientWithAuth } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { resolveUserId } from '@/lib/auth/user'
import { getCommunityAccess } from '@/lib/community/access'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const communityId = searchParams.get('communityId')
  const pageId = searchParams.get('pageId')
  const limit = Math.max(1, Math.min(50, Number(searchParams.get('limit') || '10')))
  const offset = Math.max(0, Number(searchParams.get('offset') || '0'))
  const cursorCreatedAt = searchParams.get('cursorCreatedAt')
  const cursorId = searchParams.get('cursorId')
  if (!communityId) {
    return new Response(JSON.stringify({ error: 'communityId is required' }), { status: 400 })
  }

  const authHeader = req.headers.get('authorization') || ''
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined
  const supabase = await createServerClientWithAuth(bearer)

  try {
    // 중앙화 사용자 식별/권한
    const authUserId = await resolveUserId(req)
    if (!authUserId) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
    const superId = process.env.SUPER_ADMIN_USER_ID
    const isSuper = !!superId && superId === authUserId
    const access = await getCommunityAccess(supabase, communityId, authUserId, { superAdmin: isSuper })
    if (!isSuper && !access.isOwner && !access.isMember) {
      return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 })
    }

    // RPC 우선: feed_overview (단일 호출)
    try {
      const { data: rpc } = await supabase.rpc('feed_overview', {
        p_community_id: communityId,
        p_page_id: pageId === 'null' ? null : pageId,
        p_limit: limit,
        p_offset: (cursorCreatedAt || cursorId) ? 0 : offset,
        p_cursor_created_at: cursorCreatedAt || null,
        p_cursor_id: cursorId || null,
      })
      if (rpc) {
        const posts = Array.isArray((rpc as any)?.posts) ? (rpc as any).posts : []
        const likeCounts: Record<string, number> = {}
        const commentCounts: Record<string, number> = {}
        for (const p of posts as any[]) {
          const pid = (p as any)?.id
          if (!pid) continue
          likeCounts[pid] = Number((p as any)?.counts?.likes ?? 0)
          commentCounts[pid] = Number((p as any)?.counts?.comments ?? 0)
        }
        const body = { posts, likeCounts, commentCounts, totalCount: Number((rpc as any)?.totalCount ?? posts.length), nextCursor: (rpc as any)?.nextCursor || null }
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: {
            'content-type': 'application/json',
            'Cache-Control': 'public, max-age=60, s-maxage=60',
          },
        })
      }
    } catch {}

    // 폴백: 기존 합성 로직
    const canUseAdmin = !!process.env.SUPABASE_SERVICE_ROLE_KEY
    const db = isSuper && canUseAdmin ? createAdminClient() : supabase
    let base = db.from('posts')
    let qCount = base.select('*', { count: 'exact', head: true }).eq('community_id', communityId)
    let q = base
      .select('id,title,content,created_at,user_id,page_id,category_id,pinned,views')
      .eq('community_id', communityId)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    if (pageId !== null && pageId !== undefined) {
      if (pageId === 'null') {
        q = q.is('page_id', null)
        qCount = qCount.is('page_id', null)
      } else {
        q = q.eq('page_id', pageId)
        qCount = qCount.eq('page_id', pageId)
      }
    }
    const [countRes, dataRes] = await Promise.all([qCount, q])
    const totalCount = countRes.count || 0
    const { data: posts } = dataRes
    const postList = (posts || []) as any[]
    const postIds = postList.map(p => p.id)
    const userIds = Array.from(new Set(postList.map(p => p.user_id)))
    let profileMap: Record<string, any> = {}
    if (userIds.length > 0) {
      const { data: profs } = await db
        .from('profiles')
        .select('id, username, full_name, avatar_url, updated_at')
        .in('id', userIds as any)
      profileMap = Object.fromEntries((profs || []).map((p: any) => [p.id, p]))
    }
    let likeCounts: Record<string, number> = {}
    let commentCounts: Record<string, number> = {}
    if (postIds.length > 0) {
      const [{ data: likeRows }, { data: commentRows }] = await Promise.all([
        db.from('post_likes').select('post_id').in('post_id', postIds as any),
        db.from('comments').select('post_id').in('post_id', postIds as any),
      ])
      for (const row of (likeRows || []) as any[]) likeCounts[(row as any).post_id] = (likeCounts[(row as any).post_id] || 0) + 1
      for (const row of (commentRows || []) as any[]) commentCounts[(row as any).post_id] = (commentCounts[(row as any).post_id] || 0) + 1
    }
    const merged = postList.map(p => ({ ...p, author: profileMap[p.user_id] }))
    return new Response(JSON.stringify({ posts: merged, likeCounts, commentCounts, totalCount }), { status: 200, headers: { 'content-type': 'application/json', 'Cache-Control': 'public, max-age=60, s-maxage=60' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'failed to load feed' }), { status: 500 })
  }
}



