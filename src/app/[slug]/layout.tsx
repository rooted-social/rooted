"use client"

import { useParams, usePathname } from "next/navigation"
import { useEffect, useMemo, useReducer, useRef, useState } from "react"
import { CommunityTopbar } from "@/components/community-dashboard/CommunityTopbar"
import { CommunitySidebar } from "@/components/community-dashboard/CommunitySidebar"
// import { useCommunityBySlug } from "@/hooks/useCommunity"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useAuthData } from "@/components/auth/AuthProvider"
import { supabase } from "@/lib/supabase"
import LoadingOverlay from "@/components/ui/LoadingOverlay"

interface CommunityLayoutProps {
  children: React.ReactNode
}

export default function CommunityLayout({ children }: CommunityLayoutProps) {
  const { slug } = useParams<{ slug: string }>()
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuthData()
  type CommunityState = { id: string | null; name: string; icon: string | null; ownerId: string | null }
  type CommunityAction = { type: 'set'; payload: Partial<CommunityState> } | { type: 'icon'; payload: string }
  const [community, dispatchCommunity] = useReducer(
    (state: CommunityState, action: CommunityAction): CommunityState => {
      switch (action.type) {
        case 'set':
          return { ...state, ...action.payload }
        case 'icon':
          return { ...state, icon: action.payload }
        default:
          return state
      }
    },
    { id: null, name: "", icon: null, ownerId: null }
  )
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false)
  // 제거된 로컬 로딩 상태: Topbar가 사라지는 문제 방지
  const [guardChecked, setGuardChecked] = useState<boolean>(false)

  // 공개 상세(/[slug])에서는 커뮤니티 정보 요청을 생략하여 중복 네트워크 감소
  const shouldFetchCommunity = !!pathname && (
    pathname.includes('/dashboard') || pathname.includes('/classes') || pathname.includes('/calendar') ||
    pathname.includes('/members') || pathname.includes('/settings') || pathname.includes('/stats') || pathname.includes('/blog')
  )

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

      // /slug/stats
      if (secondLastSegment === String(slug) && lastSegment === 'stats') return 'stats'
      if (pathname.includes(`/${slug}/stats`)) return 'stats'
    }
    
    return 'home' // 기본값 (블로그나 기타 페이지)
  }

  const [active, setActive] = useState<"home" | "settings" | "classes" | "calendar" | "members" | "stats">(getActiveTab())

  useEffect(() => {
    setActive(getActiveTab())
  }, [pathname])

  // 커뮤니티 간략 정보: 필요한 필드만 조회(id, name, icon/image, owner_id)
  const communityBriefQ = useQuery({
    queryKey: ['community.brief', slug],
    queryFn: async () => {
      if (!shouldFetchCommunity) return null
      const { data } = await supabase
        .from('communities')
        .select('id,name,icon_url,image_url,owner_id')
        .eq('slug', String(slug))
        .maybeSingle()
      return data as any
    },
    enabled: !!slug && shouldFetchCommunity,
    staleTime: 120_000,
    refetchOnWindowFocus: false,
    select: (raw: any) => {
      if (!raw) return null
      return {
        id: raw?.id || null,
        name: raw?.name || String(slug),
        icon: raw?.icon_url || raw?.image_url || null,
        ownerId: raw?.owner_id || null,
      } as CommunityState
    }
  })
  useEffect(() => {
    const brief = communityBriefQ.data as CommunityState | null
    if (!brief) return
    dispatchCommunity({ type: 'set', payload: brief })
  }, [communityBriefQ.data])

  // 멤버십 가드: 커뮤니티 대시보드/내부 탭은 멤버 또는 오너만 접근 가능
  // 멤버십 체크를 React Query로 이전 (캐싱/재검증 자동화)
  const dashboardArea = useMemo(() => !!pathname && (
    pathname.includes('/dashboard') || pathname.includes('/classes') || pathname.includes('/calendar') ||
    pathname.includes('/members') || pathname.includes('/settings') || pathname.includes('/stats') || pathname.includes('/blog')
  ), [pathname])

  const membershipQ = useQuery({
    queryKey: ['membership', community.id, user?.id],
    queryFn: async () => {
      if (!community.id || !user?.id) return { ok: false as const }
      const { data } = await supabase
        .from('community_members')
        .select('role')
        .eq('community_id', community.id)
        .eq('user_id', user.id)
        .maybeSingle()
      const role = (data as any)?.role as string | undefined
      return { ok: !!data && role !== 'pending', role }
    },
    enabled: dashboardArea && !!community.id && !!user,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    if (!dashboardArea) { setGuardChecked(true); return }
    if (!pathname || !slug) return
    if (!community.id) return
    if (user && community.ownerId && user.id === community.ownerId) { setGuardChecked(true); return }
    if (!user) { router.replace(`/${slug}`); return }
    if (membershipQ.isLoading) return
    if (membershipQ.data?.ok) { setGuardChecked(true); return }
    router.replace(`/${slug}`)
  }, [dashboardArea, pathname, slug, community.id, community.ownerId, user, membershipQ.isLoading, membershipQ.data, router])

  useEffect(() => {
    const handler = (e: any) => {
      const url = e?.detail?.url as string | undefined
      if (url) dispatchCommunity({ type: 'icon', payload: url })
    }
    window.addEventListener('community-icon-updated', handler)
    return () => window.removeEventListener('community-icon-updated', handler)
  }, [])

  const handleTabChange = (newTab: typeof active) => {
    // 탭 변경 시 해당 경로로 이동 (전체 리로드 방지)
    switch (newTab) {
      case 'home':
        router.push(`/${slug}/dashboard`)
        break
      case 'classes':
        router.push(`/${slug}/classes`)
        break
      case 'calendar':
        router.push(`/${slug}/calendar`)
        break
      case 'members':
        router.push(`/${slug}/members`)
        break
      case 'settings':
        router.push(`/${slug}/settings`)
        break
      case 'stats':
        router.push(`/${slug}/stats`)
        break
    }
  }

  // 항상 Topbar를 렌더링하여 초기 로딩 시에도 상단 바가 보이도록 함

  // 커뮤니티 상세페이지(공개)와 대시보드 페이지 구분
  const isCommunityPublicPage = pathname === `/${slug}`
  const isCommunityDashboardPage = pathname?.includes('/dashboard') || 
    pathname?.includes('/classes') || pathname?.includes('/calendar') || 
    pathname?.includes('/members') || pathname?.includes('/settings') ||
    pathname?.includes('/stats') ||
    pathname?.includes('/blog')

  const isDashboardArea = pathname?.includes('/dashboard') || 
    pathname?.includes('/classes') || pathname?.includes('/calendar') || 
    pathname?.includes('/members') || pathname?.includes('/settings') ||
    pathname?.includes('/stats') || pathname?.includes('/blog')

  const isHomeDashboardPage = pathname === `/${slug}/dashboard`

  const [initialReady, setInitialReady] = useState<boolean>(false)
  const [hasShownHomeLoading, setHasShownHomeLoading] = useState<boolean>(false)
  const readyTimeoutRef = useRef<any>(null)

  // 대시보드 초기 데이터 준비 완료 이벤트 수신
  useEffect(() => {
    const onReady = () => setInitialReady(true)
    window.addEventListener('dashboard-initial-ready', onReady)
    return () => window.removeEventListener('dashboard-initial-ready', onReady)
  }, [])

  // 경로 변경 시 홈 대시보드에 진입하면 초기 준비 상태를 리셋
  useEffect(() => {
    if (isHomeDashboardPage) setInitialReady(false)
  }, [isHomeDashboardPage, pathname])

  // 가드 통과 후에도 준비 신호가 없으면 최대 대기 시간 후 자동 해제 (안전장치, 홈 대시보드 한정)
  useEffect(() => {
    if (!isHomeDashboardPage) return
    if (!guardChecked || !community.id) return
    if (initialReady) return
    if (readyTimeoutRef.current) clearTimeout(readyTimeoutRef.current)
    readyTimeoutRef.current = setTimeout(() => setInitialReady(true), 4000)
    return () => { if (readyTimeoutRef.current) clearTimeout(readyTimeoutRef.current) }
  }, [isHomeDashboardPage, guardChecked, community.id, initialReady])

  // 세션 내 1회 표시 정책: 세션 스토리지에서 플래그를 읽어 초기화
  useEffect(() => {
    if (!slug) return
    try {
      const key = `rooted:homeLoadingShown:${slug}`
      const val = typeof window !== 'undefined' ? window.sessionStorage.getItem(key) : null
      if (val === '1') setHasShownHomeLoading(true)
    } catch {}
  }, [slug])

  // 홈 대시보드 최초 1회 로딩 완료 후 재진입 시에는 로딩을 보여주지 않음 + 세션 저장
  useEffect(() => {
    if (!isHomeDashboardPage) return
    if (!guardChecked || !community.id) return
    if (!initialReady) return
    setHasShownHomeLoading(true)
    try { if (typeof window !== 'undefined') window.sessionStorage.setItem(`rooted:homeLoadingShown:${slug}`, '1') } catch {}
  }, [isHomeDashboardPage, guardChecked, community.id, initialReady, slug])

  const showBlockingLoading = isHomeDashboardPage && !hasShownHomeLoading && (communityBriefQ.isLoading || !guardChecked || !community.id || !initialReady)

  return (
    <div className="min-h-screen">
      {/* 커뮤니티 대시보드 페이지에서만 CommunityTopbar 표시 */}
      {isCommunityDashboardPage && guardChecked && (
        <CommunityTopbar 
          slug={String(slug)} 
          name={community.name} 
          active={active} 
          onChangeAction={handleTabChange} 
          imageUrl={community.icon || undefined}
          ownerId={community.ownerId}
          communityId={community.id}
          onToggleSidebar={() => {
            // 대시보드가 아니면 레이아웃 레벨에서 모바일 사이드바 오버레이 토글
            if (!pathname?.includes('/dashboard')) {
              setIsMobileSidebarOpen(prev => !prev)
              return
            }
            // 대시보드 홈은 페이지 내부 사이드바 토글 이벤트로 제어
            const event = new CustomEvent('toggle-community-sidebar')
            window.dispatchEvent(event)
          }}
        />
      )}
      {/* 비-대시보드 탭에서도 모바일 사이드바 오버레이 제공 (데스크톱에서는 숨김) */}
      {isCommunityDashboardPage && guardChecked && !pathname?.includes('/dashboard') && community.id && (
        <CommunitySidebar
          communityId={community.id}
          ownerId={community.ownerId}
          active={{ type: 'home' }}
          onSelectHome={() => { router.push(`/${slug}/dashboard`); setIsMobileSidebarOpen(false) }}
          onSelectFeed={() => { router.push(`/${slug}/dashboard`); setIsMobileSidebarOpen(false) }}
          onSelectPage={() => { router.push(`/${slug}/dashboard`); setIsMobileSidebarOpen(false) }}
          isOpen={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
          hideDesktop
          communityName={community.name}
          communityIconUrl={community.icon}
        />
      )}
      {/* 대시보드 영역은 가드 완료 후 렌더 */}
      {(!isCommunityDashboardPage || guardChecked) && (
        // 대시보드 홈(/dashboard)은 자체적으로 pt/pb 적용되어 있음
        // 그 외 커뮤니티 내부 탭(/classes, /calendar, /members, /settings, /stats, /blog 등)은
        // 고정 모바일 헤더/바텀 내비게이션으로 인한 잘림 방지를 위해 모바일에서만 여백을 추가
        isCommunityDashboardPage && !pathname?.includes('/dashboard')
          ? (<div className="md:pt-0 pt-15 pb-20">{children}</div>)
          : children
      )}
      <LoadingOverlay show={showBlockingLoading} text="커뮤니티 입장 중.." />
    </div>
  )
}
