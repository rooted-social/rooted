import { supabase, getAuthToken } from '@/lib/supabase'

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
  const token = await getAuthToken().catch(() => null)
  const res = await fetch(`/api/dashboard/stats?communityId=${encodeURIComponent(communityId)}` , {
    headers: token ? { authorization: `Bearer ${token}` } : undefined,
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
  const token = await getAuthToken().catch(() => null)
  const res = await fetch(url, { headers: token ? { authorization: `Bearer ${token}` } : undefined })
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
  const token = await getAuthToken().catch(() => null)
  const res = await fetch(url, { cache: opts?.force ? 'no-store' : 'default', headers: token ? { authorization: `Bearer ${token}` } : undefined })
  // 인증/권한 없는 경우에는 빈 결과를 반환하여 UI가 정상 렌더링되도록 처리
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      return { posts: [], likeCounts: {}, commentCounts: {}, totalCount: 0 }
    }
    throw new Error('failed to fetch feed')
  }
  const data = await res.json() as { posts: any[]; likeCounts: Record<string, number>; commentCounts: Record<string, number>; totalCount?: number }
  // 기본 URL 키로 캐시를 갱신해 동일 파라미터의 이후 요청이 최신을 보게 함
  feedCache.set(baseUrl, { ts: now, data })
  return data
}

const homeCache = new Map<string, { ts: number; data: { settings: any; notices: any[]; canManage?: boolean; upcomingEvents?: any[]; recentActivity?: any[] } }>()
export async function fetchHomeData(communityId: string) {
  const key = communityId
  const now = Date.now()
  const cached = homeCache.get(key)
  if (cached && now - cached.ts < 300_000) return cached.data
  const token = await getAuthToken().catch(() => null)
  let res = await fetch(`/api/dashboard/home?communityId=${encodeURIComponent(communityId)}`, { headers: token ? { authorization: `Bearer ${token}` } : undefined })
  // 401일 때 세션-쿠키가 어긋났을 수 있으므로 동기화 후 1회 재시도
  if (res.status === 401) {
    try {
      const { data: { session } } = await (await import('./supabase')).supabase.auth.getSession()
      if (session?.access_token && session?.refresh_token) {
        await fetch('/api/auth/sync', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ access_token: session.access_token, refresh_token: session.refresh_token }) })
        const retryHeaders = session?.access_token ? { authorization: `Bearer ${session.access_token}` } : undefined
        res = await fetch(`/api/dashboard/home?communityId=${encodeURIComponent(communityId)}`, { headers: retryHeaders })
      }
    } catch {}
  }
  if (!res.ok) throw new Error('failed to fetch home data')
  const data = await res.json() as { settings: any; notices: any[]; canManage?: boolean; upcomingEvents?: any[]; recentActivity?: any[] }
  homeCache.set(key, { ts: now, data })
  return data
}

// Blog list fetcher (API 집계 사용)
const blogCache = new Map<string, { ts: number; data: any[] }>()
export async function fetchBlogList(pageId: string) {
  // 통합 오버뷰로 교체: posts + slug + isOwner + brandColor
  const key = `/api/blog/overview?pageId=${encodeURIComponent(pageId)}`
  const now = Date.now()
  const cached = blogCache.get(key)
  if (cached && now - cached.ts < 30_000) return cached.data
  const token = await getAuthToken().catch(() => null)
  const res = await fetch(key, { headers: token ? { authorization: `Bearer ${token}` } : undefined })
  if (!res.ok) throw new Error('failed to fetch blog list')
  const data = await res.json()
  blogCache.set(key, { ts: now, data })
  return data as any
}

// Notes list fetcher (API 집계 사용)
const notesCache = new Map<string, { ts: number; data: { categories: any[]; items: any[] } }>()
export async function fetchNotesList(pageId: string) {
  const key = `/api/notes/list?pageId=${encodeURIComponent(pageId)}`
  const now = Date.now()
  const cached = notesCache.get(key)
  if (cached && now - cached.ts < 120_000) return cached.data
  const token = await getAuthToken().catch(() => null)
  const res = await fetch(key, { headers: token ? { authorization: `Bearer ${token}` } : undefined })
  if (!res.ok) throw new Error('failed to fetch notes list')
  const data = await res.json()
  notesCache.set(key, { ts: now, data })
  return data as { categories: any[]; items: any[] }
}

// Explore communities fetcher (API 사용)
const exploreCache = new Map<string, { ts: number; data: any[] }>()
export async function fetchExploreCommunities(opts?: { search?: string; category?: string; limit?: number; sort?: 'popular' | 'newest'; signal?: AbortSignal }) {
  const params = new URLSearchParams()
  if (opts?.search) params.set('search', opts.search)
  if (opts?.category) params.set('category', opts.category)
  if (opts?.limit != null) params.set('limit', String(Math.max(1, Math.min(100, opts.limit))))
  if (opts?.sort) params.set('sort', opts.sort)
  const qs = params.toString()
  const url = `/api/explore/communities${qs ? `?${qs}` : ''}`
  const now = Date.now()
  // 서버 환경에서는 절대 URL이 필요하므로 base URL을 구성
  const baseUrl = typeof window === 'undefined'
    ? (process.env.NEXT_PUBLIC_SITE_URL
        || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : `http://localhost:${process.env.PORT || 3000}`))
    : ''
  const finalUrl = typeof window === 'undefined' ? new URL(url, baseUrl).toString() : url
  const cached = exploreCache.get(finalUrl)
  if (cached && now - cached.ts < 60_000) return cached.data
  const res = await fetch(finalUrl, { signal: opts?.signal })
  if (!res.ok) throw new Error('failed to fetch explore communities')
  const data = await res.json()
  exploreCache.set(finalUrl, { ts: now, data })
  return data as any[]
}


