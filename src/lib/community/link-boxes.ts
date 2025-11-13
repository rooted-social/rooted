import { supabase, getUserId } from '@/lib/supabase'
import type { CommunityLinkBox } from '@/types/community'
import { cache60 } from './cache'

export async function getCommunityLinkBoxes(communityId: string): Promise<CommunityLinkBox[]> {
  const key = `linkboxes:${communityId}`
  const now = Date.now()
  const cached = cache60.get(key)
  if (cached && now - cached.ts < 300_000) return (cached.data as CommunityLinkBox[]) || []
  try {
    const { data, error } = await supabase
      .from('community_link_boxes')
      .select('*')
      .eq('community_id', communityId)
      .order('position', { ascending: true, nullsFirst: true })
      .order('created_at', { ascending: true })
      .limit(10)
    if (error) throw error
    const res = (data as CommunityLinkBox[]) || []
    cache60.set(key, { ts: now, data: res })
    return res
  } catch {
    return []
  }
}

export async function createCommunityLinkBox(communityId: string, title: string, url: string): Promise<CommunityLinkBox> {
  const uid = await getUserId()
  if (!uid) throw new Error('로그인이 필요합니다.')
  const trimmed = (title || '').trim().slice(0, 30)
  if (!trimmed) throw new Error('제목을 입력하세요.')
  if (!url?.trim()) throw new Error('링크를 입력하세요.')
  const normalizedUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`
  const { data, error } = await supabase
    .from('community_link_boxes')
    .insert({ community_id: communityId, title: trimmed, url: normalizedUrl })
    .select()
    .single()
  if (error) throw error
  // invalidate cache
  cache60.set(`linkboxes:${communityId}`, { ts: 0, data: [] })
  return data as CommunityLinkBox
}

export async function updateCommunityLinkBox(id: string, updates: Partial<Pick<CommunityLinkBox, 'title' | 'url' | 'position'>>): Promise<CommunityLinkBox> {
  const payload: any = { ...updates }
  if (payload.title) payload.title = String(payload.title).trim().slice(0, 30)
  if (payload.url) payload.url = /^https?:\/\//i.test(payload.url) ? payload.url : `https://${payload.url}`
  const { data, error } = await supabase
    .from('community_link_boxes')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  // invalidate cache for this community
  try { cache60.set(`linkboxes:${(data as any).community_id}`, { ts: 0, data: [] }) } catch {}
  // cannot know communityId here to clear cache; rely on time-based cache
  return data as CommunityLinkBox
}

export async function deleteCommunityLinkBox(id: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('community_link_boxes')
    .delete()
    .eq('id', id)
    .select('community_id')
    .single()
  if (error) throw error
  try { cache60.set(`linkboxes:${(data as any).community_id}`, { ts: 0, data: [] }) } catch {}
  return true
}


