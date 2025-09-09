import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const communityId = searchParams.get('communityId')
  const pageId = searchParams.get('pageId')
  const limit = Math.max(1, Math.min(50, Number(searchParams.get('limit') || '10')))
  const offset = Math.max(0, Number(searchParams.get('offset') || '0'))
  if (!communityId) {
    return new Response(JSON.stringify({ error: 'communityId is required' }), { status: 400 })
  }

  const supabase = createServerClient()

  try {
    // Posts (count + page)
    let base = supabase.from('posts')
    let qCount = base.select('*', { count: 'exact', head: true }).eq('community_id', communityId)
    let q = base.select('*').eq('community_id', communityId).order('created_at', { ascending: false }).range(offset, offset + limit - 1)
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



