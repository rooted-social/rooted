import { supabase, getUserId } from '@/lib/supabase'
import { Community } from '@/types/community'

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
    let query = supabase
      .from('communities')
      .select('*')
      .order('created_at', { ascending: false })

    if (!filters.includePrivate) {
      query = query.eq('is_public', true as any)
    }

    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
    }

    if (filters.category && filters.category !== '전체') {
      query = query.eq('category', filters.category)
    }

    let { data, error } = await query

    if (error) {
      const msg = (error as any)?.message?.toLowerCase?.() || ''
      if (msg.includes('is_public') || msg.includes('column')) {
        const retry = await supabase
          .from('communities')
          .select('*')
          .order('created_at', { ascending: false })
        if (retry.error) throw retry.error
        data = retry.data
      } else {
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
    const { data: communityData, error: communityError } = await supabase
      .from('communities')
      .select('*')
      .eq('slug', slug)
      .single()

    if (communityError) throw communityError

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, full_name, bio, avatar_url')
      .eq('id', communityData.owner_id)
      .single()

    if (profileError) {
      return {
        ...communityData,
        profiles: {
          id: communityData.owner_id,
          username: '알 수 없음',
          full_name: '알 수 없음',
          bio: '',
          avatar_url: null,
        },
      }
    }

    return { ...communityData, profiles: profileData }
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

    const { data: existingCommunity } = await supabase
      .from('communities')
      .select('id')
      .eq('slug', communityData.slug)
      .single()

    if (existingCommunity) throw new Error('이미 사용 중인 URL입니다.')

    // 기본 플랜은 Starter로 시작 (베타)
    const { data, error } = await supabase
      .from('communities')
      .insert({
        ...communityData,
        owner_id: uid,
        // 서버 기본값에 의존하되, 명시적으로 함께 기록하여 초기 값 보장
        plan: 'starter' as any,
        member_limit: 300 as any,
        page_limit: 10 as any,
      })
      .select()
      .single()
    if (error) throw error
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
    if (error) throw error
    return data as Community
  } catch (error) {
    console.error('updateCommunity 오류:', error)
    throw error
  }
}

// 커뮤니티 삭제
export async function deleteCommunity(id: string) {
  try {
    // 서버 API를 통해 R2 정리까지 동기화
    const token = await (async () => {
      try { const { getAuthToken } = await import('@/lib/supabase'); return await getAuthToken() } catch { return null }
    })()
    const res = await fetch('/api/community/delete', { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ communityId: id }) })
    if (!res.ok) {
      const body = await res.json().catch(() => ({} as any))
      throw new Error(body?.error || 'delete failed')
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

    const { data: existingMember } = await supabase
      .from('community_members')
      .select('id')
      .eq('community_id', communityId)
      .eq('user_id', uid)
      .single()

    if (existingMember) throw new Error('이미 가입한 커뮤니티입니다.')

    const { data: comm } = await supabase
      .from('communities')
      .select('join_policy, member_limit')
      .eq('id', communityId)
      .single()
    const policy = (comm as any)?.join_policy || 'free'
    const role = policy === 'approval' ? 'pending' : 'member'

    // UX용 선행 체크: 현재 멤버 수가 한도에 도달했다면 사전 차단
    const limit = (comm as any)?.member_limit as number | null | undefined
    if (limit !== null && typeof limit === 'number') {
      const { count: memCount } = await supabase
        .from('community_members')
        .select('*', { count: 'exact', head: true })
        .eq('community_id', communityId)
        .or('role.is.null,role.neq.pending')
      if ((memCount || 0) >= limit) {
        throw new Error('멤버 한도에 도달했습니다. 플랜을 업그레이드해주세요.')
      }
    }

    const { data, error } = await supabase
      .from('community_members')
      .insert({ community_id: communityId, user_id: uid, role })
      .select()
      .single()
    if (error) {
      const em = (error as any)?.message?.toString?.().toLowerCase?.() || ''
      if (em.includes('member_limit_reached')) {
        throw new Error('멤버 한도에 도달했습니다. 플랜을 업그레이드해주세요.')
      }
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
    if (error) throw error
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
      uid = (await getUserId()) || (undefined as any)
      if (!uid) throw new Error('로그인이 필요합니다.')
    }
    const { data, error } = await supabase
      .from('community_members')
      .select(`*, communities (*)`)
      .eq('user_id', uid as string)
      .or('role.is.null,role.neq.pending')
    if (error) throw error
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

export async function getCommunitySlugById(communityId: string) {
  try {
    const { data } = await supabase.from('communities').select('slug').eq('id', communityId).single()
    return (data as any)?.slug || null
  } catch {
    return null
  }
}


