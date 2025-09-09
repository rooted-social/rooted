import { supabase } from '@/lib/supabase'

// 간단한 프로필 캐시 레이어 (세션 메모리, TTL 5분)
const profileCache = new Map<string, { ts: number; data: any }>()
const PROFILE_TTL = 1000 * 60 * 5

export async function getProfilesCached(ids: string[]): Promise<Record<string, any>> {
  const now = Date.now()
  const uniqueIds = Array.from(new Set(ids.filter(Boolean))) as string[]
  const missing: string[] = []
  const result: Record<string, any> = {}
  for (const id of uniqueIds) {
    const c = profileCache.get(id)
    if (c && now - c.ts < PROFILE_TTL) {
      result[id] = c.data
    } else {
      missing.push(id)
    }
  }
  if (missing.length > 0) {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, updated_at, bio')
      .in('id', missing)
    for (const p of (data || []) as any[]) {
      profileCache.set(p.id, { ts: now, data: p })
      result[p.id] = p
    }
    // 누락된 id는 null로 표시해 캐시 미스 반복 방지
    for (const id of missing) {
      if (!(id in result)) {
        profileCache.set(id, { ts: now, data: null })
        result[id] = null
      }
    }
  }
  return result
}

// URL(slug) 중복 여부 확인: 사용 가능하면 true
export async function checkSlugAvailable(slug: string): Promise<boolean> {
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) return false
  const { count, error } = await supabase
    .from('communities')
    .select('*', { count: 'exact', head: true })
    .eq('slug', slug)
  if (error) return false
  return (count || 0) === 0
}



