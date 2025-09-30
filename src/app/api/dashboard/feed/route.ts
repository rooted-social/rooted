import { NextRequest } from 'next/server'
import { createServerClient, createServerClientWithAuth } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const communityId = searchParams.get('communityId')
  const pageId = searchParams.get('pageId')
  const limit = Math.max(1, Math.min(50, Number(searchParams.get('limit') || '10')))
  const offset = Math.max(0, Number(searchParams.get('offset') || '0'))
  if (!communityId) {
    return new Response(JSON.stringify({ error: 'communityId is required' }), { status: 400 })
  }

  const authHeader = req.headers.get('authorization') || ''
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined
  const supabase = await createServerClientWithAuth(bearer)

  try {
    // 멤버십 체크: 쿠키 또는 Authorization 헤더 기반 사용자
    const { data: { user } } = await supabase.auth.getUser()
    const authUserId = user?.id
    if (!authUserId) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
    const [{ data: community }, { data: member }] = await Promise.all([
      supabase.from('communities').select('owner_id').eq('id', communityId).single(),
      supabase.from('community_members').select('role').eq('community_id', communityId as string).eq('user_id', authUserId).maybeSingle(),
    ])
    const isOwner = community && (community as any).owner_id === authUserId
    const isMember = member && (member as any).role && (member as any).role !== 'pending'
    if (!isOwner && !isMember) {
      return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 })
    }

    // Posts (count + page)
    let base = supabase.from('posts')
    let qCount = base.select('*', { count: 'exact', head: true }).eq('community_id', communityId)
    let q = base
      .select('*')
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

    // Profiles
    let profileMap: Record<string, any> = {}
    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, updated_at')
        .in('id', userIds as any)
      profileMap = Object.fromEntries((profs || []).map((p: any) => [p.id, p]))
    }

    // Likes and Comments (aggregated)
    let likeCounts: Record<string, number> = {}
    let commentCounts: Record<string, number> = {}
    if (postIds.length > 0) {
      const [{ data: likeRows }, { data: commentRows }] = await Promise.all([
        supabase.from('post_likes').select('post_id').in('post_id', postIds as any),
        supabase.from('comments').select('post_id').in('post_id', postIds as any),
      ])
      for (const row of (likeRows || []) as any[]) {
        const pid = (row as any).post_id
        likeCounts[pid] = (likeCounts[pid] || 0) + 1
      }
      for (const row of (commentRows || []) as any[]) {
        const pid = (row as any).post_id
        commentCounts[pid] = (commentCounts[pid] || 0) + 1
      }
    }

    const merged = postList.map(p => ({ ...p, author: profileMap[p.user_id] }))

    return new Response(
      JSON.stringify({ posts: merged, likeCounts, commentCounts, totalCount }),
      { 
        status: 200, 
        headers: { 
          'content-type': 'application/json',
          'Cache-Control': 'public, max-age=60, s-maxage=60',
        } 
      }
    )
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'failed to load feed' }), { status: 500 })
  }
}



