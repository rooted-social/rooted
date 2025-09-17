"use client"

import { useParams, useSearchParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { CommunityTopbar } from "@/components/community-dashboard/CommunityTopbar"
import { CommunitySidebar } from "@/components/community-dashboard/CommunitySidebar"
import { CommunityProvider } from "@/components/community-dashboard/CommunityContext"
import { PageContent } from "@/components/community-dashboard/PageContent"
import { HomeTab } from "@/components/community-dashboard/HomeTab"
import { BoardTab } from "@/components/community-dashboard/BoardTab"
import { SettingsTab } from "@/components/community-dashboard/SettingsTab"
import { MembersTab } from "@/components/community-dashboard/MembersTab"
import { getCommunity } from "@/lib/communities"
import { useCommunityBySlug } from "@/hooks/useCommunity"
import CalendarPage from "@/components/community-dashboard/pages/CalendarPage"
import ClassesPage from "@/components/community-dashboard/pages/ClassesPage"
import AnimatedBackground from "@/components/AnimatedBackground"
import { Loader2, Palette, ChevronRight, BookText, Check } from "lucide-react"
import { useAuthData } from "@/components/auth/AuthProvider"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { getCommunitySettings, upsertCommunitySettings } from "@/lib/communities"
import { getReadableTextColor } from "@/utils/color"

type ViewKey = 'home' | 'settings' | 'classes' | 'calendar' | 'members'

export default function CommunityDashboardPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const { user } = useAuthData()
  const [active, setActive] = useState<ViewKey>('home')
  const [activeHome, setActiveHome] = useState<{ type: 'home' } | { type: 'feed' } | { type: 'page'; id: string }>({ type: 'home' })
  const [communityId, setCommunityId] = useState<string | null>(null)
  const [communityName, setCommunityName] = useState<string>("")
  const [communityIcon, setCommunityIcon] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [authChecking, setAuthChecking] = useState<boolean>(true)
  const [authorized, setAuthorized] = useState<boolean>(false)
  const [ownerId, setOwnerId] = useState<string | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false)
  const searchParams = useSearchParams()
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false)
  const [brandColor, setBrandColor] = useState<string | null>(null)

  const communityQ = useCommunityBySlug(String(slug))
  useEffect(() => {
    const data = communityQ.data as any
    setLoading(communityQ.isLoading)
    if (!data) return
    setCommunityId(data.id)
    setCommunityName(data.name || String(slug))
    setCommunityIcon((data as any)?.icon_url || data?.image_url || null)
    setAuthChecking(true)
    setOwnerId(data?.owner_id || null)
    if (user && user.id === data?.owner_id) {
      setAuthorized(true)
    } else {
      setAuthorized(true)
    }
    setAuthChecking(false)
    const tab = (searchParams?.get('tab') as ViewKey) || 'home'
    const pageId = searchParams?.get('pageId')
    const onboarding = searchParams?.get('onboarding')
    if (["home","settings","classes","calendar","members"].includes(tab)) {
      setActive(tab)
    }
    if (tab === 'home' && pageId) {
      setActiveHome({ type: 'page', id: pageId })
    }
    // 온보딩 플래그가 있으면 최초 진입 시 표시
    if (onboarding === '1') {
      setShowOnboarding(true)
    }
  }, [communityQ.data, communityQ.isLoading, slug, searchParams, user])

  // 브랜드 컬러 로드
  useEffect(() => {
    const id = communityId
    if (!id) return
    ;(async () => {
      try {
        const s = await getCommunitySettings(id)
        setBrandColor((s as any)?.brand_color || null)
      } catch {}
    })()
  }, [communityId])

  // 다른 컴포넌트에서 컬러가 갱신되면 즉시 반영
  useEffect(() => {
    const handler = (e: any) => {
      const c = e?.detail?.color ?? null
      setBrandColor(c)
    }
    window.addEventListener('brand-color-updated', handler as any)
    return () => window.removeEventListener('brand-color-updated', handler as any)
  }, [])

  // 최초 진입 시 쿼리 파라미터로 사이드바 열기 지원
  useEffect(() => {
    const open = searchParams.get('openSidebar')
    if (open === '1') {
      setIsSidebarOpen(true)
      // 히스토리 정리로 파라미터 제거 (뒤로가기 UX 보완)
      try {
        const url = new URL(window.location.href)
        url.searchParams.delete('openSidebar')
        window.history.replaceState({}, '', url.toString())
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 사이드바 토글 이벤트 리스너
  useEffect(() => {
    const handleToggleSidebar = () => {
      setIsSidebarOpen(prev => !prev)
    }
    // 같은 리스너가 중복 등록되지 않도록 방지
    window.removeEventListener('toggle-community-sidebar', handleToggleSidebar)
    window.addEventListener('toggle-community-sidebar', handleToggleSidebar)
    return () => {
      window.removeEventListener('toggle-community-sidebar', handleToggleSidebar)
    }
  }, [])

  return (
    <>
    <div className="min-h-screen md:pt-0 pt-15 pb-20">
      <div className="flex">
        {/* 좌측 대시보드 사이드바는 홈 뷰에서만 표시 */}
        {active === 'home' && communityId && (
          <CommunityProvider value={{ brandColor }}>
            <CommunitySidebar
              communityId={communityId}
              ownerId={ownerId}
              active={activeHome}
              onSelectHome={() => setActiveHome({ type: 'home' })}
              onSelectFeed={() => setActiveHome({ type: 'feed' })}
              onSelectPage={(id) => setActiveHome({ type: 'page', id })}
              isOpen={isSidebarOpen}
              onClose={() => setIsSidebarOpen(false)}
              communityName={communityName}
              communityIconUrl={communityIcon}
            />
          </CommunityProvider>
        )}

        <main className={`flex-1 px-3 md:px-6 lg:px-10 xl:px-16 ${active === 'home' ? 'pt-2 pb-3 md:pt-2 md:pb-6' : 'py-3 md:py-6'} relative`}>
          {/* 배경 효과: 캘린더/멤버 탭에서만 */}
          {(active === 'calendar' || active === 'members') && <AnimatedBackground />}

          {loading || authChecking || !communityId || !authorized ? (
            <>
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm">
                <div className="flex items-center gap-3 rounded-2xl bg-white/90 border border-slate-200 px-4 py-3 shadow-sm">
                  <Loader2 className="w-5 h-5 animate-spin text-slate-700" />
                  <span className="text-sm font-medium text-slate-700">로딩 중...</span>
                </div>
              </div>
            </>
          ) : (
            <div className="relative z-10">
              {active === 'home' && (
                activeHome.type === 'home' ? (
                  <HomeTab communityId={communityId} slug={String(slug)} />
                ) : activeHome.type === 'feed' ? (
                  <BoardTab communityId={communityId} ownerId={ownerId} variant="contentOnly" />
                ) : (
                  <PageContent pageId={activeHome.id} />
                )
              )}
              {active === 'settings' && <SettingsTab communityId={communityId} />}
              {active === 'classes' && communityId && (
                <ClassesPage communityId={communityId} ownerId={ownerId as any} />
              )}
              {active === 'calendar' && communityId && (
                <CalendarPage communityId={communityId as any} />
              )}
              {active === 'members' && <MembersTab communityId={communityId as any} ownerId={ownerId} />}
            </div>
          )}
        </main>
      </div>
    </div>

    {/* 온보딩 다이얼로그 */}
    <Dialog open={showOnboarding} onOpenChange={setShowOnboarding}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-xl">빠른 시작 가이드</DialogTitle>
          <DialogDescription>브랜드 컬러를 정하고, 핵심 페이지 설정을 마무리해보세요.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          {/* 1. 브랜드 컬러 설정 */}
          <div className="rounded-2xl border border-slate-200/80 bg-white/60 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-100">
                <Palette className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">브랜드 컬러 설정</span>
              </div>
              <div className="ml-auto hidden sm:flex items-center gap-2 text-xs text-slate-500">
                <span>현재 색상</span>
                <span className="h-6 px-2 rounded-md border bg-white inline-flex items-center" style={{ backgroundColor: brandColor || '#ffffff', color: getReadableTextColor(brandColor || '#ffffff') }}>
                  {brandColor || '없음'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {['#111827','#ef4444','#f59e0b','#10b981','#3b82f6','#6366f1','#a855f7'].map(c => (
                <button
                  key={c}
                  onClick={async ()=>{
                    if (!communityId) return
                    try { await upsertCommunitySettings(communityId, { brand_color: c }); setBrandColor(c) } catch {}
                  }}
                  className={`relative h-9 w-9 rounded-full border shadow-sm cursor-pointer transition-transform hover:-translate-y-0.5 ${brandColor===c ? 'ring-2 ring-offset-2 ring-slate-300 scale-105' : ''}`}
                  style={{ backgroundColor: c }}
                  title={c}
                  aria-label={`브랜드 컬러 ${c}`}
                >
                  {brandColor===c && (
                    <span className="absolute inset-0 grid place-items-center text-white/95">
                      <Check className="w-4 h-4" />
                    </span>
                  )}
                </button>
              ))}
              <div className="sm:hidden ml-1 text-[11px] text-slate-500">{brandColor || '색상 선택'}</div>
            </div>
          </div>

          {/* 2. 단계별 안내 */}
          <div className="rounded-2xl border border-slate-200/80 bg-white/60 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-200">
                <BookText className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Step-by-step 가이드</span>
              </div>
            </div>
            <div className="space-y-2.5 text-sm text-slate-700">
              {["사이드바에서 페이지를 추가하거나 피드에 첫 글을 작성해보세요.",
                "설정 페이지에서 커뮤니티 소개, 배너 이미지, 서비스 연결 등 상세 설정을 마무리합니다.",
                "대시보드 홈의 위젯을 통해 최근 활동을 확인하세요."]
                .map((t, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white text-[11px] font-semibold">{i+1}</span>
                    <span className="leading-relaxed">{t}</span>
                  </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Button variant="outline" className="cursor-pointer" onClick={() => setShowOnboarding(false)}>나중에</Button>
              <Button
                className="cursor-pointer"
                onClick={() => {
                  setShowOnboarding(false)
                  router.push(`/${slug}/dashboard?tab=settings`)
                }}
              >
                설정으로 이동
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <div className="text-xs text-slate-500">이 가이드는 설정이 완료될 때까지 가끔 표시될 수 있어요.</div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}

