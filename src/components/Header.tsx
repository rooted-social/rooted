'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuthData } from './auth/AuthProvider'
import { getAvatarUrl } from "@/lib/utils"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell, LogIn, Menu } from "lucide-react"

export function Header() {
  const pathname = usePathname()
  const { user, profile, unreadCount, loading } = useAuthData()
  const [mobileOpen, setMobileOpen] = useState(false)

  const firstSegment = pathname?.split('/').filter(Boolean)[0] || ''
  const topLevelRoutes = new Set(['', 'explore', 'features', 'pricing', 'create', 'login', 'signup', 'dashboard', 'messages', 'notifications', 'api'])
  const isAuthRoute = pathname === '/login' || pathname === '/signup'

  // 커뮤니티 대시보드 및 내부 탭에서는 전용 헤더를 사용하므로 글로벌 헤더 숨김
  const isCommunityDashboardPage = firstSegment && !topLevelRoutes.has(firstSegment) && 
    (pathname?.includes('/dashboard') || pathname?.includes('/blog') || pathname?.includes('/classes') || 
     pathname?.includes('/calendar') || pathname?.includes('/members') || pathname?.includes('/settings'))

  if (isAuthRoute || isCommunityDashboardPage) return null

  const isActive = (href: string) => pathname === href

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white md:bg-transparent">
      <div className="mx-auto max-w-7xl px-4 lg:px-6">
        <div className="h-12 md:h-20 grid grid-cols-3 items-center md:flex md:justify-between">
          {/* 좌측: 로고 (Desktop 캡슐) */}
          <Link href="/" className="hidden md:flex items-center hover:opacity-95">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white px-6 py-3 h-12 shadow-md transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg">
              <img src="/logos/logo_icon.png" alt="Rooted 아이콘" className="w-7 h-7" />
              <img src="/logos/logo_main.png" alt="Rooted" className="h-5" />
            </span>
          </Link>

          {/* 모바일: 메뉴 아이콘(좌측) + 로고 */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => setMobileOpen(v => !v)}
              className="w-9 h-9 grid place-items-center text-slate-900 active:scale-[0.98]"
              aria-label="모바일 메뉴"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>

          {/* 모바일 중앙 로고 */}
          <div className="md:hidden flex items-center justify-center">
            <Link href="/" className="flex items-center">
              <img src="/logos/logo_icon.png" alt="Rooted" className="w-7 h-7" />
              <img src="/logos/logo_main.png" alt="Rooted" className="h-5 ml-1" />
            </Link>
          </div>

          {/* 중앙: 메뉴 */}
          <nav className="hidden md:flex items-center">
            <div className="px-6 py-3 rounded-full bg-white text-slate-900 shadow-md border border-white/70">
              <ul className="flex items-center gap-8 text-base font-medium">
                <li>
                  <Link href="/explore" className={`${isActive('/explore') ? 'text-black' : 'text-slate-600 hover:text-black'} transition-transform duration-200 hover:-translate-y-0.5`}>
                    <span className={`mr-2 ${isActive('/explore') ? 'text-amber-500' : 'text-slate-300'}`}>ㆍ</span>루트 둘러보기
                  </Link>
                </li>
                <li>
                  <Link href="/features" className={`${isActive('/features') ? 'text-black' : 'text-slate-600 hover:text-black'} transition-transform duration-200 hover:-translate-y-0.5`}>
                    <span className={`mr-2 ${isActive('/features') ? 'text-amber-500' : 'text-slate-300'}`}>ㆍ</span>기능 소개
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className={`${isActive('/pricing') ? 'text-black' : 'text-slate-600 hover:text-black'} transition-transform duration-200 hover:-translate-y-0.5`}>
                    <span className={`mr-2 ${isActive('/pricing') ? 'text-amber-500' : 'text-slate-300'}`}>ㆍ</span>가격 정책
                  </Link>
                </li>
              </ul>
            </div>
          </nav>

          {/* 우측: 알림 + 로그인/프로필 */}
          <div className="hidden md:flex items-center gap-3">
            {user && (
              <Link href="/notifications" className="relative rounded-full border border-white/70 bg-white px-4 py-3 h-12 flex items-center shadow-md hover:shadow-lg transition-transform duration-200 hover:-translate-y-0.5">
                <Bell className="w-5 h-5 text-slate-900" />
                {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500" />}
              </Link>
            )}

            {loading ? (
              <div className="w-12 h-12 rounded-full bg-white/40 animate-pulse" />
            ) : user ? (
              <Link href="/dashboard" className="flex items-center gap-2 rounded-full border border-white/70 bg-white px-4 py-3 h-12 shadow-md hover:shadow-lg transition-transform duration-200 hover:-translate-y-0.5">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={getAvatarUrl(profile?.avatar_url, profile?.updated_at)} alt="프로필 이미지" />
                  <AvatarFallback className="text-xs">
                    {profile?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:block text-sm font-medium text-slate-900 max-w-[160px] truncate">{profile?.full_name || '사용자'}</span>
              </Link>
            ) : (
              <Link href="/login" className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white px-6 py-3 h-12 shadow-md hover:shadow-lg text-slate-900">
                <LogIn className="w-4 h-4" />
                <span className="text-sm font-semibold">로그인</span>
              </Link>
            )}
          </div>

          {/* 모바일 우측: 알림 + 아바타/로그인 */}
          <div className="md:hidden flex items-center gap-2 justify-end">
            {user && (
              <Link href="/notifications" className="w-9 h-9 grid place-items-center text-slate-900">
                <Bell className="w-6 h-6" />
              </Link>
            )}
            {loading ? (
              <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse" />
            ) : user ? (
              <Link href="/dashboard" className="w-9 h-9 rounded-full overflow-hidden border border-slate-200">
                <Avatar className="w-9 h-9">
                  <AvatarImage src={getAvatarUrl(profile?.avatar_url, profile?.updated_at)} alt="프로필" />
                  <AvatarFallback className="text-xs">?</AvatarFallback>
                </Avatar>
              </Link>
            ) : (
              <Link href="/login" className="w-9 h-9 grid place-items-center text-slate-900">
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
              <Link href="/explore" onClick={() => setMobileOpen(false)} className="block px-5 py-4 text-slate-800 font-semibold">루트 둘러보기</Link>
            </li>
            <li>
              <Link href="/features" onClick={() => setMobileOpen(false)} className="block px-5 py-4 text-slate-800 font-semibold">기능 소개</Link>
            </li>
            <li>
              <Link href="/pricing" onClick={() => setMobileOpen(false)} className="block px-5 py-4 text-slate-800 font-semibold">가격 정책</Link>
            </li>
          </ul>
        </div>
      </div>
    </header>
  )
}