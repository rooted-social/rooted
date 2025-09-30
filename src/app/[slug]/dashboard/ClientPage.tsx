"use client"

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CommunityProvider } from '@/components/community-dashboard/CommunityContext'
import { CommunitySidebar } from '@/components/community-dashboard/CommunitySidebar'
import { HomeTab } from '@/components/community-dashboard/HomeTab'
import { BoardTab } from '@/components/community-dashboard/BoardTab'
import { SettingsTab } from '@/components/community-dashboard/SettingsTab'
import { MembersTab } from '@/components/community-dashboard/MembersTab'
import CalendarPage from '@/components/community-dashboard/pages/CalendarPage'
import ClassesPage from '@/components/community-dashboard/pages/ClassesPage'
import dynamic from 'next/dynamic'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ChevronRight, Palette, BookText, Check } from 'lucide-react'
import { getReadableTextColor } from '@/utils/color'
import { upsertCommunitySettings } from '@/lib/communities'

const AnimatedBackground = dynamic(() => import('@/components/AnimatedBackground'), { ssr: false })

type ViewKey = 'home' | 'settings' | 'classes' | 'calendar' | 'members'

export default function ClientDashboardPage({ slug, initial }: { slug: string; initial: any }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [active, setActive] = useState<ViewKey>('home')
  const [activeHome, setActiveHome] = useState<{ type: 'home' } | { type: 'feed' } | { type: 'page'; id: string }>({ type: 'home' })
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false)
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false)
  const [brandColor, setBrandColor] = useState<string | null>(initial?.home?.settings?.brand_color || null)

  const communityId = initial?.community?.id || null
  const communityName = initial?.community?.name || slug
  const communityIcon = initial?.community?.icon_url || initial?.community?.image_url || null
  const ownerId = initial?.community?.owner_id || null

  useEffect(() => {
    const tab = (searchParams?.get('tab') as ViewKey) || 'home'
    const pageId = searchParams?.get('pageId')
    const onboarding = searchParams?.get('onboarding')
    if (["home","settings","classes","calendar","members"].includes(tab)) setActive(tab)
    if (tab === 'home' && pageId) setActiveHome({ type: 'page', id: pageId })
    if (onboarding === '1') setShowOnboarding(true)
  }, [searchParams])

  // 사이드바 openSidebar 쿼리 처리
  useEffect(() => {
    const open = searchParams.get('openSidebar')
    if (open === '1') {
      setIsSidebarOpen(true)
      try {
        const url = new URL(window.location.href)
        url.searchParams.delete('openSidebar')
        window.history.replaceState({}, '', url.toString())
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 브랜드 컬러 라이브 업데이트
  useEffect(() => {
    const handler = (e: any) => setBrandColor(e?.detail?.color ?? null)
    window.addEventListener('brand-color-updated', handler as any)
    return () => window.removeEventListener('brand-color-updated', handler as any)
  }, [])

  return (
    <CommunityProvider value={{ brandColor }}>
      <div className="min-h-screen md:pt-0 pt-15 pb-20 overflow-x-hidden">
        <div className="flex w-full">
          {active === 'home' && communityId && (
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
              initialPages={initial?.pages as any}
            />
          )}

          <main className={`flex-1 min-w-0 px-3 md:px-6 lg:px-10 xl:px-16 ${active === 'home' ? 'pt-2 pb-3 md:pt-2 md:pb-6' : 'py-3 md:py-6'} relative overflow-x-hidden` }>
            {(active === 'calendar' || active === 'members') && <AnimatedBackground />}
            <div className="relative z-10 max-w-full overflow-x-hidden">
              {active === 'home' && (
                activeHome.type === 'home' ? (
                  <HomeTab communityId={communityId} slug={slug} initial={initial?.home} />
                ) : activeHome.type === 'feed' ? (
                  <BoardTab communityId={communityId} ownerId={ownerId} variant="contentOnly" />
                ) : (
                  <></>
                )
              )}
              {active === 'settings' && communityId && <SettingsTab communityId={communityId} />}
              {active === 'classes' && communityId && <ClassesPage communityId={communityId} ownerId={ownerId as any} />}
              {active === 'calendar' && communityId && <CalendarPage communityId={communityId as any} />}
              {active === 'members' && communityId && <MembersTab communityId={communityId as any} ownerId={ownerId} />}
            </div>
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
                    router.push(`/${slug}/settings`)
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
    </CommunityProvider>
  )
}


