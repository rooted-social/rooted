import { NextRequest } from 'next/server'
import { createServerClientWithAuth } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { resolveUserId } from '@/lib/auth/user'
import { getCommunityAccess } from '@/lib/community/access'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const pageId = searchParams.get('pageId')
  if (!pageId) {
    return new Response(JSON.stringify({ error: 'pageId is required' }), { status: 400 })
  }

  const authHeader = req.headers.get('authorization') || ''
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined
  const supabase = await createServerClientWithAuth(bearer)

  try {
    // 페이지가 속한 커뮤니티 식별 후 멤버십 체크 (쿠키 기반 사용자)
    const { data: page } = await supabase.from('community_pages').select('id, community_id').eq('id', pageId).maybeSingle()
    const communityId = (page as any)?.community_id as string | undefined
    if (!communityId) return new Response(JSON.stringify({ error: 'not found' }), { status: 404 })
    const authUserId = await resolveUserId(req)
    if (!authUserId) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
    const superId = process.env.SUPER_ADMIN_USER_ID
    const isSuper = !!superId && superId === authUserId
    const access = await getCommunityAccess(supabase, communityId, authUserId, { superAdmin: isSuper })
    if (!isSuper && !access.isOwner && !access.isMember) {
      return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 })
    }

    // 포스트 목록
    const canUseAdmin = !!process.env.SUPABASE_SERVICE_ROLE_KEY
    const db = isSuper && canUseAdmin ? createAdminClient() : supabase
    const { data: posts } = await db
      .from('community_page_blog_posts')
      .select('id,title,content,thumbnail_url,created_at,user_id,pinned')
      .eq('page_id', pageId)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })

    const list = (posts || []) as any[]
    const userIds = Array.from(new Set(list.map(p => p.user_id).filter(Boolean)))
    const postIds = list.map(p => p.id)

    // 작성자
    let profileMap: Record<string, any> = {}
    if (userIds.length > 0) {
      const { data: authors } = await db
        .from('profiles')
        .select('id, full_name, username, avatar_url, updated_at')
        .in('id', userIds)
      profileMap = Object.fromEntries((authors || []).map((a: any) => [a.id, a]))
    }

    // 카운트들
    let likeCounts: Record<string, number> = {}
    let commentCounts: Record<string, number> = {}
    let viewCounts: Record<string, number> = {}
    if (postIds.length > 0) {
      const [likesRes, commentsRes, viewsRes] = await Promise.all([
        db.from('community_page_blog_likes').select('post_id').in('post_id', postIds as any),
        db.from('community_page_blog_comments').select('post_id').in('post_id', postIds as any),
        db.from('community_page_blog_posts').select('id,views').in('id', postIds as any),
      ])
      for (const r of (likesRes.data || []) as any[]) likeCounts[r.post_id] = (likeCounts[r.post_id] || 0) + 1
      for (const r of (commentsRes.data || []) as any[]) commentCounts[r.post_id] = (commentCounts[r.post_id] || 0) + 1
      for (const r of (viewsRes.data || []) as any[]) viewCounts[r.id] = (r.views ?? 0)
    }

    const payload = list.map(p => ({
      ...p,
      pinned: !!p.pinned,
      author: p.user_id ? profileMap[p.user_id] || null : null,
      counts: {
        views: viewCounts[p.id] || 0,
        likes: likeCounts[p.id] || 0,
        comments: commentCounts[p.id] || 0,
      },
    }))

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'Cache-Control': 'public, max-age=60, s-maxage=60',
      },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'failed to load blog list' }), { status: 500 })
  }
}


