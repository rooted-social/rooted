"use client"

import { useParams, usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { CommunityTopbar } from "@/components/community-dashboard/CommunityTopbar"
import { useCommunityBySlug } from "@/hooks/useCommunity"

interface CommunityLayoutProps {
  children: React.ReactNode
}

export default function CommunityLayout({ children }: CommunityLayoutProps) {
  const { slug } = useParams<{ slug: string }>()
  const pathname = usePathname()
  const [communityName, setCommunityName] = useState<string>("")
  const [communityIcon, setCommunityIcon] = useState<string | null>(null)
  // 제거된 로컬 로딩 상태: Topbar가 사라지는 문제 방지

  // 현재 활성 탭 결정
  const getActiveTab = () => {
    if (!pathname) return 'home'
    
    // 정확한 경로 매칭을 위해 더 구체적으로 확인
    const pathSegments = pathname.split('/').filter(Boolean)
    if (pathSegments.length >= 2) {
      const lastSegment = pathSegments[pathSegments.length - 1]
      const secondLastSegment = pathSegments[pathSegments.length - 2]
      
      // /slug/dashboard 또는 /slug/dashboard/... 
      if (secondLastSegment === String(slug) && lastSegment === 'dashboard') return 'home'
      if (pathname.includes(`/${slug}/dashboard`)) return 'home'
      
      // /slug/classes 정확한 매치 또는 /slug/classes/[id]
      if (secondLastSegment === String(slug) && lastSegment === 'classes') return 'classes'
      if (pathname.includes(`/${slug}/classes/`)) return 'classes'  // 클래스 상세 페이지
      
      // /slug/calendar
      if (secondLastSegment === String(slug) && lastSegment === 'calendar') return 'calendar'
      if (pathname.includes(`/${slug}/calendar`)) return 'calendar'
      
      // /slug/members  
      if (secondLastSegment === String(slug) && lastSegment === 'members') return 'members'
      if (pathname.includes(`/${slug}/members`)) return 'members'
      
      // /slug/settings
      if (secondLastSegment === String(slug) && lastSegment === 'settings') return 'settings'
      if (pathname.includes(`/${slug}/settings`)) return 'settings'
    }
    
    return 'home' // 기본값 (블로그나 기타 페이지)
  }

  const [active, setActive] = useState<"home" | "settings" | "classes" | "calendar" | "members">(getActiveTab())

  useEffect(() => {
    setActive(getActiveTab())
  }, [pathname])

  const communityQ = useCommunityBySlug(String(slug))
  useEffect(() => {
    const data = communityQ.data as any
    if (!data) return
    setCommunityName(data.name || String(slug))
    setCommunityIcon(data?.image_url || null)
  }, [communityQ.data, slug])

  const handleTabChange = (newTab: typeof active) => {
    // 탭 변경 시 해당 경로로 이동
    switch (newTab) {
      case 'home':
        window.location.href = `/${slug}/dashboard`
        break
      case 'classes':
        window.location.href = `/${slug}/classes`
        break
      case 'calendar':
        window.location.href = `/${slug}/calendar`
        break
      case 'members':
        window.location.href = `/${slug}/members`
        break
      case 'settings':
        window.location.href = `/${slug}/settings`
        break
    }
  }

  // 항상 Topbar를 렌더링하여 초기 로딩 시에도 상단 바가 보이도록 함

  // 커뮤니티 상세페이지(공개)와 대시보드 페이지 구분
  const isCommunityPublicPage = pathname === `/${slug}`
  const isCommunityDashboardPage = pathname?.includes('/dashboard') || 
    pathname?.includes('/classes') || pathname?.includes('/calendar') || 
    pathname?.includes('/members') || pathname?.includes('/settings') ||
    pathname?.includes('/blog')

  return (
    <div className="min-h-screen">
      {/* 커뮤니티 대시보드 페이지에서만 CommunityTopbar 표시 */}
      {isCommunityDashboardPage && (
        <CommunityTopbar 
          slug={String(slug)} 
          name={communityName} 
          active={active} 
          onChange={handleTabChange} 
          imageUrl={communityIcon || undefined}
          onToggleSidebar={() => {
            // 대시보드 페이지에서만 사이드바 토글 가능
            if (pathname?.includes('/dashboard')) {
              // 이 부분은 dashboard 페이지에서 처리하도록 이벤트 전달
              const event = new CustomEvent('toggle-community-sidebar')
              window.dispatchEvent(event)
            }
          }}
        />
      )}
      {children}
    </div>
  )
}
