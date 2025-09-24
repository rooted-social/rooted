import { supabase, getUserId } from '@/lib/supabase'
import { getAuthToken } from '@/lib/supabase'

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

// 통합 캘린더 오버뷰: 이벤트 + isOwner + 브랜드 컬러
const calendarOverviewCache = new Map<string, { ts: number; data: { events: CommunityEvent[]; isOwner: boolean; brandColor: string | null } }>()
export async function getCalendarOverview(communityId: string, opts?: { force?: boolean }) {
  const key = communityId
  const now = Date.now()
  if (!opts?.force) {
    const cached = calendarOverviewCache.get(key)
    if (cached && now - cached.ts < 60_000) return cached.data
  }
  try {
    const token = await getAuthToken().catch(() => null)
    const res = await fetch(`/api/calendar/overview?communityId=${encodeURIComponent(communityId)}`, { headers: token ? { authorization: `Bearer ${token}` } : undefined })
    if (!res.ok) {
      return { events: [] as CommunityEvent[], isOwner: false, brandColor: null as string | null }
    }
    const data = await res.json()
    const payload = { events: (data?.events || []) as CommunityEvent[], isOwner: !!data?.isOwner, brandColor: (data?.brandColor ?? null) as string | null }
    calendarOverviewCache.set(key, { ts: now, data: payload })
    return payload
  } catch {
    return { events: [] as CommunityEvent[], isOwner: false, brandColor: null as string | null }
  }
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


