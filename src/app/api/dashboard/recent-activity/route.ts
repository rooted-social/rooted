import { NextRequest } from 'next/server'
import { createServerClient, createServerClientWithAuth } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { resolveUserId } from '@/lib/auth/user'
import { getCommunityAccess } from '@/lib/community/access'

// 최근 활동 API 스켈레톤
// 반환 형태는 클라이언트의 RecentActivityCard 사용 형태에 맞춤
// kind: 'feed'|'blog'|'note'|'event'|'class'
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const communityId = searchParams.get('communityId')
  const slug = searchParams.get('slug') || undefined
  if (!communityId) {
    return new Response(JSON.stringify({ error: 'communityId is required' }), { status: 400 })
  }

  const authHeader = req.headers.get('authorization') || ''
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined
  const supabase = await createServerClientWithAuth(bearer)

  try {
    // 중앙화 사용자/권한 확인
    const authUserId = await resolveUserId(req)
    if (!authUserId) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
    const superId = process.env.SUPER_ADMIN_USER_ID
    const isSuper = !!superId && superId === authUserId
    const access = await getCommunityAccess(supabase, communityId, authUserId, { superAdmin: isSuper })
    if (!access.isOwner && !access.isMember) {
      return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 })
    }

    // feed 최근 글 (필요 필드만 선택)
    const canUseAdmin = !!process.env.SUPABASE_SERVICE_ROLE_KEY
    const db = isSuper && canUseAdmin ? createAdminClient() : supabase
    const { data: feed } = await db
      .from('posts')
      .select('id,title,created_at,page_id')
      .eq('community_id', communityId)
      .order('created_at', { ascending: false })
      .limit(10)

    // page 이름 맵 (feed용)
    let pageNameMap: Record<string, string> = {}
    try {
      const pageIds = Array.from(new Set(((feed || []).map((p: any) => p.page_id).filter(Boolean))))
      if (pageIds.length > 0) {
        const { data: pages } = await db
          .from('community_pages')
          .select('id,title')
          .in('id', pageIds as any)
        pageNameMap = Object.fromEntries(((pages || []) as any[]).map((p: any) => [p.id, p.title]))
      }
    } catch {}

    // blog 최근 항목
    let blog: any[] = []
    try {
      const { data: blogPages } = await db
        .from('community_pages')
        .select('id,title')
        .eq('community_id', communityId)
        .eq('type', 'blog')
      const ids = (blogPages || []).map((p: any) => p.id)
      if (ids.length > 0) {
        const { data: posts } = await db
          .from('community_page_blog_posts')
          .select('id,title,created_at,page_id')
          .in('page_id', ids as any)
          .order('created_at', { ascending: false })
          .limit(10)
        const blogPageMap = Object.fromEntries(((blogPages || []) as any[]).map((p: any) => [p.id, p.title]))
        blog = (posts || []).map((b: any) => ({ id: b.id, kind: 'blog', title: b.title, created_at: b.created_at, href: slug ? `/${slug}/blog/${b.id}?pageId=${b.page_id}` : undefined, meta: `블로그 · ${blogPageMap[b.page_id] || ''}` }))
      }
    } catch {}

    // note 최근 항목
    let note: any[] = []
    try {
      const { data: notePages } = await db
        .from('community_pages')
        .select('id,title')
        .eq('community_id', communityId)
        .eq('type', 'notes')
      const ids = (notePages || []).map((p: any) => p.id)
      if (ids.length > 0) {
        const { data: notes } = await db
          .from('community_page_note_items')
          .select('id,title,created_at,page_id')
          .in('page_id', ids as any)
          .order('created_at', { ascending: false })
          .limit(10)
        const notePageMap = Object.fromEntries(((notePages || []) as any[]).map((p: any) => [p.id, p.title]))
        note = (notes || []).map((n: any) => ({ id: n.id, kind: 'note', title: n.title, created_at: n.created_at, href: undefined, meta: `노트 · ${notePageMap[n.page_id] || ''}` }))
      }
    } catch {}

    // event / class
    const { data: events } = await db
      .from('community_events')
      .select('id,title,start_at,created_at')
      .eq('community_id', communityId)
      .order('created_at', { ascending: false })
      .limit(10)
    const evt = (events || []).map((e: any) => ({ id: e.id, kind: 'event', title: `새로운 이벤트가 추가되었습니다 · ${e.title}`, created_at: e.created_at, href: slug ? `/${slug}/dashboard?tab=calendar` : undefined, meta: '이벤트' }))

    const { data: classes } = await db
      .from('classes')
      .select('id,title,created_at')
      .eq('community_id', communityId)
      .order('created_at', { ascending: false })
      .limit(10)
    const cls = (classes || []).map((c: any) => ({ id: c.id, kind: 'class', title: `새로운 클래스가 등록되었습니다 · ${c.title}`, created_at: c.created_at, href: slug ? `/${slug}/classes/${c.id}` : undefined }))

    const feedItems = (feed || []).map((p: any) => ({ id: p.id, kind: 'feed', title: p.title, created_at: p.created_at, href: slug ? `/${slug}/dashboard?tab=home${p.page_id ? `&pageId=${p.page_id}` : ''}` : undefined, meta: p.page_id ? `피드 · ${pageNameMap[p.page_id] || ''}` : '피드' }))

    const merged = [...feedItems, ...blog, ...note, ...evt, ...cls]
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)

    return new Response(JSON.stringify(merged), { status: 200, headers: { 'content-type': 'application/json', 'Cache-Control': 'public, max-age=120, s-maxage=120' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'failed to load recent activity' }), { status: 500 })
  }
}


