import { NextRequest } from 'next/server'
import { createServerClientWithAuth } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const pageId = searchParams.get('pageId')
  if (!pageId) return new Response(JSON.stringify({ error: 'pageId is required' }), { status: 400 })

  const authHeader = req.headers.get('authorization') || ''
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined
  const supabase = await createServerClientWithAuth(bearer)

  try {
    // 페이지 → 커뮤니티 식별 및 멤버십 체크(1회)
    const { data: page } = await supabase.from('community_pages').select('id, community_id').eq('id', pageId).maybeSingle()
    const communityId = (page as any)?.community_id as string | undefined
    if (!communityId) return new Response(JSON.stringify({ error: 'not found' }), { status: 404 })

    const { data: { user } } = await supabase.auth.getUser()
    const authUserId = user?.id
    if (!authUserId) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
    const superId = process.env.SUPER_ADMIN_USER_ID
    const isSuper = !!superId && superId === authUserId
    let community: any = null
    let isOwner = false
    let member: any = null
    if (!isSuper) {
      const res = await Promise.all([
        supabase.from('communities').select('owner_id, slug').eq('id', communityId).single(),
        supabase.from('community_members').select('role').eq('community_id', communityId).eq('user_id', authUserId).maybeSingle(),
      ])
      community = res[0].data
      member = res[1].data
      isOwner = community && (community as any).owner_id === authUserId
      const isMember = member && (member as any).role && (member as any).role !== 'pending'
      if (!isOwner && !isMember) return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 })
    } else {
      // super admin은 커뮤니티 정보를 admin client로 조회
      const admin = createAdminClient()
      const { data: comm } = await admin.from('communities').select('owner_id, slug').eq('id', communityId).single()
      community = comm
      isOwner = true
    }

    const canUseAdmin = !!process.env.SUPABASE_SERVICE_ROLE_KEY
    const db = isSuper && canUseAdmin ? createAdminClient() : supabase
    const [{ data: settingsRow }, { data: posts }] = await Promise.all([
      db.from('community_settings').select('brand_color').eq('community_id', communityId).maybeSingle(),
      db
        .from('community_page_blog_posts')
        .select('id,title,content,thumbnail_url,created_at,user_id,views,pinned')
        .eq('page_id', pageId)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false }),
    ])

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

    // 카운트(좋아요/댓글): 단건 집계 쿼리 2회 (간단 캐시)
    let likeCounts: Record<string, number> = {}
    let commentCounts: Record<string, number> = {}
    if (postIds.length > 0) {
      const [likesRes, commentsRes] = await Promise.all([
        db.from('community_page_blog_likes').select('post_id').in('post_id', postIds as any),
        db.from('community_page_blog_comments').select('post_id').in('post_id', postIds as any),
      ])
      for (const r of (likesRes.data || []) as any[]) likeCounts[r.post_id] = (likeCounts[r.post_id] || 0) + 1
      for (const r of (commentsRes.data || []) as any[]) commentCounts[r.post_id] = (commentCounts[r.post_id] || 0) + 1
    }

    const toPlain = (html: string): string => {
      try {
        const el = globalThis?.document ? document.createElement('div') : (null as any)
        if (el) { el.innerHTML = html || ''; return (el.textContent || el.innerText || '').replace(/\s+/g, ' ').trim() }
      } catch {}
      return (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    }

    const payload = {
      posts: list.map(p => ({
        id: p.id,
        title: p.title,
        thumbnail_url: p.thumbnail_url,
        created_at: p.created_at,
        user_id: p.user_id,
        pinned: !!p.pinned,
        counts: {
          views: p.views ?? 0,
          likes: likeCounts[p.id] || 0,
          comments: commentCounts[p.id] || 0,
        },
        author: p.user_id ? profileMap[p.user_id] || null : null,
        excerpt: toPlain(p.content || '').slice(0, 180),
      })),
      slug: (community as any)?.slug || null,
      isOwner,
      brandColor: (settingsRow as any)?.brand_color || null,
    }

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        // 30초 캐시: 서버/클라 모두 잦은 중복요청을 줄이면서, 새 상호작용(좋아요/댓글)도 빠르게 반영
        'Cache-Control': 'public, max-age=30, s-maxage=30',
      },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'failed to load blog overview' }), { status: 500 })
  }
}


