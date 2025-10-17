"use client"

import { usePathname } from "next/navigation"
import type { ReactNode } from "react"

interface SidebarPaddingProps {
  children: ReactNode
}

export function SidebarPadding({ children }: SidebarPaddingProps) {
  const pathname = usePathname()
  const firstSegment = pathname?.split('/').filter(Boolean)[0] || ''
  const topLevelRoutes = new Set(['', 'explore', 'features', 'pricing', 'create', 'login', 'signup', 'dashboard', 'messages', 'notifications', 'api'])
  const isAuthRoute = pathname === '/login' || pathname === '/signup'
  const isHome = pathname === '/'

  // 상단 글로벌 헤더가 표시되지 않는 페이지들(커뮤니티 대시보드/내부 탭)
  const hideGlobalHeader = firstSegment && !topLevelRoutes.has(firstSegment) &&
    (pathname?.includes('/dashboard') || pathname?.includes('/blog') || pathname?.includes('/classes') ||
     pathname?.includes('/calendar') || pathname?.includes('/members') || pathname?.includes('/settings') || pathname?.includes('/stats'))

  // 헤더가 보이면 상단 패딩 적용, 아니면 0
  // 모바일에서는 헤더 높이가 48px(12) 이므로, 중간에 흰 여백이 보이지 않게 동일 패딩 사용
  const paddingClass = (isAuthRoute || hideGlobalHeader || isHome) ? 'pt-0' : 'pt-12 md:pt-20'

  return <div className={paddingClass}>{children}</div>
}


