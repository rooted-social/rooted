import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 아바타 이미지 URL을 프록시 경유(+캐시 버스터) 형태로 변환
 */
export function getAvatarUrl(sourceUrl?: string | null, version?: string | number) {
  if (!sourceUrl) return undefined
  // 이미 내부 프록시 경유라면 버전 파라미터만 추가
  if (sourceUrl.includes('/api/profile/avatar')) {
    const url = new URL(sourceUrl, typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
    if (version) url.searchParams.set('v', String(version))
    return url.toString()
  }
  // 외부(https://) 또는 data URL은 그대로 사용하되 버전 파라미터만 부여
  if (/^(https?:)?\/\//.test(sourceUrl) || sourceUrl.startsWith('data:')) {
    return getVersionedUrl(sourceUrl, version)
  }
  // 그 외(상대경로 등)는 그대로 반환
  return getVersionedUrl(sourceUrl, version)
}

export function getVersionedUrl(url?: string | null, version?: string | number) {
  if (!url) return undefined
  try {
    const u = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
    if (version) u.searchParams.set('v', String(version))
    return u.toString()
  } catch {
    // 상대경로나 잘못된 URL이면 단순 쿼리 부착
    const sep = url.includes('?') ? '&' : '?'
    return version ? `${url}${sep}v=${encodeURIComponent(String(version))}` : url
  }
}
