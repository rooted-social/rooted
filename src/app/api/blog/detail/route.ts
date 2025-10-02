import { NextRequest } from 'next/server'
import { createServerClientWithAuth } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return new Response(JSON.stringify({ error: 'id is required' }), { status: 400 })

  const authHeader = req.headers.get('authorization') || ''
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined
  const supabase = await createServerClientWithAuth(bearer)

  try {
    // 포스트 + 페이지/커뮤니티 식별
    const { data: postRow } = await supabase
      .from('community_page_blog_posts')
      .select('id,title,content,thumbnail_url,page_id,created_at,user_id,views')
      .eq('id', id)
      .maybeSingle()
    if (!postRow) return new Response(JSON.stringify({ error: 'not found' }), { status: 404 })

    const { data: page } = await supabase
      .from('community_pages')
      .select('community_id')
      .eq('id', (postRow as any).page_id)
      .maybeSingle()
    const communityId = (page as any)?.community_id as string | undefined
    if (!communityId) return new Response(JSON.stringify({ error: 'not found' }), { status: 404 })

    // 인증/멤버십 체크
    const { data: { user } } = await supabase.auth.getUser()
    const authUserId = user?.id
    if (!authUserId) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
    const [{ data: community }, { data: member }] = await Promise.all([
      supabase.from('communities').select('owner_id').eq('id', communityId).single(),
      supabase.from('community_members').select('role').eq('community_id', communityId).eq('user_id', authUserId).maybeSingle(),
    ])
    const isOwner = community && (community as any).owner_id === authUserId
    const isMember = member && (member as any).role && (member as any).role !== 'pending'
    if (!isOwner && !isMember) return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 })

    // 작성자
    let author: any = null
    if ((postRow as any).user_id) {
      const { data: authorRow } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url, updated_at')
        .eq('id', (postRow as any).user_id)
        .maybeSingle()
      author = authorRow || null
    }

    // 브랜드 컬러
    const { data: settings } = await supabase
      .from('community_settings')
      .select('brand_color')
      .eq('community_id', communityId)
      .maybeSingle()

    // 좋아요/댓글 카운트 및 liked 여부, 댓글 목록
    const [likesCountRes, likedRes, commentsListRes] = await Promise.all([
      supabase.from('community_page_blog_likes').select('*', { count: 'exact', head: true }).eq('post_id', id),
      supabase.from('community_page_blog_likes').select('id').eq('post_id', id).eq('user_id', authUserId).maybeSingle(),
      supabase.from('community_page_blog_comments').select('id, post_id, user_id, content, created_at').eq('post_id', id).order('created_at', { ascending: true }),
    ])

    const likeCount = likesCountRes.count || 0
    const cRows = (commentsListRes.data || []) as any[]
    const commentCount = cRows.length
    const cUserIds = Array.from(new Set(cRows.map(r => r.user_id)))
    let cProfileMap: Record<string, any> = {}
    if (cUserIds.length > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .in('id', cUserIds as any)
      cProfileMap = Object.fromEntries((profs || []).map((p: any) => [p.id, p]))
    }
    const comments = cRows.map(r => ({ ...r, author: cProfileMap[r.user_id] || null }))

    const payload = {
      post: { ...(postRow as any), author },
      counts: { views: (postRow as any)?.views || 0, likes: likeCount, comments: commentCount },
      liked: !!likedRes.data,
      comments,
      isOwner,
      brandColor: (settings as any)?.brand_color || null,
    }

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'Cache-Control': 'no-store',
      },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'failed to load blog detail' }), { status: 500 })
  }
}


