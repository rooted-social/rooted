import { supabase, getUserId } from './supabase'
import { getProfilesCached } from './community-utils'
import { Community, Post, Comment, Notice, CommunitySettings, BoardCategory, CommunityService, PostLike, CommunityPage, CommunityPageGroup } from '@/types/community'
// 인메모리 캐시 (간단, 프로세스 생존 동안만 유지)
const cache60 = new Map<string, { ts: number; data: any }>()

export interface CreateCommunityData {
  name: string
  description: string
  slug: string
  category: string
  image_url?: string
}

export interface CommunityFilters {
  search?: string
  category?: string
  includePrivate?: boolean
}

// 커뮤니티 목록 조회 (검색 및 필터링 포함)
export async function getCommunities(filters: CommunityFilters = {}) {
  try {
    // 1차: 공개 필터 포함 시도
    let query = supabase
      .from('communities')
      .select('*')
      .order('created_at', { ascending: false })

    if (!filters.includePrivate) {
      query = query.eq('is_public', true as any)
    }

    // 검색 필터 적용
    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
    }

    // 카테고리 필터 적용
    if (filters.category && filters.category !== '전체') {
      query = query.eq('category', filters.category)
    }

    let { data, error } = await query

    // 2차 폴백: is_public 컬럼이 없는 환경(구 스키마)에서는 필터 없이 재조회
    if (error) {
      const msg = (error as any)?.message?.toLowerCase?.() || ''
      if (msg.includes('is_public') || msg.includes('column')) {
        const retry = await supabase
          .from('communities')
          .select('*')
          .order('created_at', { ascending: false })
        if (retry.error) {
          console.error('커뮤니티 조회 오류:', retry.error)
          throw retry.error
        }
        data = retry.data
      } else {
        console.error('커뮤니티 조회 오류:', error)
        throw error
      }
    }

    return data as Community[]
  } catch (error) {
    console.error('getCommunities 오류:', error)
    throw error
  }
}

// 특정 커뮤니티 조회 (소유자 정보 포함)
export async function getCommunity(slug: string) {
  try {
    // 먼저 커뮤니티 기본 정보 조회
    const { data: communityData, error: communityError } = await supabase
      .from('communities')
      .select('*')
      .eq('slug', slug)
      .single()

    if (communityError) {
      console.error('커뮤니티 조회 오류:', communityError)
      throw communityError
    }

    // 소유자 프로필 정보 별도 조회
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, full_name, bio, avatar_url')
      .eq('id', communityData.owner_id)
      .single()

    if (profileError) {
      console.error('프로필 조회 오류:', profileError)
      // 프로필 정보가 없어도 커뮤니티는 표시하도록 기본값 설정
      return {
        ...communityData,
        profiles: {
          id: communityData.owner_id,
          username: '알 수 없음',
          full_name: '알 수 없음',
          bio: '',
          avatar_url: null
        }
      }
    }

    return {
      ...communityData,
      profiles: profileData
    }
  } catch (error) {
    console.error('getCommunity 오류:', error)
    throw error
  }
}

// 커뮤니티 생성
export async function createCommunity(communityData: CreateCommunityData) {
  try {
    const uid = await getUserId()
    if (!uid) throw new Error('로그인이 필요합니다.')

    // slug 중복 확인
    const { data: existingCommunity } = await supabase
      .from('communities')
      .select('id')
      .eq('slug', communityData.slug)
      .single()

    if (existingCommunity) {
      throw new Error('이미 사용 중인 URL입니다.')
    }

    // 커뮤니티 생성
    const { data, error } = await supabase
      .from('communities')
      .insert({
        ...communityData,
        owner_id: uid
      })
      .select()
      .single()

    if (error) {
      console.error('커뮤니티 생성 오류:', error)
      throw error
    }

    return data as Community
  } catch (error) {
    console.error('createCommunity 오류:', error)
    throw error
  }
}

// 커뮤니티 수정
export async function updateCommunity(id: string, updates: Partial<CreateCommunityData>) {
  try {
    const { data, error } = await supabase
      .from('communities')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('커뮤니티 수정 오류:', error)
      throw error
    }

    return data as Community
  } catch (error) {
    console.error('updateCommunity 오류:', error)
    throw error
  }
}

// 커뮤니티 삭제
export async function deleteCommunity(id: string) {
  try {
    const { error } = await supabase
      .from('communities')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('커뮤니티 삭제 오류:', error)
      throw error
    }

    return true
  } catch (error) {
    console.error('deleteCommunity 오류:', error)
    throw error
  }
}

// 커뮤니티 가입
export async function joinCommunity(communityId: string) {
  try {
    const uid = await getUserId()
    if (!uid) throw new Error('로그인이 필요합니다.')

    // 이미 가입했는지 확인
    const { data: existingMember } = await supabase
      .from('community_members')
      .select('id')
      .eq('community_id', communityId)
      .eq('user_id', uid)
      .single()

    if (existingMember) {
      throw new Error('이미 가입한 커뮤니티입니다.')
    }

    // 가입 정책 확인: communities.join_policy ('free'|'approval'), is_public 여부
    const { data: comm } = await supabase.from('communities').select('join_policy').eq('id', communityId).single()
    const policy = (comm as any)?.join_policy || 'free'
    const role = policy === 'approval' ? 'pending' : 'member'

    const { data, error } = await supabase
      .from('community_members')
      .insert({ community_id: communityId, user_id: uid, role })
      .select()
      .single()

    if (error) {
      console.error('커뮤니티 가입 오류:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('joinCommunity 오류:', error)
    throw error
  }
}

// 커뮤니티 탈퇴
export async function leaveCommunity(communityId: string) {
  try {
    const uid = await getUserId()
    if (!uid) throw new Error('로그인이 필요합니다.')

    const { error } = await supabase
      .from('community_members')
      .delete()
      .eq('community_id', communityId)
      .eq('user_id', uid)

    if (error) {
      console.error('커뮤니티 탈퇴 오류:', error)
      throw error
    }

    return true
  } catch (error) {
    console.error('leaveCommunity 오류:', error)
    throw error
  }
}

// 사용자가 가입한 커뮤니티 목록 조회
export async function getUserCommunities(userId?: string) {
  try {
    let uid = userId
    if (!uid) {
      uid = await getUserId() || undefined as any
      if (!uid) throw new Error('로그인이 필요합니다.')
    }

    if (!uid) {
      throw new Error('로그인이 필요합니다.')
    }

    const { data, error } = await supabase
      .from('community_members')
      .select(`
        *,
        communities (*)
      `)
      .eq('user_id', uid as string)
      .or('role.is.null,role.neq.pending')

    if (error) {
      console.error('사용자 커뮤니티 조회 오류:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('getUserCommunities 오류:', error)
    throw error
  }
}

// 내가 소유한 커뮤니티 목록 조회
export async function getOwnedCommunities() {
  try {
    const uid = await getUserId()
    if (!uid) throw new Error('로그인이 필요합니다.')
    const { data, error } = await supabase
      .from('communities')
      .select('*')
      .eq('owner_id', uid)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data || []) as Community[]
  } catch {
    return [] as Community[]
  }
}

// 게시판: 게시글 CRUD
export async function getPosts(communityId: string, opts?: { pageId?: string | null }) {
  try {
    // 1차 시도: page_id 필터를 적용(옵션이 제공된 경우)
    const buildQuery = (withPageFilter: boolean) => {
      let q = supabase
        .from('posts')
        .select('*')
        .eq('community_id', communityId)
        .order('created_at', { ascending: false })
      if (withPageFilter && opts?.pageId !== undefined) {
        if (opts.pageId === null) q = q.is('page_id', null)
        else q = q.eq('page_id', opts.pageId)
      }
      return q
    }

    let posts: any[] | null = null
    let { data, error } = await buildQuery(true)

    // page_id 컬럼이 없는 구(舊) 스키마에서는 400 에러가 발생할 수 있으므로 필터 없이 재시도
    if (error) {
      const msg = (error as any)?.message?.toLowerCase?.() || ''
      const details = (error as any)?.details?.toLowerCase?.() || ''
      const causedByPageId = msg.includes('page_id') || details.includes('page_id')
      if (causedByPageId) {
        const retry = await buildQuery(false)
        const retryRes = await retry
        if (retryRes.error) throw retryRes.error
        posts = retryRes.data as any[]
      } else {
        throw error
      }
    } else {
      posts = data as any[]
    }

    // 프로필 조인: FK가 profiles.id를 가리키지 않는 환경을 고려하여 별도 조회 후 병합
    const userIds = Array.from(new Set((posts || []).map(p => p.user_id)))
    const profileMap = userIds.length > 0 ? await getProfilesCached(userIds) : {}

    const merged = (posts || []).map((p: any) => ({ ...p, author: profileMap[p.user_id] })) as Post[]
    return merged
  } catch (error: any) {
    return []
  }
}

// 조회수 증가
export async function incrementPostViews(postId: string) {
  // 원자적 증가를 위해 DB 함수 호출을 우선 시도
  try {
    const { data, error } = await supabase.rpc('increment_post_views', { pid: postId })
    if (error) throw error
    return data as number | null
  } catch {
    // 폴백: 원자성은 보장되지 않지만 최소한 증가 시도
    try {
      const { data, error } = await supabase
        .from('posts')
        .update({ views: (null as any) })
        .eq('id', postId)
        .select('views')
        .single()
      if (error) throw error
      return (data as any)?.views ?? null
    } catch {
      return null
    }
  }
}

export async function createPost(payload: Omit<Post, 'id' | 'created_at' | 'updated_at' | 'comment_count' | 'author' | 'user_id'>) {
  const uid = await getUserId()
  if (!uid) throw new Error('로그인이 필요합니다.')
  // 1차 시도: page_id 포함 삽입
  try {
    const { data, error } = await supabase
      .from('posts')
      .insert({ ...payload, user_id: uid })
      .select()
      .single()
    if (error) throw error
    return data as Post
  } catch (err: any) {
    // 2차 폴백: page_id 컬럼이 없는 구 스키마에서는 해당 필드를 제거하고 재시도
    const { page_id, ...rest } = (payload as any) || {}
    const { data, error } = await supabase
      .from('posts')
      .insert({ ...rest, user_id: uid })
      .select()
      .single()
    if (error) throw err || error
    return data as Post
  }
}

export async function updatePost(id: string, updates: Partial<Post>) {
  const { data, error } = await supabase
    .from('posts')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Post
}

export async function deletePost(id: string) {
  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', id)
  if (error) throw error
  return true
}

// 댓글 CRUD
export async function getComments(postId: string) {
  try {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
    if (error) throw error
    const comments = (data || []) as any[]
    const userIds = Array.from(new Set(comments.map(c => c.user_id)))
    let profileMap: Record<string, any> = {}
    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .in('id', userIds)
      profileMap = Object.fromEntries((profs || []).map((p: any) => [p.id, p]))
    }
    return comments.map((c: any) => ({
      id: c.id,
      post_id: c.post_id,
      user_id: c.user_id,
      content: c.content,
      created_at: c.created_at,
      updated_at: c.updated_at,
      author: profileMap[c.user_id]
    })) as Comment[]
  } catch {
    return []
  }
}

export async function createComment(payload: Omit<Comment, 'id' | 'created_at' | 'updated_at' | 'author' | 'user_id'>) {
  const uid = await getUserId()
  if (!uid) throw new Error('로그인이 필요합니다.')
  const { data, error } = await supabase
    .from('comments')
    .insert({ ...payload, user_id: uid })
    .select()
    .single()
  if (error) throw error
  return data as Comment
}

export async function updateComment(id: string, updates: Partial<Comment>) {
  const { data, error } = await supabase
    .from('comments')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Comment
}

export async function deleteComment(id: string) {
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', id)
  if (error) throw error
  return true
}

// 공지사항 CRUD
export async function getNotices(communityId: string) {
  const key = `notices:${communityId}`
  const now = Date.now()
  const cached = cache60.get(key)
  if (cached && now - cached.ts < 300_000) return cached.data as Notice[]
  try {
    const { data, error } = await supabase
      .from('notices')
      .select('*')
      .eq('community_id', communityId)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) throw error
    const res = (data as Notice[]) || []
    cache60.set(key, { ts: now, data: res })
    return res
  } catch {
    return []
  }
}

export async function createNotice(payload: Omit<Notice, 'id' | 'created_at'>) {
  const uid = await getUserId()
  if (!uid) throw new Error('로그인이 필요합니다.')
  const { data, error } = await supabase
    .from('notices')
    .insert({ ...payload, user_id: uid })
    .select()
    .single()
  if (error) throw error
  return data as Notice
}

export async function updateNotice(id: string, updates: Partial<Notice>) {
  const { data, error } = await supabase
    .from('notices')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Notice
}

export async function deleteNotice(id: string) {
  const { error } = await supabase
    .from('notices')
    .delete()
    .eq('id', id)
  if (error) throw error
  return true
}

// 커뮤니티 설정 CRUD
export async function getCommunitySettings(communityId: string) {
  const key = `settings:${communityId}`
  const now = Date.now()
  const cached = cache60.get(key)
  if (cached && now - cached.ts < 300_000) return (cached.data as CommunitySettings) || null
  try {
    const { data, error } = await supabase
      .from('community_settings')
      .select('*')
      .eq('community_id', communityId)
      .single()
    if (error && error.code !== 'PGRST116') throw error
    const res = (data as CommunitySettings) || null
    cache60.set(key, { ts: now, data: res })
    return res
  } catch {
    return null
  }
}

export async function upsertCommunitySettings(communityId: string, updates: Partial<CommunitySettings>) {
  const uid = await getUserId()
  if (!uid) throw new Error('로그인이 필요합니다.')
  const payload = { ...updates, community_id: communityId, updated_by: uid }
  const { data, error } = await supabase
    .from('community_settings')
    .upsert(payload, { onConflict: 'community_id' })
    .select()
    .single()
  if (error) throw error
  return data as CommunitySettings
}

// 카테고리 CRUD
export async function getCategories(communityId: string) {
  try {
    const { data, error } = await supabase
      .from('board_categories')
      .select('*')
      .eq('community_id', communityId)
      .order('position', { ascending: true })
    if (error) throw error
    return data as BoardCategory[]
  } catch {
    return []
  }
}

export async function createCategory(payload: Omit<BoardCategory, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('board_categories')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data as BoardCategory
}

export async function updateCategory(id: string, updates: Partial<BoardCategory>) {
  const { data, error } = await supabase
    .from('board_categories')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as BoardCategory
}

export async function deleteCategory(id: string) {
  const { error } = await supabase
    .from('board_categories')
    .delete()
    .eq('id', id)
  if (error) throw error
  return true
}

// 카테고리 정렬 저장
export async function saveCategoryOrder(communityId: string, orderedIds: string[]) {
  // 업데이트를 순차로 진행
  for (let i = 0; i < orderedIds.length; i++) {
    const id = orderedIds[i]
    const { error } = await supabase
      .from('board_categories')
      .update({ position: i })
      .eq('id', id)
      .eq('community_id', communityId)
    if (error) throw error
  }
  return true
}

// 서비스 CRUD
export async function getCommunityServices(communityId: string) {
  const key = `services:${communityId}`
  const now = Date.now()
  const cached = cache60.get(key)
  if (cached && now - cached.ts < 300_000) return cached.data as CommunityService[]
  try {
    const { data, error } = await supabase
      .from('community_services')
      .select('*')
      .eq('community_id', communityId)
      .order('created_at', { ascending: true })
    if (error) throw error
    const res = (data as CommunityService[]) || []
    cache60.set(key, { ts: now, data: res })
    return res
  } catch {
    return []
  }
}

export async function addCommunityService(communityId: string, label: string) {
  const { data, error } = await supabase
    .from('community_services')
    .insert({ community_id: communityId, label })
    .select()
    .single()
  if (error) throw error
  return data as CommunityService
}

export async function removeCommunityService(id: string) {
  const { error } = await supabase
    .from('community_services')
    .delete()
    .eq('id', id)
  if (error) throw error
  return true
}

// 좋아요 토글 및 카운트
export async function toggleLike(postId: string) {
  const uid = await getUserId()
  if (!uid) throw new Error('로그인이 필요합니다.')
  // 이미 좋아요 했는지 체크
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

// 여러 게시글에 대해 사용자의 좋아요 여부를 한 번에 조회
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

export async function getCommentCount(postId: string) {
  try {
    const { count, error } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId)
    if (error) throw error
    return count || 0
  } catch {
    return 0
  }
}

export async function getDashboardStats(communityId: string) {
  try {
    const [{ count: memberCount }, { count: postCount }, { count: classCount }, eventsRaw] = await Promise.all([
      supabase.from('community_members').select('*', { count: 'exact', head: true }).eq('community_id', communityId).or('role.is.null,role.neq.pending'),
      supabase.from('posts').select('*', { count: 'exact', head: true }).eq('community_id', communityId),
      supabase.from('classes').select('*', { count: 'exact', head: true }).eq('community_id', communityId),
      supabase.from('community_events').select('id,start_at').eq('community_id', communityId)
    ])

    // 댓글 수는 커뮤니티의 모든 post_id를 조회 후 count
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

    // 블로그 포스트 수 계산 (blog 타입 page -> blog_posts 연결)
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
      upcomingEventCount: Array.isArray(eventsRaw?.data) ? (eventsRaw.data as any[]).filter(e=> new Date(e.start_at) > new Date()).length : 0,
    }
  } catch {
    return { memberCount: 0, postCount: 0, commentCount: 0, classCount: 0, blogCount: 0, upcomingEventCount: 0 }
  }
}

// 커뮤니티 멤버 목록 (프로필 조인)
export async function getCommunityMembers(communityId: string) {
  try {
    // 멤버 행 로드
    const { data: rows, error } = await supabase
      .from('community_members')
      .select('user_id, role, joined_at')
      .eq('community_id', communityId)
      .or('role.is.null,role.neq.pending')
    if (error) throw error
    const userIds = Array.from(new Set((rows || []).map((r: any) => r.user_id)))
    const profilesMap = userIds.length > 0 ? await getProfilesCached(userIds) : {}
    // 소유자 확인
    const { data: comm } = await supabase
      .from('communities')
      .select('owner_id')
      .eq('id', communityId)
      .single()
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

// 승인 대기 (role = 'pending' 또는 status = 'pending' 컬럼이 있는 경우를 가정)
export async function getPendingCommunityMembers(communityId: string) {
  try {
    let pending: any[] = []
    let { data, error } = await supabase
      .from('community_members')
      .select('user_id, role')
      .eq('community_id', communityId)
      .eq('role', 'pending')
    if (error) {
      // role 컬럼이 없거나 값이 다르면 0개 반환
      pending = []
    } else {
      pending = data || []
    }
    const userIds = Array.from(new Set(pending.map((r: any) => r.user_id)))
    const profileMap = userIds.length > 0 ? await getProfilesCached(userIds) : {}
    return pending.map((r: any) => ({ user_id: r.user_id, profile: profileMap[r.user_id] }))
  } catch {
    return []
  }
}

export async function removeCommunityMember(communityId: string, userId: string) {
  try {
    // 보안 함수 사용 (오너 검증 포함). 함수가 없으면 에러 반환
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

// 커뮤니티 커스텀 페이지
export async function getCommunityPages(communityId: string) {
  try {
    const res = await fetch(`/api/community/pages?communityId=${encodeURIComponent(communityId)}`)
    if (!res.ok) throw new Error('failed')
    const data = await res.json()
    return (data || []) as CommunityPage[]
  } catch {
    return []
  }
}

export async function getCommunityPageById(id: string) {
  try {
    const { data, error } = await supabase
      .from('community_pages')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data as CommunityPage
  } catch {
    return null
  }
}

export async function createCommunityPage(communityId: string, title: string, groupId?: string | null, type: 'feed' | 'notes' | 'blog' = 'feed', _banner_url?: string | null, _description?: string | null) {
  // 스키마 호환성을 위해 기본 컬럼만 사용해 생성 (banner_url/description은 사용하지 않음)
  const { data, error } = await supabase
    .from('community_pages')
    .insert({ community_id: communityId, title, position: 999, group_id: groupId ?? null, type })
    .select()
    .single()
  if (error) throw error
  return data as CommunityPage
}

// 샘플/초기화 유틸: 노트 페이지 기본 카테고리/아이템 생성
export async function seedNotesPage(pageId: string) {
  // 요청: 샘플 데이터 생성하지 않음. 다만 카테고리 테이블이 없는 환경에서의 에러만 무시
  try {
    await supabase
      .from('community_page_note_categories')
      .select('id')
      .eq('page_id', pageId)
      .limit(1)
  } catch (_) {
    // 무시
  }
}

// 샘플/초기화 유틸: 갤러리 페이지 예시 이미지 생성
// (deprecated) gallery 페이지 초기화 유틸은 제거되었습니다.

// 블로그: 목록 조회 (간략 카드용)
export async function listBlogPosts(pageId: string) {
  try {
    const { data, error } = await supabase
      .from('community_page_blog_posts')
      .select('id,title,content,thumbnail_url,created_at')
      .eq('page_id', pageId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data || []) as { id: string; title: string; content: string; thumbnail_url: string | null; created_at: string }[]
  } catch {
    return []
  }
}

export async function getCommunitySlugById(communityId: string) {
  try {
    const { data } = await supabase.from('communities').select('slug').eq('id', communityId).single()
    return (data as any)?.slug || null
  } catch {
    return null
  }
}

export async function deleteCommunityPage(id: string) {
  const { error } = await supabase
    .from('community_pages')
    .delete()
    .eq('id', id)
  if (error) throw error
  return true
}

export async function renameCommunityPage(id: string, title: string) {
  const { data, error } = await supabase
    .from('community_pages')
    .update({ title })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as CommunityPage
}

export async function updateCommunityPageMeta(id: string, payload: Partial<Pick<CommunityPage, 'title' | 'banner_url' | 'description' | 'type'>>) {
  const { data, error } = await supabase
    .from('community_pages')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as CommunityPage
}

export async function saveCommunityPageOrder(communityId: string, orderedIds: string[]) {
  for (let i = 0; i < orderedIds.length; i++) {
    const id = orderedIds[i]
    const { error } = await supabase
      .from('community_pages')
      .update({ position: i })
      .eq('id', id)
      .eq('community_id', communityId)
    if (error) throw error
  }
  return true
}

// 페이지를 특정 그룹으로 이동시키며 위치도 함께 저장
export async function moveCommunityPage(pageId: string, nextGroupId: string | null, nextPosition: number) {
  const { error } = await supabase
    .from('community_pages')
    .update({ group_id: nextGroupId, position: nextPosition })
    .eq('id', pageId)
  if (error) throw error
  return true
}

export async function getCommunityPageGroups(communityId: string) {
  try {
    const res = await fetch(`/api/community/page-groups?communityId=${encodeURIComponent(communityId)}`)
    if (!res.ok) throw new Error('failed')
    const data = await res.json()
    return (data || []) as CommunityPageGroup[]
  } catch {
    return []
  }
}

export async function createCommunityPageGroup(communityId: string, title: string) {
  const { data, error } = await supabase
    .from('community_page_groups')
    .insert({ community_id: communityId, title, position: 999 })
    .select()
    .single()
  if (error) throw error
  return data as CommunityPageGroup
}

export async function deleteCommunityPageGroup(id: string) {
  const { error } = await supabase
    .from('community_page_groups')
    .delete()
    .eq('id', id)
  if (error) throw error
  return true
}

export async function renameCommunityPageGroup(id: string, title: string) {
  const { data, error } = await supabase
    .from('community_page_groups')
    .update({ title })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as CommunityPageGroup
}

export async function saveCommunityPageGroupOrder(communityId: string, orderedIds: string[]) {
  for (let i = 0; i < orderedIds.length; i++) {
    const id = orderedIds[i]
    const { error } = await supabase
      .from('community_page_groups')
      .update({ position: i })
      .eq('id', id)
      .eq('community_id', communityId)
    if (error) throw error
  }
  return true
}

export async function saveCommunityPageOrderInGroup(communityId: string, groupId: string | null, orderedIds: string[]) {
  for (let i = 0; i < orderedIds.length; i++) {
    const id = orderedIds[i]
    const { error } = await supabase
      .from('community_pages')
      .update({ group_id: groupId, position: i })
      .eq('id', id)
      .eq('community_id', communityId)
    if (error) throw error
  }
  return true
}

// ===== Blog APIs =====
export interface BlogPostPayload {
  page_id: string
  title: string
  content: string
  thumbnail_url?: string | null
}

export async function createBlogPost(payload: BlogPostPayload) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인이 필요합니다.')
  try {
    const { data, error } = await supabase
      .from('community_page_blog_posts')
      .insert({ ...payload, user_id: user.id })
      .select('id')
      .single()
    if (error) throw error
    return (data as any)?.id as string
  } catch (err) {
    throw err
  }
}

export async function getBlogPostById(id: string) {
  try {
    const { data, error } = await supabase
      .from('community_page_blog_posts')
      .select('id,title,content,thumbnail_url,created_at')
      .eq('id', id)
      .single()
    if (error) throw error
    return data as { id: string; title: string; content: string; thumbnail_url: string | null; created_at: string }
  } catch (err) {
    return null
  }
}