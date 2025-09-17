import { supabase, getUserId } from '@/lib/supabase'
import { cache60 } from './cache'
import { Notice, CommunitySettings, BoardCategory, CommunityService } from '@/types/community'

// 공지사항
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
  const { error } = await supabase.from('notices').delete().eq('id', id)
  if (error) throw error
  return true
}

// 설정
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
    if (error && (error as any).code !== 'PGRST116') throw error
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

// 카테고리
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
  const { error } = await supabase.from('board_categories').delete().eq('id', id)
  if (error) throw error
  return true
}

export async function saveCategoryOrder(communityId: string, orderedIds: string[]) {
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

// 서비스
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
  const { error } = await supabase.from('community_services').delete().eq('id', id)
  if (error) throw error
  return true
}


