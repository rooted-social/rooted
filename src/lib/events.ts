import { supabase, getUserId } from '@/lib/supabase'

export interface CommunityEvent {
  id: string
  community_id: string
  title: string
  description?: string | null
  location?: string | null
  start_at: string
  end_at: string
  color: string
  created_by: string
  created_at: string
}

export async function getCommunityEvents(communityId: string): Promise<CommunityEvent[]> {
  const { data, error } = await supabase
    .from('community_events')
    .select('*')
    .eq('community_id', communityId)
    .order('start_at', { ascending: true })
  if (error) return []
  return (data || []) as CommunityEvent[]
}

export async function createCommunityEvent(payload: Omit<CommunityEvent,'id'|'created_at'|'created_by'>) {
  const uid = await getUserId()
  if (!uid) throw new Error('로그인이 필요합니다.')
  const { data, error } = await supabase
    .from('community_events')
    .insert({ ...payload, created_by: uid })
    .select()
    .single()
  if (error) throw error
  return data as CommunityEvent
}

export async function updateCommunityEvent(id: string, updates: Partial<Omit<CommunityEvent,'id'|'community_id'|'created_by'|'created_at'>>) {
  const { data, error } = await supabase
    .from('community_events')
    .update(updates)
    .eq('id', id)
    .select()
    .maybeSingle()
  if (error) throw error
  return data as CommunityEvent | null
}

export async function deleteCommunityEvent(id: string) {
  const { error } = await supabase
    .from('community_events')
    .delete()
    .eq('id', id)
  if (error) throw error
  return true
}


