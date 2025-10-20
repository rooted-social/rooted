import { NextRequest } from 'next/server'
import { createServerClientWithAuth } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { resolveUserId } from '@/lib/auth/user'
import { getCommunityAccess } from '@/lib/community/access'

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

    // 중앙화 사용자 식별/권한
    const authUserId = await resolveUserId(req)
    if (!authUserId) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
    const superId = process.env.SUPER_ADMIN_USER_ID
    const isSuper = !!superId && superId === authUserId
    const access = await getCommunityAccess(supabase, communityId, authUserId, { superAdmin: isSuper })
    if (!isSuper && !access.isOwner && !access.isMember) return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 })

    // 작성자
    let author: any = null
    const canUseAdmin = !!process.env.SUPABASE_SERVICE_ROLE_KEY
    const db = isSuper && canUseAdmin ? createAdminClient() : supabase
    if ((postRow as any).user_id) {
      const { data: authorRow } = await db
        .from('profiles')
        .select('id, full_name, username, avatar_url, updated_at')
        .eq('id', (postRow as any).user_id)
        .maybeSingle()
      author = authorRow || null
    }

    // 브랜드 컬러
    const { data: settings } = await db
      .from('community_settings')
      .select('brand_color')
      .eq('community_id', communityId)
      .maybeSingle()

    // 좋아요/댓글 카운트 및 liked 여부, 댓글 목록
    const [likesCountRes, likedRes, commentsListRes] = await Promise.all([
      db.from('community_page_blog_likes').select('*', { count: 'exact', head: true }).eq('post_id', id),
      db.from('community_page_blog_likes').select('id').eq('post_id', id).eq('user_id', authUserId).maybeSingle(),
      db.from('community_page_blog_comments').select('id, post_id, user_id, content, created_at').eq('post_id', id).order('created_at', { ascending: true }),
    ])

    const likeCount = likesCountRes.count || 0
    const cRows = (commentsListRes.data || []) as any[]
    const commentCount = cRows.length
    const cUserIds = Array.from(new Set(cRows.map(r => r.user_id)))
    let cProfileMap: Record<string, any> = {}
    if (cUserIds.length > 0) {
      const { data: profs } = await db
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
      isOwner: access.isOwner || isSuper,
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


