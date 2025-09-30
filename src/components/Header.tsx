'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuthData } from './auth/AuthProvider'
import { getAvatarUrl } from "@/lib/utils"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Bell, LogIn, Menu, ChevronDown, Compass, Sparkles, CreditCard } from "lucide-react"

export function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, profile, unreadCount, loading, myCommunities } = useAuthData()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showCommunityDropdown, setShowCommunityDropdown] = useState(false)
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const desktopDropdownRef = useRef<HTMLDivElement | null>(null)
  const [hideOnScroll, setHideOnScroll] = useState(false)
  const lastYRef = useRef(0)
  const tickingRef = useRef(false)

  const firstSegment = pathname?.split('/').filter(Boolean)[0] || ''
  const topLevelRoutes = new Set(['', 'explore', 'features', 'pricing', 'create', 'login', 'signup', 'dashboard', 'messages', 'notifications', 'api'])
  const isAuthRoute = pathname === '/login' || pathname === '/signup'

  // 커뮤니티 대시보드 및 내부 탭에서는 전용 헤더를 사용하므로 글로벌 헤더 숨김
  const isCommunityDashboardPage = firstSegment && !topLevelRoutes.has(firstSegment) && 
    (pathname?.includes('/dashboard') || pathname?.includes('/blog') || pathname?.includes('/classes') || 
     pathname?.includes('/calendar') || pathname?.includes('/members') || pathname?.includes('/settings') || pathname?.includes('/stats'))
  // 커뮤니티 상세 루트 페이지(/[slug])에서는 중앙 메뉴 캡슐을 비표시 (데스크탑 전용)
  const isCommunityRootPage = firstSegment && !topLevelRoutes.has(firstSegment) && !isCommunityDashboardPage

  const isActive = (href: string) => pathname === href
  // 특정 페이지에서는 캡슐을 화이트 톤으로 전환
  const useWhiteCapsule = pathname === '/explore' || pathname === '/features' || pathname === '/pricing' || pathname === '/dashboard' || pathname === '/create' || pathname === '/notifications' || isCommunityRootPage
  const gradientBg = 'linear-gradient(135deg, #f8fafc 0%, #e5e7eb 20%, #cbd5e1 50%, #f1f5f9 75%, #d1d5db 100%)'
  const capsuleStyle = useWhiteCapsule ? { backgroundColor: '#ffffff' } : { background: gradientBg }

  // 스크롤 방향에 따라 헤더를 부드럽게 숨김/표시 (Hooks는 조건부 호출 금지 - early return 이전에 선언)
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || 0
      const last = lastYRef.current
      if (tickingRef.current) return
      tickingRef.current = true
      requestAnimationFrame(() => {
        const delta = y - last
        const threshold = 8
        if ((showCommunityDropdown || showProfileDropdown || mobileOpen)) {
          setHideOnScroll(false)
        } else {
          if (delta > threshold && y > 60) setHideOnScroll(true)
          else if (delta < -threshold) setHideOnScroll(false)
        }
        lastYRef.current = y
        tickingRef.current = false
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [showCommunityDropdown, showProfileDropdown, mobileOpen])

  if (isAuthRoute || isCommunityDashboardPage) return null

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white md:bg-transparent transition-transform duration-300" style={{ transform: hideOnScroll ? 'translateY(-100%)' : 'translateY(0)' }}>
      {/* 외부 클릭으로 데스크탑 드롭다운 닫기 */}
      {(showCommunityDropdown || showProfileDropdown) && (
        <div
          className="hidden md:block fixed inset-0 z-40"
          onClick={() => { setShowCommunityDropdown(false); setShowProfileDropdown(false) }}
          aria-hidden
        />
      )}
      <div className="mx-auto max-w-7xl px-4 lg:px-6">
        <div className="h-12 md:h-20 grid grid-cols-3 items-center md:flex md:justify-between">
          {/* 좌측: 로고 (Desktop 캡슐) */}
          <Link href="/" className="hidden md:flex items-center hover:opacity-95">
            <span
              className="inline-flex items-center gap-2 rounded-xl border px-6 py-3 h-12 transition-transform duration-200 hover:-translate-y-0.5 shadow-[0_0_14px_rgba(148,163,184,0.28)] hover:shadow-[0_0_20px_rgba(148,163,184,0.4)] border-slate-300"
              style={capsuleStyle}
            >
              <Image src="/logos/logo_icon.png" alt="Rooted 아이콘" width={28} height={28} className="w-7 h-7" priority />
              <span className="relative" style={{ width: 80, height: 20 }}>
                <Image src="/logos/logo_main.png" alt="Rooted" fill priority sizes="100px" className="object-contain" />
              </span>
            </span>
          </Link>

          {/* 모바일: 좌측 영역 */}
          {isCommunityRootPage ? (
            // 커뮤니티 상세 페이지에서는 메뉴 버튼 제거, Rooted 아이콘만 배치
            <div className="md:hidden flex items-center">
              <Link href="/" className="flex items-center">
                <Image src="/logos/logo_icon.png" alt="Rooted" width={28} height={28} className="w-7 h-7" priority />
              </Link>
            </div>
          ) : (
            <div className="md:hidden flex items-center gap-2">
              <button
                onClick={() => setMobileOpen(v => !v)}
                className="w-9 h-9 grid place-items-center text-slate-900 active:scale-[0.98]"
                aria-label="모바일 메뉴"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
          )}

          {/* 모바일 중앙 로고 (커뮤니티 상세 페이지에서는 제거하고, 그 자리를 스페이서로 유지) */}
          {!isCommunityRootPage ? (
            <div className="md:hidden flex items-center justify-center">
              <Link href="/" className="flex items-center">
                <Image src="/logos/logo_icon.png" alt="Rooted" width={28} height={28} className="w-7 h-7" priority />
                <span className="relative ml-1" style={{ width: 100, height: 20 }}>
                  <Image src="/logos/logo_main.png" alt="Rooted" fill priority sizes="100px" className="object-contain" />
                </span>
              </Link>
            </div>
          ) : (
            <div className="md:hidden" />
          )}

          {/* 중앙: 메뉴 (커뮤니티 상세 루트 페이지에서는 데스크탑에서 숨김) */}
          {!isCommunityRootPage && (
          <nav className="hidden md:flex items-center">
            <div
              className="h-12 px-6 rounded-xl text-slate-900 border border-slate-300 shadow-[0_0_14px_rgba(148,163,184,0.28)] hover:shadow-[0_0_20px_rgba(148,163,184,0.4)] flex items-center"
              style={capsuleStyle}
            >
              <ul className="flex items-center gap-3 text-base">
                <li>
                  <Link
                    href="/explore"
                    className={`px-3 py-1 rounded-lg inline-block transition-colors duration-200 transform transition-transform ${isActive('/explore') ? 'text-slate-900 font-bold scale-[1.05]' : 'text-slate-900 hover:text-slate-900'} hover:scale-103`}
                  >
                    루트 둘러보기
                  </Link>
                </li>
                <li aria-hidden className="h-5 w-px bg-slate-300/70" />
                <li>
                  <Link
                    href="/features"
                    className={`px-3 py-1 rounded-lg inline-block transition-colors duration-200 transform transition-transform ${isActive('/features') ? 'text-slate-900 font-bold scale-[1.05]' : 'text-slate-900 hover:text-slate-900'} hover:scale-103`}
                  >
                    서비스
                  </Link>
                </li>
                <li aria-hidden className="h-5 w-px bg-slate-300/70" />
                <li>
                  <Link
                    href="/pricing"
                    className={`px-3 py-1 rounded-lg inline-block transition-colors duration-200 transform transition-transform ${isActive('/pricing') ? 'text-slate-900 font-bold scale-[1.05]' : 'text-slate-900 hover:text-slate-900'} hover:scale-103`}
                  >
                    요금제
                  </Link>
                </li>
              </ul>
            </div>
          </nav>
          )}

          {/* 우측: 알림+루트+프로필 통합 캡슐 */}
          <div className="hidden md:flex items-center">
            <div
              className="relative inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 h-12 shadow-[0_0_14px_rgba(148,163,184,0.28)] hover:shadow-[0_0_20px_rgba(148,163,184,0.4)]"
              style={capsuleStyle}
              ref={desktopDropdownRef}
            >
              {user && (
                <Link href="/notifications" className="relative p-2 rounded-full hover:bg-white/50 transition-colors cursor-pointer">
                  <Bell className="w-5 h-5 text-slate-900" />
                  {unreadCount > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-red-500" />}
                </Link>
              )}
              {user && <div className="h-6 w-px bg-slate-300/70" />}
              {user && (
                <>
                  <button
                    onClick={() => { setShowCommunityDropdown(v => !v); setShowProfileDropdown(false) }}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full hover:bg-white/50 transition-colors cursor-pointer"
                    aria-haspopup="menu"
                    aria-expanded={showCommunityDropdown}
                    title="내 커뮤니티로 이동"
                  >
                    <span className="text-sm text-slate-900">My 루트</span>
                    <ChevronDown className="w-4 h-4 text-slate-600" />
                  </button>
                  {showCommunityDropdown && (
                    <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-lg z-50">
                      <div className="p-3">
                        <div className="text-xs text-slate-500 mb-2">나의 루트</div>
                        <div className="space-y-1 max-h-64 overflow-y-auto">
                          {myCommunities.map((community) => (
                            <Link
                              key={community.id}
                              href={`/${community.communities?.slug}/dashboard`}
                              className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors"
                              onClick={() => setShowCommunityDropdown(false)}
                            >
                              <div className="w-8 h-8 rounded-md overflow-hidden bg-slate-100">
                                {(community.communities as any)?.icon_url || community.communities?.image_url ? (
                                  <Image src={(community.communities as any).icon_url || (community.communities as any).image_url} alt="icon" width={32} height={32} className="object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-slate-900 text-white flex items-center justify-center">
                                    <span className="text-xs font-medium">{community.communities?.name?.[0]}</span>
                                  </div>
                                )}
                              </div>
                              <span className="text-sm font-medium text-slate-700 truncate">{community.communities?.name}</span>
                            </Link>
                          ))}
                        </div>
                        <div className="pt-3">
                          <Link
                            href="/explore"
                            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-black text-white px-3 py-2 text-sm font-semibold hover:bg-black/90 transition-colors"
                            onClick={() => setShowCommunityDropdown(false)}
                          >
                            다른 커뮤니티 둘러보기
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
              {user && <div className="h-6 w-px bg-slate-300/70" />}
              {loading ? (
                <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse" />
              ) : user ? (
                <button
                  onClick={() => { setShowProfileDropdown(v => !v); setShowCommunityDropdown(false) }}
                  className="flex items-center gap-2 px-1.5 py-1 rounded-full hover:bg-white/50 transition-colors cursor-pointer"
                  aria-haspopup="menu"
                  aria-expanded={showProfileDropdown}
                  title="프로필 옵션"
                >
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={getAvatarUrl(profile?.avatar_url, profile?.updated_at)} alt="프로필 이미지" />
                    <AvatarFallback className="text-xs">
                      {profile?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:block text-sm text-slate-900 max-w-[160px] truncate">{profile?.full_name || '사용자'}</span>
                </button>
              ) : (
                <Link href={`/login?next=${encodeURIComponent(pathname || '/')}`} className="inline-flex items-center gap-2 px-3 py-2 rounded-full hover:bg-white/50 transition-colors text-slate-900">
                  <LogIn className="w-4 h-4" />
                  <span className="text-sm">로그인</span>
                </Link>
              )}
              {showProfileDropdown && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg z-50">
                  <div className="p-2">
                    <button
                      className="w-full px-3 py-2 rounded-lg hover:bg-slate-50 text-sm text-center cursor-pointer"
                      onClick={() => { setShowProfileDropdown(false); router.push('/dashboard') }}
                    >
                      프로필 페이지 이동
                    </button>
                    <button
                      className="w-full px-3 py-2 rounded-lg hover:bg-red-50 text-sm text-center text-red-600 cursor-pointer"
                      onClick={async () => {
                        try { await supabase.auth.signOut() } catch {}
                        try { await fetch('/api/auth/clear', { method: 'POST' }) } catch {}
                        setShowProfileDropdown(false)
                        router.push('/login')
                      }}
                    >
                      로그아웃
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 모바일 우측: 알림 + 아바타/로그인 (항상 우측 정렬 유지) */}
          <div className="md:hidden flex items-center gap-2 justify-end ml-auto">
            {user && (
              <Link href="/notifications" className="w-9 h-9 grid place-items-center text-slate-900">
                <Bell className="w-6 h-6" />
              </Link>
            )}
            {loading ? (
              <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse" />
            ) : user ? (
              <>
                <button
                  onClick={() => setShowCommunityDropdown(v => !v)}
                  className="w-9 h-9 grid place-items-center text-slate-900"
                  aria-haspopup="menu"
                  aria-expanded={showCommunityDropdown}
                  title="내 커뮤니티"
                >
                  <Avatar className="w-9 h-9">
                    <AvatarImage src={getAvatarUrl(profile?.avatar_url, profile?.updated_at)} alt="프로필" />
                    <AvatarFallback className="text-xs">?</AvatarFallback>
                  </Avatar>
                </button>
                {showCommunityDropdown && (
                  <div className="fixed top-12 right-2 z-50 w-64 bg-white border border-slate-200 rounded-xl shadow-xl">
                    <div className="p-3">
                      <div className="text-xs text-slate-500 mb-2">나의 커뮤니티</div>
                      <div className="space-y-1 max-h-64 overflow-y-auto">
                        {myCommunities.map((community) => (
                          <Link
                            key={community.id}
                            href={`/${community.communities?.slug}/dashboard`}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors"
                            onClick={() => setShowCommunityDropdown(false)}
                          >
                            <div className="w-8 h-8 rounded-md overflow-hidden bg-slate-100">
                              {(community.communities as any)?.icon_url || community.communities?.image_url ? (
                                <Image src={(community.communities as any).icon_url || (community.communities as any).image_url} alt="icon" width={32} height={32} className="object-cover" />
                              ) : (
                                <div className="w-full h-full bg-slate-900 text-white flex items-center justify-center">
                                  <span className="text-xs font-medium">{community.communities?.name?.[0]}</span>
                                </div>
                              )}
                            </div>
                            <span className="text-sm font-medium text-slate-700 truncate">{community.communities?.name}</span>
                          </Link>
                        ))}
                      </div>
                      <div className="pt-3 space-y-2">
                        <Link
                          href="/explore"
                          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-black text-white px-3 py-2 text-sm font-semibold hover:bg-black/90 transition-colors"
                          onClick={() => setShowCommunityDropdown(false)}
                        >
                          다른 커뮤니티 둘러보기
                        </Link>
                        <Link
                          href="/dashboard"
                          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-white text-slate-900 border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50 transition-colors"
                          onClick={() => setShowCommunityDropdown(false)}
                        >
                          프로필 페이지 이동
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <Link href={`/login?next=${encodeURIComponent(pathname || '/')}`} className="w-9 h-9 grid place-items-center text-slate-900">
                <LogIn className="w-5 h-5" />
              </Link>
            )}
          </div>
        </div>
      </div>
      {/* 모바일 드롭 메뉴 */}
      {mobileOpen && <div onClick={() => setMobileOpen(false)} className="md:hidden fixed inset-0 z-30 bg-black/30" />}
      <div className={`md:hidden fixed left-0 right-0 top-12 z-40 transition-transform duration-300 ${mobileOpen ? 'translate-y-0 opacity-100' : '-translate-y-3 opacity-0 pointer-events-none'}`}>
        <div className="mx-4 rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          <ul className="divide-y divide-slate-100">
            <li>
              <Link href="/explore" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-5 py-4 text-slate-800 font-semibold">
                <Compass className="w-5 h-5 text-slate-500" />
                루트 둘러보기
              </Link>
            </li>
            <li>
              <Link href="/features" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-5 py-4 text-slate-800 font-semibold">
                <Sparkles className="w-5 h-5 text-slate-500" />
                서비스 소개
              </Link>
            </li>
            <li>
              <Link href="/pricing" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-5 py-4 text-slate-800 font-semibold">
                <CreditCard className="w-5 h-5 text-slate-500" />
                요금제
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </header>
  )
}