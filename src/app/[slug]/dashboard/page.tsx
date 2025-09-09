"use client"

import { useParams, useSearchParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { CommunityTopbar } from "@/components/community-dashboard/CommunityTopbar"
import { CommunitySidebar } from "@/components/community-dashboard/CommunitySidebar"
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
import { useAuthData } from "@/components/auth/AuthProvider"

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

  const communityQ = useCommunityBySlug(String(slug))
  useEffect(() => {
    const data = communityQ.data as any
    setLoading(communityQ.isLoading)
    if (!data) return
    setCommunityId(data.id)
    setCommunityName(data.name || String(slug))
    setCommunityIcon(data?.image_url || null)
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
    if (["home","settings","classes","calendar","members"].includes(tab)) {
      setActive(tab)
    }
    if (tab === 'home' && pageId) {
      setActiveHome({ type: 'page', id: pageId })
    }
  }, [communityQ.data, communityQ.isLoading, slug, searchParams, user])

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
    <div className="min-h-screen md:pt-0 pt-0 pb-20">
      <div className="flex">
        {/* 좌측 대시보드 사이드바는 홈 뷰에서만 표시 */}
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
          />
        )}

        <main className={`flex-1 px-3 md:px-6 lg:px-10 xl:px-16 ${active === 'home' ? 'pt-2 pb-3 md:pt-2 md:pb-6' : 'py-3 md:py-6'} relative`}>
          {/* 배경 효과: 캘린더/멤버 탭에서만 */}
          {(active === 'calendar' || active === 'members') && <AnimatedBackground />}

          {loading || authChecking || !communityId || !authorized ? (
            <div className="grid gap-4 md:grid-cols-3 relative z-10">
              <div className="md:col-span-2 space-y-4">
                <div className="h-24 bg-slate-100 rounded-xl animate-pulse" />
                <div className="h-40 bg-slate-100 rounded-xl animate-pulse" />
                <div className="h-28 bg-slate-100 rounded-xl animate-pulse" />
              </div>
              <div className="space-y-4">
                <div className="h-40 bg-slate-100 rounded-xl animate-pulse" />
              </div>
            </div>
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
  )
}

