import { supabase } from '@/lib/supabase'

export interface DashboardStats {
  memberCount: number
  postCount: number
  commentCount: number
  classCount: number
  blogCount: number
  upcomingEventCount: number
}

// 동일 communityId에 대한 중복 fetch를 짧은 시간동안 방지하기 위한 간단한 인메모리 캐시
const statsCache = new Map<string, { ts: number; data: DashboardStats }>()
export async function fetchDashboardStats(communityId: string): Promise<DashboardStats> {
  const key = communityId
  const now = Date.now()
  const cached = statsCache.get(key)
  if (cached && now - cached.ts < 300_000) {
    return cached.data
  }
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`/api/dashboard/stats?communityId=${encodeURIComponent(communityId)}` , {
    headers: session?.access_token ? { authorization: `Bearer ${session.access_token}` } : undefined,
  })
  if (!res.ok) throw new Error('failed to fetch dashboard stats')
  const data = (await res.json()) as DashboardStats
  statsCache.set(key, { ts: now, data })
  return data
}

export type RecentActivityItem = { id: string; kind: 'feed'|'blog'|'note'|'event'|'class'; title: string; created_at: string; href?: string; meta?: string }

const recentCache = new Map<string, { ts: number; data: RecentActivityItem[] }>()
export async function fetchRecentActivity(communityId: string, slug?: string): Promise<RecentActivityItem[]> {
  const url = `/api/dashboard/recent-activity?communityId=${encodeURIComponent(communityId)}${slug ? `&slug=${encodeURIComponent(slug)}` : ''}`
  const key = url
  const now = Date.now()
  const cached = recentCache.get(key)
  if (cached && now - cached.ts < 300_000) return cached.data
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(url, { headers: session?.access_token ? { authorization: `Bearer ${session.access_token}` } : undefined })
  if (!res.ok) throw new Error('failed to fetch recent activity')
  const data = (await res.json()) as RecentActivityItem[]
  recentCache.set(key, { ts: now, data })
  return data
}

const feedCache = new Map<string, { ts: number; data: { posts: any[]; likeCounts: Record<string, number>; commentCounts: Record<string, number>; totalCount?: number } }>()
export async function fetchFeed(communityId: string, opts?: { pageId?: string | null; force?: boolean; limit?: number; offset?: number }) {
  const params = new URLSearchParams({ communityId })
  if (opts?.pageId !== undefined) params.set('pageId', String(opts.pageId))
  if (opts?.limit != null) params.set('limit', String(opts.limit))
  if (opts?.offset != null) params.set('offset', String(opts.offset))
  const baseUrl = `/api/dashboard/feed?${params.toString()}`
  const url = opts?.force ? `${baseUrl}&t=${Date.now()}` : baseUrl
  const now = Date.now()
  if (!opts?.force) {
    const cached = feedCache.get(baseUrl)
    if (cached && now - cached.ts < 120_000) return cached.data
  }
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(url, { cache: opts?.force ? 'no-store' : 'default', headers: session?.access_token ? { authorization: `Bearer ${session.access_token}` } : undefined })
  if (!res.ok) throw new Error('failed to fetch feed')
  const data = await res.json() as { posts: any[]; likeCounts: Record<string, number>; commentCounts: Record<string, number>; totalCount?: number }
  // 기본 URL 키로 캐시를 갱신해 동일 파라미터의 이후 요청이 최신을 보게 함
  feedCache.set(baseUrl, { ts: now, data })
  return data
}

const homeCache = new Map<string, { ts: number; data: { settings: any; notices: any[] } }>()
export async function fetchHomeData(communityId: string) {
  const key = communityId
  const now = Date.now()
  const cached = homeCache.get(key)
  if (cached && now - cached.ts < 300_000) return cached.data
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`/api/dashboard/home?communityId=${encodeURIComponent(communityId)}`, { headers: session?.access_token ? { authorization: `Bearer ${session.access_token}` } : undefined })
  if (!res.ok) throw new Error('failed to fetch home data')
  const data = await res.json() as { settings: any; notices: any[] }
  homeCache.set(key, { ts: now, data })
  return data
}

// Blog list fetcher (API 집계 사용)
const blogCache = new Map<string, { ts: number; data: any[] }>()
export async function fetchBlogList(pageId: string) {
  const key = `/api/blog/list?pageId=${encodeURIComponent(pageId)}`
  const now = Date.now()
  const cached = blogCache.get(key)
  if (cached && now - cached.ts < 120_000) return cached.data
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(key, { headers: session?.access_token ? { authorization: `Bearer ${session.access_token}` } : undefined })
  if (!res.ok) throw new Error('failed to fetch blog list')
  const data = await res.json()
  blogCache.set(key, { ts: now, data })
  return data as any[]
}

// Notes list fetcher (API 집계 사용)
const notesCache = new Map<string, { ts: number; data: { categories: any[]; items: any[] } }>()
export async function fetchNotesList(pageId: string) {
  const key = `/api/notes/list?pageId=${encodeURIComponent(pageId)}`
  const now = Date.now()
  const cached = notesCache.get(key)
  if (cached && now - cached.ts < 120_000) return cached.data
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(key, { headers: session?.access_token ? { authorization: `Bearer ${session.access_token}` } : undefined })
  if (!res.ok) throw new Error('failed to fetch notes list')
  const data = await res.json()
  notesCache.set(key, { ts: now, data })
  return data as { categories: any[]; items: any[] }
}

// Explore communities fetcher (API 사용)
const exploreCache = new Map<string, { ts: number; data: any[] }>()
export async function fetchExploreCommunities(opts?: { search?: string; category?: string; signal?: AbortSignal }) {
  const url = `/api/explore/communities${opts?.search || opts?.category ? `?${new URLSearchParams({ ...(opts?.search ? { search: opts.search } : {}), ...(opts?.category ? { category: opts.category } : {}) }).toString()}` : ''}`
  const now = Date.now()
  const cached = exploreCache.get(url)
  if (cached && now - cached.ts < 60_000) return cached.data
  const res = await fetch(url, { signal: opts?.signal })
  if (!res.ok) throw new Error('failed to fetch explore communities')
  const data = await res.json()
  exploreCache.set(url, { ts: now, data })
  return data as any[]
}


