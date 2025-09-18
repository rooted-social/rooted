import { NextRequest } from 'next/server'
import { createServerClient, createServerClientWithAuth } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const communityId = searchParams.get('communityId')
  if (!communityId) {
    return new Response(JSON.stringify({ error: 'communityId is required' }), { status: 400 })
  }

  const authHeader = req.headers.get('authorization') || ''
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined
  const supabase = createServerClientWithAuth(bearer)

  try {
    // 멤버십 체크: 쿠키 또는 Authorization 헤더 기반 사용자
    const { data: { user } } = await supabase.auth.getUser()
    const authUserId = user?.id
    if (!authUserId) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
    const [{ data: community }, { data: member }] = await Promise.all([
      supabase.from('communities').select('owner_id').eq('id', communityId).single(),
      supabase.from('community_members').select('role').eq('community_id', communityId).eq('user_id', authUserId).maybeSingle(),
    ])
    const isOwner = community && (community as any).owner_id === authUserId
    const isMember = member && (member as any).role && (member as any).role !== 'pending'
    if (!isOwner && !isMember) {
      return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 })
    }

    const [settingsRes, noticesRes] = await Promise.all([
      supabase.from('community_settings').select('*').eq('community_id', communityId).maybeSingle(),
      supabase.from('notices').select('*').eq('community_id', communityId).order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(10),
    ])
    // canManage: 소유자 또는 admin 권한
    const canManage = !!isOwner || ((member as any)?.role === 'admin')

    // 다가오는 이벤트 5개
    const nowIso = new Date().toISOString()
    const { data: eventsRows } = await supabase
      .from('community_events')
      .select('id, title, start_at')
      .eq('community_id', communityId)
      .gt('start_at', nowIso)
      .order('start_at', { ascending: true })
      .limit(5)

    // 최근 활동(상위 5개) 집계
    let recent: any[] = []
    try {
      // feed
      const { data: feed } = await supabase
        .from('posts')
        .select('id,title,created_at,page_id')
        .eq('community_id', communityId)
        .order('created_at', { ascending: false })
        .limit(10)
      let pageNameMap: Record<string, string> = {}
      try {
        const pageIds = Array.from(new Set(((feed || []).map((p: any) => p.page_id).filter(Boolean))))
        if (pageIds.length > 0) {
          const { data: pages } = await supabase.from('community_pages').select('id,title').in('id', pageIds as any)
          pageNameMap = Object.fromEntries(((pages || []) as any[]).map((p: any) => [p.id, p.title]))
        }
      } catch {}
      const feedItems = (feed || []).map((p: any) => ({ id: p.id, kind: 'feed', title: p.title, created_at: p.created_at, meta: p.page_id ? `피드 · ${pageNameMap[p.page_id] || ''}` : '피드' }))

      // blog
      let blog: any[] = []
      try {
        const { data: blogPages } = await supabase.from('community_pages').select('id,title').eq('community_id', communityId).eq('type', 'blog')
        const ids = (blogPages || []).map((p: any) => p.id)
        if (ids.length > 0) {
          const { data: posts } = await supabase.from('community_page_blog_posts').select('id,title,created_at,page_id').in('page_id', ids as any).order('created_at', { ascending: false }).limit(10)
          const blogPageMap = Object.fromEntries(((blogPages || []) as any[]).map((p: any) => [p.id, p.title]))
          blog = (posts || []).map((b: any) => ({ id: b.id, kind: 'blog', title: b.title, created_at: b.created_at, meta: `블로그 · ${blogPageMap[b.page_id] || ''}` }))
        }
      } catch {}

      // note
      let note: any[] = []
      try {
        const { data: notePages } = await supabase.from('community_pages').select('id,title').eq('community_id', communityId).eq('type', 'notes')
        const ids = (notePages || []).map((p: any) => p.id)
        if (ids.length > 0) {
          const { data: notes } = await supabase.from('community_page_note_items').select('id,title,created_at,page_id').in('page_id', ids as any).order('created_at', { ascending: false }).limit(10)
          const notePageMap = Object.fromEntries(((notePages || []) as any[]).map((p: any) => [p.id, p.title]))
          note = (notes || []).map((n: any) => ({ id: n.id, kind: 'note', title: n.title, created_at: n.created_at, meta: `노트 · ${notePageMap[n.page_id] || ''}` }))
        }
      } catch {}

      // event / class
      const { data: events } = await supabase.from('community_events').select('id,title,start_at,created_at').eq('community_id', communityId).order('created_at', { ascending: false }).limit(10)
      const evt = (events || []).map((e: any) => ({ id: e.id, kind: 'event', title: `새로운 이벤트가 추가되었습니다 · ${e.title}`, created_at: e.created_at, meta: '이벤트' }))
      const { data: classes } = await supabase.from('classes').select('id,title,created_at').eq('community_id', communityId).order('created_at', { ascending: false }).limit(10)
      const cls = (classes || []).map((c: any) => ({ id: c.id, kind: 'class', title: `새로운 클래스가 등록되었습니다 · ${c.title}`, created_at: c.created_at }))

      recent = [...feedItems, ...blog, ...note, ...evt, ...cls]
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5)
    } catch {}

    const payload = {
      settings: settingsRes.data || null,
      notices: Array.isArray(noticesRes.data) ? noticesRes.data : [],
      canManage,
      upcomingEvents: Array.isArray(eventsRows) ? eventsRows : [],
      recentActivity: recent,
    }
    return new Response(JSON.stringify(payload), { 
      status: 200, 
      headers: { 
        'content-type': 'application/json',
        // 60초 캐시 (브라우저/에지)
        'Cache-Control': 'public, max-age=60, s-maxage=60',
      } 
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'failed to load home data' }), { status: 500 })
  }
}



