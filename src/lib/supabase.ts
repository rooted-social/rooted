import { createClient, type Session } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// --- Lightweight auth cache to reduce duplicate auth requests ---
let cachedSession: Session | null | undefined
let cachedUserId: string | null | undefined
let inFlightUserPromise: Promise<string | null> | null = null
let lastFetchMs = 0
const STALE_MS = 15 * 60 * 1000 // 15분
const DEDUPE_WINDOW_MS = 300 // 폭풍 호출시 300ms 내 중복 억제

function isStale(ts: number) {
  return Date.now() - ts > STALE_MS
}

export function setAuthCacheFromSession(session: Session | null) {
  cachedSession = session || null
  cachedUserId = session?.user?.id || null
  // 최신화 시각 갱신
  lastFetchMs = Date.now()
}

export function getCachedUserIdSync(): string | null {
  if (typeof cachedUserId === 'undefined') return null
  return cachedUserId || null
}

export async function getUserId(): Promise<string | null> {
  // 1) 캐시가 존재하고 신선하면 즉시 반환
  if (typeof cachedUserId !== 'undefined' && !isStale(lastFetchMs)) {
    return cachedUserId || null
  }

  // 2) 진행 중인 호출이 있으면 공용 Promise 재사용 (폭풍 억제)
  if (inFlightUserPromise) {
    return inFlightUserPromise
  }

  // 3) 너무 잦은 호출 방지 (짧은 시간 내 중복 억제)
  if (Date.now() - lastFetchMs < DEDUPE_WINDOW_MS && typeof cachedUserId !== 'undefined') {
    return cachedUserId || null
  }

  inFlightUserPromise = (async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      setAuthCacheFromSession(session)
      return session?.user?.id || null
    } catch {
      // 실패 시에도 짧게 캐시하여 연쇄 호출 억제
      lastFetchMs = Date.now()
      cachedUserId = null
      return null
    } finally {
      // 다음 틱에 inFlight 해제 (동일 tick 내 중복은 자연 dedupe)
      setTimeout(() => { inFlightUserPromise = null }, 0)
    }
  })()

  return inFlightUserPromise
}

export async function getAuthToken(): Promise<string | null> {
  try {
    // 세션 캐시 사용 시 네트워크를 줄임
    if (cachedSession && !isStale(lastFetchMs)) {
      return cachedSession.access_token || null
    }
    const { data: { session } } = await supabase.auth.getSession()
    setAuthCacheFromSession(session)
    return session?.access_token || null
  } catch {
    return null
  }
}