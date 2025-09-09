import { supabase } from './supabase'
import type { Profile, ProfileUpdateData } from '@/types/auth'

/**
 * 사용자 프로필 조회
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('프로필 조회 오류:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('프로필 조회 중 예외 발생:', error)
    return null
  }
}

/**
 * 프로필 업데이트
 */
export async function updateProfile(
  userId: string, 
  updates: ProfileUpdateData
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)

    if (error) {
      console.error('프로필 업데이트 오류:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('프로필 업데이트 중 예외 발생:', error)
    return { success: false, error: '프로필 업데이트 중 오류가 발생했습니다.' }
  }
}

/**
 * 프로필 생성 (기존 사용자용)
 */
export async function createProfile(
  userId: string,
  profileData: Partial<ProfileUpdateData> = {},
  userMeta?: any
): Promise<{ success: boolean; error?: string }> {
  try {
    // OAuth 메타데이터를 기본값으로 채움 (예: Kakao)
    let defaults: Partial<ProfileUpdateData> = {}
    try {
      const meta = (userMeta as any) || {}
      const metaAvatar = meta.avatar_url || meta.picture || meta.profile_image_url
      const metaName = meta.full_name || meta.name || meta.nickname
      defaults = {
        avatar_url: metaAvatar || undefined,
        full_name: metaName || undefined,
      }
    } catch {}
    const { error } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        ...defaults,
        ...profileData
      })

    if (error) {
      console.error('프로필 생성 오류:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('프로필 생성 중 예외 발생:', error)
    return { success: false, error: '프로필 생성 중 오류가 발생했습니다.' }
  }
}

/**
 * 프로필 존재 여부 확인 및 자동 생성
 */
export async function ensureProfile(userId: string, userMeta?: any): Promise<Profile | null> {
  // 먼저 프로필 조회 시도
  let profile = await getProfile(userId)
  
  if (!profile) {
    // 프로필이 없다면 생성
    const createResult = await createProfile(userId, {}, userMeta)
    if (createResult.success) {
      // 생성 후 다시 조회
      profile = await getProfile(userId)
    }
  }
  // 기존 프로필이 있지만 아바타/이름이 비어있다면 OAuth 메타데이터로 보정
  try {
    const meta = (userMeta as any) || {}
    const metaAvatar = meta.avatar_url || meta.picture || meta.profile_image_url
    const metaName = meta.full_name || meta.name || meta.nickname
    const needsAvatar = !profile?.avatar_url && !!metaAvatar
    const needsName = !profile?.full_name && !!metaName
    if ((needsAvatar || needsName)) {
      const updates: any = {}
      if (needsAvatar) updates.avatar_url = metaAvatar
      if (needsName) updates.full_name = metaName
      const { error } = await supabase.from('profiles').update(updates).eq('id', userId)
      if (!error) {
        profile = await getProfile(userId)
      }
    }
  } catch {}

  return profile
}

/**
 * 사용자명 중복 확인
 */
export async function checkUsernameAvailability(
  username: string, 
  currentUserId?: string
): Promise<boolean> {
  try {
    let query = supabase
      .from('profiles')
      .select('id')
      .eq('username', username)

    // 현재 사용자의 username은 제외
    if (currentUserId) {
      query = query.neq('id', currentUserId)
    }

    const { data, error } = await query

    if (error) {
      console.error('사용자명 중복 확인 오류:', error)
      return false
    }

    return data.length === 0
  } catch (error) {
    console.error('사용자명 중복 확인 중 예외 발생:', error)
    return false
  }
}

/**
 * 아바타 URL 생성 (캐시 버스팅 포함)
 */
export function getAvatarUrl(avatarUrl: string | null, updatedAt: string | null): string | undefined {
  if (!avatarUrl) return undefined
  const version = updatedAt ? new Date(updatedAt).getTime() : undefined
  try {
    const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
    const u = new URL(avatarUrl, base)
    if (version) u.searchParams.set('v', String(version))
    return u.toString()
  } catch {
    const sep = avatarUrl.includes('?') ? '&' : '?'
    return version ? `${avatarUrl}${sep}v=${version}` : avatarUrl
  }
}