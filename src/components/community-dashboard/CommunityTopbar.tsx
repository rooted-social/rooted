"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Bell, ChevronDown, Menu, Home, BookOpen, Calendar, Users, Settings } from "lucide-react"
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
  onChange: (next: ViewKey) => void
  imageUrl?: string | null
  onToggleSidebar?: () => void
}

export function CommunityTopbar({ slug, name, active, onChange, imageUrl, onToggleSidebar }: CommunityTopbarProps) {
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
        onClick={() => onChange(k)}
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
              onClick={() => onChange("home")}
              className="flex items-center gap-3 hover:bg-slate-50 cursor-pointer rounded-lg px-2 py-1.5 transition-all duration-200 hover:shadow-sm"
            >
              <div className="w-9 h-9 rounded-lg overflow-hidden bg-slate-100 transition-transform duration-200 hover:scale-105">
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
              onClick={() => onChange("home")}
              className={`px-4 py-2 text-sm font-medium rounded-full cursor-pointer transition-all duration-200 ${
                active === "home" ? (brandColor ? "shadow-sm" : "bg-slate-900 text-white shadow-sm") : "text-slate-700 hover:bg-slate-100 hover:shadow-sm hover:scale-105"
              }`}
              style={active === 'home' && brandColor ? { backgroundColor: brandColor, color: getReadableTextColor(brandColor) } : undefined}
            >
              홈
            </button>
            <button
              onClick={() => onChange("classes")}
              className={`px-4 py-2 text-sm font-medium rounded-full cursor-pointer transition-all duration-200 ${
                active === "classes" ? (brandColor ? "shadow-sm" : "bg-slate-900 text-white shadow-sm") : "text-slate-700 hover:bg-slate-100 hover:shadow-sm hover:scale-105"
              }`}
              style={active === 'classes' && brandColor ? { backgroundColor: brandColor, color: getReadableTextColor(brandColor) } : undefined}
            >
              클래스
            </button>
            <button
              onClick={() => onChange("calendar")}
              className={`px-4 py-2 text-sm font-medium rounded-full cursor-pointer transition-all duration-200 ${
                active === "calendar" ? (brandColor ? "shadow-sm" : "bg-slate-900 text-white shadow-sm") : "text-slate-700 hover:bg-slate-100 hover:shadow-sm hover:scale-105"
              }`}
              style={active === 'calendar' && brandColor ? { backgroundColor: brandColor, color: getReadableTextColor(brandColor) } : undefined}
            >
              캘린더
            </button>
            <button
              onClick={() => onChange("members")}
              className={`px-4 py-2 text-sm font-medium rounded-full cursor-pointer transition-all duration-200 ${
                active === "members" ? (brandColor ? "shadow-sm" : "bg-slate-900 text-white shadow-sm") : "text-slate-700 hover:bg-slate-100 hover:shadow-sm hover:scale-105"
              }`}
              style={active === 'members' && brandColor ? { backgroundColor: brandColor, color: getReadableTextColor(brandColor) } : undefined}
            >
              멤버
            </button>
            {isOwner && (
              <button
                onClick={() => onChange("settings")}
                className={`px-4 py-2 text-sm font-medium rounded-full cursor-pointer transition-all duration-200 ${
                  active === "settings" ? (brandColor ? "shadow-sm" : "bg-slate-900 text-white shadow-sm") : "text-slate-700 hover:bg-slate-100 hover:shadow-sm hover:scale-105"
                }`}
                style={active === 'settings' && brandColor ? { backgroundColor: brandColor, color: getReadableTextColor(brandColor) } : undefined}
              >
                설정
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button asChild variant="outline" className="rounded-full cursor-pointer transition-all duration-200 hover:shadow-sm hover:scale-105">
              <Link href={`/${slug}`}>커뮤니티 보기</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Only Headers */}
      <div className="md:hidden">
        {/* Mobile Top Header */}
        <header className="fixed top-0 left-0 right-0 h-12 bg-white border-b border-slate-200 z-30">
          <div className="flex items-center h-full px-3">
            {active === 'home' ? (
              // 홈 탭: 좌측에 메뉴 아이콘 + 커뮤니티 아이콘 + 우측 액션
              <>
                {/* Left Actions - Menu Icon + Community Icon */}
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
                  
                  <button
                    onClick={() => onChange("home")}
                    className="hover:opacity-80 transition-opacity"
                  >
                    <div className="w-9 h-9 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0 shadow-md">
                      {imageUrl ? (
                        <img src={imageUrl} alt="icon" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-slate-900 text-white flex items-center justify-center">
                          <span className="text-sm font-bold">{name?.[0] || slug?.[0] || "?"}</span>
                        </div>
                      )}
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setShowCommunityDropdown(!showCommunityDropdown)}
                    className="p-1 hover:bg-slate-50 rounded-lg transition-colors relative flex-shrink-0"
                  >
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                    
                    {/* Community Dropdown */}
                    {showCommunityDropdown && (
                      <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-lg z-40">
                        <div className="p-3">
                          <div className="text-xs font-semibold text-slate-500 mb-2">나의 커뮤니티</div>
                          <div className="space-y-1 max-h-60 overflow-y-auto">
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
                          <div className="pt-3">
                            <Link
                              href="/explore"
                              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 text-white px-3 py-2 text-sm font-semibold hover:bg-amber-600 transition-colors"
                              onClick={() => setShowCommunityDropdown(false)}
                            >
                              다른 커뮤니티 둘러보기
                            </Link>
                          </div>
                        </div>
                      </div>
                    )}
                  </button>
                </div>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Right Actions */}
                <div className="flex items-center gap-2">
                  <Link
                    href="/notifications"
                    className="p-1.5 rounded-lg border transition-colors relative"
                    style={brandColor ? { backgroundColor: withAlpha(brandColor, 0.12), borderColor: withAlpha(brandColor, 0.3) } : undefined}
                  >
                    <Bell className="w-4 h-4" style={brandColor ? { color: brandColor } : undefined} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500" />
                    )}
                  </Link>

                  <Link href="/dashboard" className="p-1 rounded-lg hover:bg-slate-50 transition-colors">
                    <Avatar className="w-7 h-7">
                      <AvatarImage src={getAvatarUrl(profile?.avatar_url, profile?.updated_at)} alt="프로필 이미지" />
                      <AvatarFallback className="text-xs">
                        {profile?.username?.[0]?.toUpperCase() || profile?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                </div>
              </>
            ) : (
              // 다른 탭들: 좌측 커뮤니티 아이콘 + 우측 액션
              <>
                {/* Left - Community Icon */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onChange("home")}
                    className="hover:opacity-80 transition-opacity"
                  >
                    <div className="w-9 h-9 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0 shadow-md">
                      {imageUrl ? (
                        <img src={imageUrl} alt="icon" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-slate-900 text-white flex items-center justify-center">
                          <span className="text-sm font-bold">{name?.[0] || slug?.[0] || "?"}</span>
                        </div>
                      )}
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setShowCommunityDropdown(!showCommunityDropdown)}
                    className="p-1 hover:bg-slate-50 rounded-lg transition-colors relative flex-shrink-0"
                  >
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                    
                    {/* Community Dropdown */}
                    {showCommunityDropdown && (
                      <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-lg z-40">
                        <div className="p-3">
                          <div className="text-xs font-semibold text-slate-500 mb-2">나의 커뮤니티</div>
                          <div className="space-y-1 max-h-60 overflow-y-auto">
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
                          <div className="pt-3">
                            <Link
                              href="/explore"
                              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 text-white px-3 py-2 text-sm font-semibold hover:bg-amber-600 transition-colors"
                              onClick={() => setShowCommunityDropdown(false)}
                            >
                              다른 커뮤니티 둘러보기
                            </Link>
                          </div>
                        </div>
                      </div>
                    )}
                  </button>
                </div>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Right Actions */}
                <div className="flex items-center gap-2">
                  <Link
                    href="/notifications"
                    className="p-1.5 rounded-lg hover:bg-slate-50 transition-colors relative"
                  >
                    <Bell className="w-4 h-4 text-slate-600" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500" />
                    )}
                  </Link>

                  <Link href="/dashboard" className="p-1 rounded-lg hover:bg-slate-50 transition-colors">
                    <Avatar className="w-7 h-7">
                      <AvatarImage src={getAvatarUrl(profile?.avatar_url, profile?.updated_at)} alt="프로필 이미지" />
                      <AvatarFallback className="text-xs">
                        {profile?.username?.[0]?.toUpperCase() || profile?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
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


