'use client'

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getAvatarUrl } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { ensureProfile } from "@/lib/profiles"
import { useAuthData } from './auth/AuthProvider'
import type { User } from "@supabase/supabase-js"
import type { Profile } from "@/types/auth"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Compass, PlusCircle, LogIn, Bell } from "lucide-react"
import { getUnreadCount } from "@/lib/notifications"
import { getUserCommunities } from "@/lib/communities"

export function Header() {
  const pathname = usePathname()
  const { user, profile, myCommunities, unreadCount, loading } = useAuthData()
  const isDashboardRoute = pathname?.includes('/dashboard')
  const isAuthRoute = pathname === '/login' || pathname === '/signup'
  // 커뮤니티 상세 루트 경로 압축 모드 감지 ("/{slug}")
  const firstSegment = pathname?.split('/').filter(Boolean)[0] || ''
  const topLevelRoutes = new Set(['', 'explore', 'create', 'login', 'signup', 'dashboard', 'messages', 'notifications', 'api'])
  const isCommunityRoot = !!firstSegment && !topLevelRoutes.has(firstSegment) && !pathname?.includes('/dashboard')
  const isCompact = isDashboardRoute || isCommunityRoot
  
  // 커뮤니티 대시보드 페이지에서만 헤더 숨기기 (상세페이지는 메인 헤더 사용)
  const isCommunityDashboardPage = firstSegment && !topLevelRoutes.has(firstSegment) && 
    (pathname?.includes('/dashboard') || pathname?.includes('/blog') || pathname?.includes('/classes') || 
     pathname?.includes('/calendar') || pathname?.includes('/members') || pathname?.includes('/settings'))

  // 커뮤니티 공개 상세 페이지("/{slug}") 감지: 세그먼트가 1개이고 상위 라우트가 아닌 경우
  const segments = pathname?.split('/').filter(Boolean) || []
  const isCommunityPublicPage = segments.length === 1 && !!firstSegment && !topLevelRoutes.has(firstSegment)

  useEffect(() => { /* 전역 AuthProvider가 관리 */ }, [])

  const isActive = (href: string) => pathname === href

  // 모바일에서만 커뮤니티 대시보드에서 헤더 숨기기 (hooks 실행 후)
  // PC에서는 항상 표시

  if (isAuthRoute) {
    return null
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex fixed left-0 top-0 h-screen 
        ${isCompact 
          ? 'w-14 lg:w-16 xl:w-16' 
          : 'w-48 lg:w-56 xl:w-60'} 
        border-r border-slate-200 bg-white z-30 transition-[width] duration-300 ease-in-out overflow-visible`}>
        <div className="flex flex-col w-full h-full">
        {/* Logo */}
        <div className="px-2.5 py-4 border-b border-slate-200">
          <Link href="/" className={`flex items-center gap-3 hover:opacity-80 transition-opacity ${isCompact ? 'justify-center' : ''} transform transition-transform duration-300 ease-out hover:scale-105`}>
            <div className="w-8 lg:w-9 h-8 lg:h-9 flex items-center justify-center">
              <img 
                src="/logos/logo_icon.png" 
                alt="Rooted 아이콘" 
                className="w-8 lg:w-9 h-8 lg:h-9 object-contain"
              />
            </div>
            {!isCompact && (
              <img 
                src="/logos/logo_main.png" 
                alt="Rooted" 
                className="h-5 lg:h-6 object-contain"
              />
            )}
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2.5 py-4 space-y-1 overflow-y-auto">
          <Link
            href="/explore"
            className={
              isCompact
                ? `flex items-center justify-center py-2 text-slate-600 hover:text-slate-900 transition-transform duration-200 ease-out hover:scale-110`
                : `flex items-center gap-2 px-2 lg:px-2.5 py-2 rounded-lg text-sm lg:text-base font-medium border ${
                    isActive('/explore')
                      ? 'bg-slate-100 text-slate-900 border-slate-200'
                      : 'bg-white text-slate-700 border-transparent hover:bg-slate-50'
                  }`
            }
          >
            <Compass strokeWidth={1.6} className={`${isCompact ? 'w-7 lg:w-8 h-7 lg:h-8' : 'w-4.5 lg:w-5 h-4.5 lg:h-5'}`} />
            {!isCompact && <span>루트 둘러보기</span>}
          </Link>
          <Link
            href="/create"
            className={
              isCompact
                ? `flex items-center justify-center py-2 text-slate-600 hover:text-slate-900 transition-transform duration-200 ease-out hover:scale-110`
                : `flex items-center gap-2 px-2 lg:px-2.5 py-2 rounded-lg text-sm lg:text-base font-medium border ${
                    isActive('/create')
                      ? 'bg-slate-100 text-slate-900 border-slate-200'
                      : 'bg-white text-slate-700 border-transparent hover:bg-slate-50'
                  }`
            }
          >
            <PlusCircle strokeWidth={1.6} className={`${isCompact ? 'w-7 lg:w-8 h-7 lg:h-8' : 'w-4.5 lg:w-5 h-4.5 lg:h-5'}`} />
            {!isCompact && <span>나의 루트 만들기</span>}
          </Link>

          {/* 로그인 시 추가 메뉴 */}
          {user && (
            <>
              <Link
                href="/notifications"
                className={
                  isCompact
                    ? `flex items-center justify-center py-2 text-slate-600 hover:text-slate-900 transition-transform duration-200 ease-out hover:scale-110`
                    : `flex items-center gap-2 px-2.5 lg:px-3 py-2 rounded-lg text-sm lg:text-base font-medium border ${
                        isActive('/notifications')
                          ? 'bg-slate-100 text-slate-900 border-slate-200'
                          : 'bg-white text-slate-700 border-transparent hover:bg-slate-50'
                      }`
                }
              >
                <div className="relative">
                  <Bell strokeWidth={1.6} className={`${isCompact ? 'w-7 lg:w-8 h-7 lg:h-8' : 'w-4.5 lg:w-5 h-4.5 lg:h-5'}`} />
                  {unreadCount > 0 && (
                    <span className={`absolute ${isCompact ? 'top-0 right-0' : '-top-1 -right-1'} w-2.5 h-2.5 rounded-full bg-red-500`} />
                  )}
                </div>
                {!isCompact && (<span>알림</span>)}
              </Link>

              {/* Divider */}
              <div className="my-3 border-t border-slate-200" />

              {/* 나의 루트 리스트 */}
              {myCommunities.length > 0 && (
                <div className="px-1.5">
                  {!isCompact && <div className="text-xs font-semibold text-slate-500 px-1 mb-2">나의 루트</div>}
                  <div className="space-y-1">
                    {myCommunities.map((m) => (
                      <Link
                        key={m.id}
                        href={`/${m.communities?.slug}/dashboard`}
                        className={
                          isCompact
                            ? `flex items-center justify-center py-1 text-slate-700 hover:text-slate-900 transition-transform duration-200 ease-out hover:scale-110`
                            : `flex items-center gap-2 px-2 py-2 rounded-lg text-[13px] lg:text-sm font-medium text-slate-700 hover:bg-slate-50`
                        }
                      >
                        {isCompact ? (
                          m.communities?.image_url ? (
                            <img src={m.communities.image_url} alt="icon" className="w-8 h-8 rounded-md object-cover" />
                          ) : (
                            <span className="text-xl font-medium">{m.communities?.name?.[0]}</span>
                          )
                        ) : (
                          m.communities?.image_url ? (
                            <img src={m.communities.image_url} alt="icon" className="w-8 lg:w-9 h-8 lg:h-9 rounded-md object-cover border border-slate-200" />
                          ) : (
                            <div className="w-8 lg:w-9 h-8 lg:h-9 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200">
                              <span className="text-base font-medium">{m.communities?.name?.[0]}</span>
                            </div>
                          )
                        )}
                        {!isCompact && <span className="truncate">{m.communities?.name}</span>}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </nav>

        {/* User */}
        <div className="px-3 lg:px-4 py-4 border-t border-slate-200">
          {loading ? (
            <div className="h-10 bg-slate-100 rounded-md animate-pulse" />
          ) : user ? (
            <Link href="/dashboard" className={`flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-50 ${isCompact ? 'justify-center group relative' : ''}`}>
              <Avatar className={`${isCompact ? 'w-9 lg:w-10 h-9 lg:h-10' : 'w-8 lg:w-9 h-8 lg:h-9'}`}>
                <AvatarImage src={getAvatarUrl(profile?.avatar_url, profile?.updated_at)} alt="프로필 이미지" />
                <AvatarFallback className="text-xs">
                  {profile?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              {!isCompact && (
                <div className="flex flex-col">
                  <span className="text-[13px] lg:text-sm font-medium text-slate-900">{profile?.full_name || '사용자'}</span>
                  <span className="text-[11px] lg:text-xs text-slate-500">대시보드로 이동</span>
                </div>
              )}
              {isCompact && (
                <span className="absolute left-full ml-2 px-2 py-1 rounded bg-slate-900 text-white text-xs hidden group-hover:block whitespace-nowrap shadow">
                  대시보드로 이동
                </span>
              )}
            </Link>
          ) : (
            isCompact ? (
              <Link
                href="/login"
                className="w-10 h-10 rounded-lg bg-black text-white hover:bg-slate-800 grid place-items-center transform transition-transform duration-300 ease-out hover:scale-105 active:scale-[0.98]"
                title="로그인"
              >
                <LogIn className="w-5 h-5" />
              </Link>
            ) : (
              <Button asChild className="w-full bg-black text-white hover:bg-slate-800 transform transition-transform duration-300 ease-out hover:scale-105 active:scale-[0.98]">
                <Link href="/login">로그인</Link>
              </Button>
            )
          )}
        </div>
      </div>
      </aside>

      {/* Mobile Top Header - 커뮤니티 대시보드에서는 숨김 (공개 상세 페이지에서는 표시) */}
      {!isCommunityDashboardPage && (
        <header className="md:hidden fixed top-0 left-0 right-0 h-12 bg-white border-b border-slate-200 z-30">
        <div className="flex items-center justify-between h-full px-3">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img 
              src="/logos/logo_icon.png" 
              alt="Rooted 아이콘" 
              className="w-7 h-7 object-contain"
            />
            <img 
              src="/logos/logo_main.png" 
              alt="Rooted" 
              className="h-4 object-contain"
            />
          </Link>

          {/* Mobile Quick Actions */}
          <div className="flex items-center gap-2">
            {user && (
              <>
                <Link
                  href="/notifications"
                  className={`p-1.5 rounded-lg transition-colors relative ${
                    isActive('/notifications')
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500" />
                  )}
                </Link>

                {/* 사용자 아바타 */}
                <Link href="/dashboard" className="p-1 rounded-lg hover:bg-slate-50 transition-colors">
                  <Avatar className="w-7 h-7">
                    <AvatarImage src={getAvatarUrl(profile?.avatar_url, profile?.updated_at)} alt="프로필 이미지" />
                    <AvatarFallback className="text-xs">
                      {profile?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                </Link>
              </>
            )}

            {!user && (
              <Button asChild size="sm" className="bg-black text-white hover:bg-slate-800 py-1 px-2">
                <Link href="/login">
                  <LogIn className="w-4 h-4 mr-1" />
                  로그인
                </Link>
              </Button>
            )}
          </div>
        </div>
        </header>
      )}

      {/* Mobile Bottom Navigation - 커뮤니티 대시보드/공개 상세 페이지에서는 숨김 */}
      {!isCommunityDashboardPage && !isCommunityPublicPage && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-30">
        <div className="flex items-center justify-around py-1.5 px-3">
          <Link
            href="/explore"
            className={`flex flex-col items-center gap-1 p-1.5 rounded-lg transition-colors ${
              isActive('/explore')
                ? 'text-slate-900'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span className="text-xs font-medium">둘러보기</span>
          </Link>
          
          <Link
            href="/create"
            className={`flex flex-col items-center gap-1 p-1.5 rounded-lg transition-colors ${
              isActive('/create')
                ? 'text-slate-900'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span className="text-xs font-medium">만들기</span>
          </Link>

          {user && (
            <>
              <Link
                href="/dashboard"
                className={`flex flex-col items-center gap-1 p-1.5 rounded-lg transition-colors ${
                  isActive('/dashboard')
                    ? 'text-slate-900'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Avatar className="w-4 h-4">
                  <AvatarImage src={getAvatarUrl(profile?.avatar_url, profile?.updated_at)} alt="프로필 이미지" />
                  <AvatarFallback className="text-xs">
                    {profile?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium">내정보</span>
              </Link>
            </>
          )}
        </div>
        </nav>
      )}
    </>
  )
}