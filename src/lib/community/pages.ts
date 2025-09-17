import { supabase, getUserId } from '@/lib/supabase'
import { CommunityPage, CommunityPageGroup } from '@/types/community'
import { FIVE_MIN, pagesCache, pageGroupsCache, invalidatePagesCache } from './cache'

// 커뮤니티 커스텀 페이지
export async function getCommunityPages(communityId: string) {
  try {
    const now = Date.now()
    const cached = pagesCache.get(communityId)
    if (cached && now - cached.ts < FIVE_MIN) return cached.data as CommunityPage[]
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`/api/community/pages?communityId=${encodeURIComponent(communityId)}`, {
      cache: 'no-store',
      headers: session?.access_token ? { authorization: `Bearer ${session.access_token}` } : undefined,
    })
    if (!res.ok) throw new Error('failed')
    const data = (await res.json()) as CommunityPage[]
    pagesCache.set(communityId, { ts: now, data: data || [] })
    return data || []
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

export async function createCommunityPage(
  communityId: string,
  title: string,
  groupId?: string | null,
  type: 'feed' | 'notes' | 'blog' = 'feed',
  _banner_url?: string | null,
  _description?: string | null,
) {
  const { data, error } = await supabase
    .from('community_pages')
    .insert({ community_id: communityId, title, position: 999, group_id: groupId ?? null, type })
    .select()
    .single()
  if (error) throw error
  invalidatePagesCache(communityId)
  return data as CommunityPage
}

export async function deleteCommunityPage(id: string) {
  const { error } = await supabase.from('community_pages').delete().eq('id', id)
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
  // 서버 라우트로 1회 요청
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch('/api/community/pages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(session?.access_token ? { authorization: `Bearer ${session.access_token}` } : {}) },
    body: JSON.stringify({ communityId, orderedIds }),
  })
  if (!res.ok) throw new Error('failed')
  invalidatePagesCache(communityId)
  return true
}

export async function moveCommunityPage(pageId: string, nextGroupId: string | null, nextPosition: number) {
  const { error } = await supabase
    .from('community_pages')
    .update({ group_id: nextGroupId, position: nextPosition })
    .eq('id', pageId)
  if (error) throw error
  return true
}

// 그룹
export async function getCommunityPageGroups(communityId: string) {
  try {
    const now = Date.now()
    const cached = pageGroupsCache.get(communityId)
    if (cached && now - cached.ts < FIVE_MIN) return cached.data as CommunityPageGroup[]
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`/api/community/page-groups?communityId=${encodeURIComponent(communityId)}`, {
      headers: session?.access_token ? { authorization: `Bearer ${session.access_token}` } : undefined,
    })
    if (!res.ok) throw new Error('failed')
    const data = (await res.json()) as CommunityPageGroup[]
    pageGroupsCache.set(communityId, { ts: now, data: data || [] })
    return data || []
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
  const { error } = await supabase.from('community_page_groups').delete().eq('id', id)
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


