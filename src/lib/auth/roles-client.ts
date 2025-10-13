"use client"

import { useAuthData } from '@/components/auth/AuthProvider'

/**
 * 클라이언트에서 super admin 여부를 판단하는 훅
 * - 환경변수로 주입된 SUPER_ADMIN_USER_ID와 현재 사용자 id를 비교
 * - 클라이언트 빌드 시 `.env`의 NEXT_PUBLIC_SUPER_ADMIN_USER_ID 로 노출 필요
 */
export function useIsSuperAdmin(): boolean {
  const { user } = useAuthData()
  // 1) 서버가 세팅한 쿠키 우선 (관리자 페이지 경유 시 확실)
  try {
    if (typeof document !== 'undefined') {
      const v = document.cookie.split('; ').find(x => x.startsWith('is-super-admin='))?.split('=')[1]
      if (v === '1') return true
    }
  } catch {}
  // 2) 환경변수 백업 판정 (직접 URL 접근 등)
  const superId = process.env.NEXT_PUBLIC_SUPER_ADMIN_USER_ID
  return !!user?.id && !!superId && user.id === superId
}

/**
 * 커뮤니티 소유자 판정에 super admin을 포함시키는 헬퍼
 */
export function useIsOwnerOrSuper(ownerId?: string | null): boolean {
  const { user } = useAuthData()
  const isSuper = useIsSuperAdmin()
  if (isSuper) return true
  return !!user?.id && !!ownerId && user.id === ownerId
}


