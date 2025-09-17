"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Bell, ChevronDown, Menu, Home, BookOpen, Calendar, Users, Settings, BarChart3 } from "lucide-react"
import { getAvatarUrl } from "@/lib/utils"
import { useAuthData } from "@/components/auth/AuthProvider"
import { useCommunityBySlug } from "@/hooks/useCommunity"
import { getCommunitySettings } from "@/lib/communities"
import { getReadableTextColor, withAlpha } from "@/utils/color"

type ViewKey = "home" | "settings" | "classes" | "calendar" | "members"

interface CommunityTopbarProps {
  slug: string
  name: string
  active: ViewKey
  onChangeAction: (next: ViewKey) => void
  imageUrl?: string | null
  onToggleSidebar?: () => void
}

export function CommunityTopbar({ slug, name, active, onChangeAction, imageUrl, onToggleSidebar }: CommunityTopbarProps) {
  const { user, profile, myCommunities, unreadCount } = useAuthData()
  const [showCommunityDropdown, setShowCommunityDropdown] = useState(false)
  const [isOwner, setIsOwner] = useState<boolean>(false)
  const communityQ = useCommunityBySlug(slug)
  const [brandColor, setBrandColor] = useState<string | null>(null)

  useEffect(() => {
    const ownerId = (communityQ.data as any)?.owner_id || null
    setIsOwner(!!user && !!ownerId && ownerId === user.id)
  }, [communityQ.data, user])

  useEffect(() => {
    const id = (communityQ.data as any)?.id
    if (!id) return
    ;(async () => {
      try {
        const s = await getCommunitySettings(id)
        setBrandColor((s as any)?.brand_color || null)
      } catch {}
    })()
  }, [communityQ.data])
  const NavItem = ({ k, label }: { k: ViewKey; label: string }) => {
    const getIcon = () => {
      switch (k) {
        case 'home': return <Home className="w-4 h-4" />
        case 'classes': return <BookOpen className="w-4 h-4" />
        case 'calendar': return <Calendar className="w-4 h-4" />
        case 'members': return <Users className="w-4 h-4" />
        case 'settings': return <Settings className="w-4 h-4" />
        default: return null
      }
    }

    const activeColor = brandColor || undefined
    const inactiveClass = 'text-slate-500 hover:text-slate-700'
    return (
      <button
        onClick={() => onChangeAction(k)}
        className={`flex flex-col items-center gap-1.5 p-1.5 rounded-lg transition-all duration-200 ${
          active === k ? '' : inactiveClass
        }`}
        style={active === k && activeColor ? { color: activeColor as any } : undefined}
      >
        <div className={`w-5 h-5 flex items-center justify-center transition-all duration-200 ${
          active === k 
            ? 'scale-110' 
            : 'hover:scale-105'
        } ${active === k ? '' : ''}`} style={active === k && activeColor ? { color: activeColor as any } : undefined}>
          {getIcon()}
        </div>
        <span className={`text-xs font-medium transition-all duration-200 ${active === k ? '' : ''}`} style={active === k && activeColor ? { color: activeColor as any } : undefined}>{label}</span>
      </button>
    )
  }

  return (
    <>
      {/* PC Tab Navigation - 커뮤니티 대시보드 탭 네비게이션 */}
      <div className="hidden md:block bg-white border-b border-slate-200 relative z-50">
        <div className="flex items-center justify-between h-17 px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onChangeAction("home")}
              className="flex items-center gap-3 hover:bg-slate-50 cursor-pointer rounded-lg px-2 py-1.5 transition-all duration-200 hover:shadow-sm"
            >
              <div className="w-9 h-9 rounded-lg overflow-hidden bg-white border border-slate-200 transition-transform duration-200 hover:scale-105">
                {imageUrl ? (
                  <img src={imageUrl} alt="icon" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-slate-900 text-white flex items-center justify-center">
                    <span className="text-sm font-bold">{name?.[0] || slug?.[0] || "?"}</span>
                  </div>
                )}
              </div>
              <div className="text-base md:text-lg font-semibold text-slate-900 transition-colors duration-200 hover:text-slate-800">{name || slug}</div>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onChangeAction("home")}
              className={`px-4 py-2 text-sm font-medium rounded-full cursor-pointer transition-all duration-200 ${
                active === "home" ? (brandColor ? "shadow-sm" : "bg-slate-900 text-white shadow-sm") : "text-slate-700 hover:bg-slate-100 hover:shadow-sm hover:scale-105"
              }`}
              style={active === 'home' && brandColor ? { backgroundColor: brandColor, color: getReadableTextColor(brandColor) } : undefined}
            >
              홈
            </button>
            <button
              onClick={() => onChangeAction("classes")}
              className={`px-4 py-2 text-sm font-medium rounded-full cursor-pointer transition-all duration-200 ${
                active === "classes" ? (brandColor ? "shadow-sm" : "bg-slate-900 text-white shadow-sm") : "text-slate-700 hover:bg-slate-100 hover:shadow-sm hover:scale-105"
              }`}
              style={active === 'classes' && brandColor ? { backgroundColor: brandColor, color: getReadableTextColor(brandColor) } : undefined}
            >
              클래스
            </button>
            <button
              onClick={() => onChangeAction("calendar")}
              className={`px-4 py-2 text-sm font-medium rounded-full cursor-pointer transition-all duration-200 ${
                active === "calendar" ? (brandColor ? "shadow-sm" : "bg-slate-900 text-white shadow-sm") : "text-slate-700 hover:bg-slate-100 hover:shadow-sm hover:scale-105"
              }`}
              style={active === 'calendar' && brandColor ? { backgroundColor: brandColor, color: getReadableTextColor(brandColor) } : undefined}
            >
              캘린더
            </button>
            <button
              onClick={() => onChangeAction("members")}
              className={`px-4 py-2 text-sm font-medium rounded-full cursor-pointer transition-all duration-200 ${
                active === "members" ? (brandColor ? "shadow-sm" : "bg-slate-900 text-white shadow-sm") : "text-slate-700 hover:bg-slate-100 hover:shadow-sm hover:scale-105"
              }`}
              style={active === 'members' && brandColor ? { backgroundColor: brandColor, color: getReadableTextColor(brandColor) } : undefined}
            >
              멤버
            </button>
            {isOwner && (
              <button
                onClick={() => onChangeAction("settings")}
                className={`px-4 py-2 text-sm font-medium rounded-full cursor-pointer transition-all duration-200 ${
                  active === "settings" ? (brandColor ? "shadow-sm" : "bg-slate-900 text-white shadow-sm") : "text-slate-700 hover:bg-slate-100 hover:shadow-sm hover:scale-105"
                }`}
                style={active === 'settings' && brandColor ? { backgroundColor: brandColor, color: getReadableTextColor(brandColor) } : undefined}
              >
                설정
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Desktop right actions: notifications (icon only) + My Root dropdown + profile with name */}
            {isOwner && (
              <Link
                href={`/${slug}/stats`}
                className="relative p-1.5 rounded-full hover:bg-slate-50 transition-colors cursor-pointer"
                title="통계"
              >
                <BarChart3 className="w-4 h-4" style={brandColor ? { color: brandColor } : { color: '#0f172a' }} />
              </Link>
            )}
            <Link
              href="/notifications"
              className="relative p-1.5 rounded-full hover:bg-slate-50 transition-colors cursor-pointer"
              title="알림"
            >
              <Bell className="w-4 h-4 text-slate-700" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500" />
              )}
            </Link>

            <div className="relative">
              <button
                onClick={() => setShowCommunityDropdown(!showCommunityDropdown)}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full hover:bg-slate-50 transition-colors cursor-pointer"
                aria-haspopup="menu"
                aria-expanded={showCommunityDropdown}
                title="내 커뮤니티로 이동"
              >
                <span className="text-sm font-medium text-slate-700">My 루트</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </button>
              {showCommunityDropdown && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-lg z-40">
                  <div className="p-3">
                    <div className="text-xs font-semibold text-slate-500 mb-2">나의 루트</div>
                    <div className="space-y-1 max-h-60 overflow-y-auto">
                      {myCommunities.map((community) => (
                        <Link
                          key={community.id}
                          href={`/${community.communities?.slug}/dashboard`}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors"
                          onClick={() => setShowCommunityDropdown(false)}
                        >
                          <div className="w-8 h-8 rounded-md overflow-hidden bg-white border border-slate-200">
                            {(community.communities as any)?.icon_url || community.communities?.image_url ? (
                              <img src={(community.communities as any).icon_url || (community.communities as any).image_url} alt="icon" className="w-full h-full object-cover" />
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
                        다른 루트 둘러보기
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Link href="/dashboard" className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer" title="내 프로필">
              <Avatar className="w-8 h-8">
                <AvatarImage src={getAvatarUrl(profile?.avatar_url, profile?.updated_at)} alt="프로필 이미지" />
                <AvatarFallback className="text-xs">
                  {profile?.username?.[0]?.toUpperCase() || profile?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:block text-sm font-medium text-slate-800 max-w-[160px] truncate">{profile?.full_name || user?.email || '사용자'}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Only Headers */}
      <div className="md:hidden">
        {/* Mobile Top Header */}
        <header className="fixed top-0 left-0 right-0 h-12 bg-white border-b border-slate-200 z-30">
          <div className="relative flex items-center h-full px-3">
            {active === 'home' ? (
              // 홈 탭: 좌측에 메뉴 아이콘 + 커뮤니티 아이콘 + 우측 액션
              <>
                {/* Left Actions - Menu Icon only */}
                <div className="flex items-center gap-2">
                  {onToggleSidebar && (
                    <button
                      onClick={onToggleSidebar}
                      className="p-1.5 rounded-lg transition-colors shadow-sm cursor-pointer border"
                      style={brandColor ? { backgroundColor: withAlpha(brandColor, 0.12), borderColor: withAlpha(brandColor, 0.35) } : undefined}
                      title="메뉴"
                    >
                      <Menu className="w-4 h-4" style={brandColor ? { color: brandColor } : undefined} />
                    </button>
                  )}
                </div>

                {/* Centered Community Icon */}
                <div className="absolute left-1/2 -translate-x-1/2">
                  <button
                    onClick={() => onChangeAction("home")}
                    className="hover:opacity-80 transition-opacity"
                  >
                    <div className="w-9 h-9 rounded-lg overflow-hidden bg-white border border-slate-200 flex-shrink-0 shadow-md">
                      {imageUrl ? (
                        <img src={imageUrl} alt="icon" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-slate-900 text-white flex items-center justify-center">
                          <span className="text-sm font-bold">{name?.[0] || slug?.[0] || "?"}</span>
                        </div>
                      )}
                    </div>
                  </button>
                </div>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Right Actions */}
                <div className="flex items-center gap-2">
                  {isOwner && (
                    <Link
                      href={`/${slug}/stats`}
                      className="w-9 h-9 grid place-items-center"
                      title="통계"
                    >
                      <BarChart3 className="w-5 h-5" style={brandColor ? { color: brandColor } : undefined} />
                    </Link>
                  )}
                  <Link
                    href="/notifications"
                    className="w-9 h-9 grid place-items-center"
                  >
                    <Bell className="w-5 h-5 text-slate-700" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500" />
                    )}
                  </Link>

                  <button
                    onClick={() => setShowCommunityDropdown(v => !v)}
                    className="w-9 h-9 rounded-full overflow-hidden border border-slate-200 active:scale-[0.98]"
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
                                {community.communities?.image_url ? (
                                  <img src={community.communities.image_url} alt="icon" className="w-full h-full object-cover" />
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
                </div>
              </>
            ) : (
              // 다른 탭들: 좌측 커뮤니티 아이콘 + 우측 액션
              <>
                {/* Left - Menu Icon only */}
                <div className="flex items-center gap-2">
                  {onToggleSidebar && (
                    <button
                      onClick={onToggleSidebar}
                      className="p-1.5 rounded-lg transition-colors shadow-sm cursor-pointer border"
                      style={brandColor ? { backgroundColor: withAlpha(brandColor, 0.12), borderColor: withAlpha(brandColor, 0.35) } : undefined}
                      title="메뉴"
                    >
                      <Menu className="w-4 h-4" style={brandColor ? { color: brandColor } : undefined} />
                    </button>
                  )}
                </div>

                {/* Centered Community Icon */}
                <div className="absolute left-1/2 -translate-x-1/2">
                  <button
                    onClick={() => onChangeAction("home")}
                    className="hover:opacity-80 transition-opacity"
                  >
                    <div className="w-9 h-9 rounded-lg overflow-hidden bg-white border border-slate-200 flex-shrink-0 shadow-md">
                      {imageUrl ? (
                        <img src={imageUrl} alt="icon" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-slate-900 text-white flex items-center justify-center">
                          <span className="text-sm font-bold">{name?.[0] || slug?.[0] || "?"}</span>
                        </div>
                      )}
                    </div>
                  </button>
                </div>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Right Actions */}
                <div className="flex items-center gap-2">
                  {isOwner && (
                    <Link
                      href={`/${slug}/stats`}
                      className="w-9 h-9 grid place-items-center"
                      title="통계"
                    >
                      <BarChart3 className="w-5 h-5" style={brandColor ? { color: brandColor } : undefined} />
                    </Link>
                  )}
                  <Link
                    href="/notifications"
                    className="w-9 h-9 grid place-items-center"
                  >
                    <Bell className="w-5 h-5 text-slate-700" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500" />
                    )}
                  </Link>

                  <button
                    onClick={() => setShowCommunityDropdown(v => !v)}
                    className="w-9 h-9 rounded-full overflow-hidden border border-slate-200 active:scale-[0.98]"
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
                              <div className="w-8 h-8 rounded-md overflow-hidden bg-white border border-slate-200">
                                {(community.communities as any)?.icon_url || community.communities?.image_url ? (
                                  <img src={(community.communities as any).icon_url || (community.communities as any).image_url} alt="icon" className="w-full h-full object-cover" />
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
                </div>
              </>
            )}
          </div>
        </header>

        {/* Mobile Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-30">
          <div className="flex items-center justify-around py-1.5 px-3">
            <NavItem k="home" label="홈" />
            <NavItem k="classes" label="클래스" />
            <NavItem k="calendar" label="캘린더" />
            <NavItem k="members" label="멤버" />
            {/* 설정은 관리자만 보이므로 조건부 렌더링 */}
            {isOwner && <NavItem k="settings" label="설정" />}
          </div>
        </nav>
      </div>
    </>
  )
}


