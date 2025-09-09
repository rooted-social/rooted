"use client"

import { usePathname } from "next/navigation"
import type { ReactNode } from "react"

interface SidebarPaddingProps {
  children: ReactNode
}

export function SidebarPadding({ children }: SidebarPaddingProps) {
  const pathname = usePathname()
  const isDashboardRoute = pathname?.includes("/dashboard")
  const firstSegment = pathname?.split('/').filter(Boolean)[0] || ''
  const topLevelRoutes = new Set(['', 'explore', 'create', 'login', 'signup', 'dashboard', 'messages', 'notifications', 'api'])
  const isCommunityRoot = !!firstSegment && !topLevelRoutes.has(firstSegment) && !pathname?.includes('/dashboard')
  const isAuthRoute = pathname === '/login' || pathname === '/signup'
  
  // 커뮤니티 상세페이지(공개) vs 커뮤니티 대시보드 페이지 구분
  const isCommunityPublicPage = firstSegment && !topLevelRoutes.has(firstSegment) && 
    pathname?.split('/').filter(Boolean).length === 1 // /slug 형태만
  
  const isCommunityDashboardPage = firstSegment && !topLevelRoutes.has(firstSegment) && 
    (pathname?.includes('/dashboard') || pathname?.includes('/blog') || pathname?.includes('/classes') || 
     pathname?.includes('/calendar') || pathname?.includes('/members') || pathname?.includes('/settings'))
  
  const isCommunityDashboard = isCommunityDashboardPage && pathname?.includes('/dashboard')
  
  // 일반 대시보드는 compact 모드, 커뮤니티 상세페이지는 사이드바 없음
  const isCompact = (isDashboardRoute && !isCommunityDashboard) || isCommunityRoot
  
  // 패딩 클래스 설정
  let paddingClass = ""
  if (isAuthRoute) {
    // 로그인/회원가입: 헤더/사이드바 공간 없이 완전 중앙 배치 필요
    paddingClass = "pl-0 md:pl-0 pt-0 md:pt-0 pb-0 md:pb-0"
  } else if (isCommunityPublicPage) {
    // 커뮤니티 상세페이지(공개): PC에서 사이드바 있음, 모바일에서 메인 헤더 사용
    paddingClass = "pt-16 pb-20 md:pt-0 md:pb-0 pl-0 md:pl-16"
  } else if (isCommunityDashboardPage) {
    // 캘린더 페이지만 상단 여백 없음 (대시보드는 자체적으로 관리)
    const isCalendar = pathname?.includes('/calendar')
    const topPadding = isCalendar ? "pt-0" : "pt-16"
    
    // 커뮤니티 대시보드 페이지: PC에서는 compact 사이드바, 모바일에서는 페이지별 상단 여백 조정
    paddingClass = `${topPadding} pb-24 md:pt-0 md:pb-0 pl-0 md:pl-16`
  } else if (isCompact) {
    paddingClass = "pt-16 pb-20 md:pt-0 md:pb-0 pl-0 md:pl-16" // compact 모드
  } else {
    // 메인 페이지 등 일반 모드: 헤더 사이드바 폭 축소에 맞춰 좌측 여백 조정
    paddingClass = "pt-16 pb-20 md:pt-0 md:pb-0 pl-0 md:pl-48 lg:pl-56 xl:pl-60" // 일반 모드
  }

  return <div className={`body-has-sidebar ${paddingClass}`}>{children}</div>
}


