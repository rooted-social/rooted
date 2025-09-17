// 공용 캐시 및 상수

// 인메모리 캐시 (간단, 프로세스 생존 동안만 유지)
export const cache60 = new Map<string, { ts: number; data: any }>()

// 사이드바 페이지/그룹 장기 캐시 (세션 동안 재사용)
export const pagesCache = new Map<string, { ts: number; data: any[] }>()
export const pageGroupsCache = new Map<string, { ts: number; data: any[] }>()

export const FIVE_MIN = 300_000

export function invalidatePagesCache(communityId: string) {
  pagesCache.delete(communityId)
}

export function invalidatePageGroupsCache(communityId: string) {
  pageGroupsCache.delete(communityId)
}


