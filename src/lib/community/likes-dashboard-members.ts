import { supabase, getUserId } from '@/lib/supabase'
import { getProfilesCached } from '@/lib/community-utils'

// 좋아요
export async function toggleLike(postId: string) {
  const uid = await getUserId()
  if (!uid) throw new Error('로그인이 필요합니다.')
  const { data: existing } = await supabase
    .from('post_likes')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', uid)
    .maybeSingle()
  if (existing) {
    await supabase.from('post_likes').delete().eq('id', existing.id)
    return { liked: false }
  }
  await supabase.from('post_likes').insert({ post_id: postId, user_id: uid })
  return { liked: true }
}

export async function getLikeCount(postId: string) {
  try {
    const { count, error } = await supabase
      .from('post_likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId)
    if (error) throw error
    return count || 0
  } catch {
    return 0
  }
}

export async function hasLiked(postId: string) {
  const uid = await getUserId()
  if (!uid) return false
  try {
    const { data } = await supabase
      .from('post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', uid)
      .maybeSingle()
    return !!data
  } catch {
    return false
  }
}

export async function getHasLikedMap(postIds: string[]): Promise<Record<string, boolean>> {
  const uid = await getUserId()
  if (!uid || postIds.length === 0) return {}
  try {
    const { data, error } = await supabase
      .from('post_likes')
      .select('post_id')
      .in('post_id', postIds)
      .eq('user_id', uid)
    if (error) return {}
    const set = new Set((data || []).map((r: any) => r.post_id))
    return Object.fromEntries(postIds.map(id => [id, set.has(id)]))
  } catch {
    return {}
  }
}

// 대시보드 통계
export async function getDashboardStats(communityId: string) {
  try {
    const [{ count: memberCount }, { count: postCount }, { count: classCount }, eventsRaw] = await Promise.all([
      supabase.from('community_members').select('*', { count: 'exact', head: true }).eq('community_id', communityId).or('role.is.null,role.neq.pending'),
      supabase.from('posts').select('*', { count: 'exact', head: true }).eq('community_id', communityId),
      supabase.from('classes').select('*', { count: 'exact', head: true }).eq('community_id', communityId),
      supabase.from('community_events').select('id,start_at').eq('community_id', communityId),
    ])

    let commentCount = 0
    const { data: posts } = await supabase
      .from('posts')
      .select('id')
      .eq('community_id', communityId)
    const postIds = (posts || []).map(p => p.id)
    if (postIds.length > 0) {
      const { count } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .in('post_id', postIds)
      commentCount = count || 0
    }

    let blogCount = 0
    try {
      const { data: blogPages } = await supabase
        .from('community_pages')
        .select('id')
        .eq('community_id', communityId)
        .eq('type', 'blog')
      const ids = (blogPages || []).map((p: any) => p.id)
      if (ids.length > 0) {
        const { count } = await supabase
          .from('community_page_blog_posts')
          .select('*', { count: 'exact', head: true })
          .in('page_id', ids)
        blogCount = count || 0
      }
    } catch {}

    return {
      memberCount: memberCount || 0,
      postCount: postCount || 0,
      commentCount,
      classCount: classCount || 0,
      blogCount,
      upcomingEventCount: Array.isArray(eventsRaw?.data) ? (eventsRaw.data as any[]).filter(e => new Date(e.start_at) > new Date()).length : 0,
    }
  } catch {
    return { memberCount: 0, postCount: 0, commentCount: 0, classCount: 0, blogCount: 0, upcomingEventCount: 0 }
  }
}

// 멤버
export async function getCommunityMembers(communityId: string) {
  try {
    const { data: rows, error } = await supabase
      .from('community_members')
      .select('user_id, role, joined_at')
      .eq('community_id', communityId)
      .or('role.is.null,role.neq.pending')
    if (error) throw error
    const userIds = Array.from(new Set((rows || []).map((r: any) => r.user_id)))
    const profilesMap = userIds.length > 0 ? await getProfilesCached(userIds) : {}
    const { data: comm } = await supabase.from('communities').select('owner_id').eq('id', communityId).single()
    const ownerId = (comm as any)?.owner_id || null
    const profileMap = profilesMap as Record<string, any>
    return (rows || []).map((r: any) => ({
      user_id: r.user_id,
      role: r.role,
      is_owner: ownerId && r.user_id === ownerId,
      profile: profileMap[r.user_id],
    }))
  } catch {
    return []
  }
}

export async function getPendingCommunityMembers(communityId: string) {
  try {
    let pending: any[] = []
    let { data, error } = await supabase
      .from('community_members')
      .select('user_id, role')
      .eq('community_id', communityId)
      .eq('role', 'pending')
    if (error) pending = []
    else pending = data || []
    const userIds = Array.from(new Set(pending.map((r: any) => r.user_id)))
    const profileMap = userIds.length > 0 ? await getProfilesCached(userIds) : {}
    return pending.map((r: any) => ({ user_id: r.user_id, profile: profileMap[r.user_id] }))
  } catch {
    return []
  }
}

// 통합 멤버 오버뷰: 서버 API를 통해 members + pending + isOwner를 한 번에 가져오기
import { getAuthToken } from '@/lib/supabase'
export async function getMembersOverview(communityId: string, opts?: { force?: boolean }) {
  const key = `members:${communityId}`
  const now = Date.now()
  ;(globalThis as any).__membersCache = (globalThis as any).__membersCache || new Map<string, { ts: number; data: any }>()
  const cache: Map<string, { ts: number; data: any }> = (globalThis as any).__membersCache
  if (!opts?.force) {
    const cached = cache.get(key)
    if (cached && now - cached.ts < 30_000) return cached.data
  }
  try {
    const token = await getAuthToken().catch(() => null)
    const res = await fetch(`/api/members/overview?communityId=${encodeURIComponent(communityId)}`, { headers: token ? { authorization: `Bearer ${token}` } : undefined })
    if (!res.ok) return { members: [] as any[], pending: [] as any[], isOwner: false }
    const data = await res.json()
    const payload = { members: data?.members || [], pending: data?.pending || [], isOwner: !!data?.isOwner }
    cache.set(key, { ts: now, data: payload })
    return payload
  } catch {
    return { members: [] as any[], pending: [] as any[], isOwner: false }
  }
}

export async function removeCommunityMember(communityId: string, userId: string) {
  try {
    const { error: rpcError } = await supabase.rpc('remove_member', {
      p_community_id: communityId,
      p_target_user_id: userId,
    })
    if (rpcError) throw rpcError
    return true
  } catch (e) {
    throw e
  }
}


