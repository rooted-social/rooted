import { NextRequest } from 'next/server'
import { createServerClientWithAuth } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const communityId = searchParams.get('communityId')
  const pageIdsParam = searchParams.get('pageIds') // comma-separated blog page ids (optional)
  const feedPageIdsParam = searchParams.get('feedPageIds') // comma-separated feed page ids (optional)
  if (!communityId) return new Response(JSON.stringify({ error: 'communityId is required' }), { status: 400 })

  const authHeader = req.headers.get('authorization') || ''
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined
  const supabase = await createServerClientWithAuth(bearer)

  try {
    // 인증/멤버십 체크
    const { data: { user } } = await supabase.auth.getUser()
    const authUserId = user?.id
    if (!authUserId) return new Response(JSON.stringify({}), { status: 401 })
    const [{ data: community }, { data: member }] = await Promise.all([
      supabase.from('communities').select('owner_id').eq('id', communityId).single(),
      supabase.from('community_members').select('role').eq('community_id', communityId).eq('user_id', authUserId).maybeSingle(),
    ])
    const isOwner = community && (community as any).owner_id === authUserId
    const isMember = member && (member as any).role && (member as any).role !== 'pending'
    if (!isOwner && !isMember) return new Response(JSON.stringify({}), { status: 403 })

    // 전역 피드 최신 글
    const { data: feedRows } = await supabase
      .from('posts')
      .select('created_at')
      .eq('community_id', communityId)
      .order('created_at', { ascending: false })
      .limit(1)

    // 블로그 페이지별 최신 글
    let pageLatestMap: Record<string, string> = {}
    // 피드 페이지별 최신 글
    let feedPageLatestMap: Record<string, string> = {}
    const pageIds = (pageIdsParam || '').split(',').map(s => s.trim()).filter(Boolean)
    if (pageIds.length > 0) {
      // 제한된 목록만 질의
      const { data: bRows } = await supabase
        .from('community_page_blog_posts')
        .select('page_id, created_at')
        .in('page_id', pageIds as any)
        .order('created_at', { ascending: false })
      for (const r of (bRows || []) as any[]) {
        if (!pageLatestMap[r.page_id]) pageLatestMap[r.page_id] = r.created_at
      }
    } else {
      // 커뮤니티 내 전체 블로그 페이지를 대상으로 최대치 계산
      const { data: bRows } = await supabase
        .from('community_page_blog_posts')
        .select('page_id, created_at')
        .in('page_id', (await supabase.from('community_pages').select('id').eq('community_id', communityId).eq('type', 'blog')).data?.map((r: any) => r.id) as any)
        .order('created_at', { ascending: false })
      for (const r of (bRows || []) as any[]) {
        if (!pageLatestMap[r.page_id]) pageLatestMap[r.page_id] = r.created_at
      }
    }

    // Feed page map
    const feedPageIds = (feedPageIdsParam || '').split(',').map(s => s.trim()).filter(Boolean)
    if (feedPageIds.length > 0) {
      const { data: fRows } = await supabase
        .from('posts')
        .select('page_id, created_at')
        .in('page_id', feedPageIds as any)
        .order('created_at', { ascending: false })
      for (const r of (fRows || []) as any[]) {
        if (!feedPageLatestMap[r.page_id]) feedPageLatestMap[r.page_id] = r.created_at
      }
    }

    const payload = {
      feedLatestAt: (feedRows && feedRows[0]?.created_at) || null,
      pageLatestMap,
      feedPageLatestMap,
    }

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        // 1분 캐시로 충분. 새 글이 자주 올라오지 않는 것을 감안해 최소 트래픽 유지
        'Cache-Control': 'public, max-age=60, s-maxage=60',
      },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'failed to load new flags' }), { status: 500 })
  }
}


