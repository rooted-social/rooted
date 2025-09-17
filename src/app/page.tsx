"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
// import { Button } from "@/components/ui/button"
// 기존 AnimatedBackground 제거
// HeroOrbs 제거
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useAuthData } from "@/components/auth/AuthProvider"
import HeroConnections from "@/components/HeroConnections"
import { getCommunities } from "@/lib/communities"
import { getVersionedUrl } from "@/lib/utils"
import type { Community } from "@/types/community"
import { Flame, Users, FileText, Megaphone, CalendarDays, GraduationCap, BarChart3 } from "lucide-react"

export default function HomePage() {
  const router = useRouter()
  const { user } = useAuthData()
  const [communities, setCommunities] = useState<Community[]>([])
  const [bannerMap, setBannerMap] = useState<Record<string, string>>({})
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)

  useEffect(() => {
    ;(async () => {
      try {
        const data = await getCommunities({})
        setCommunities(data.slice(0, 10))
      } catch {
        setCommunities([])
      }
    })()
  }, [])

  // 커뮤니티별 대표 이미지(첫 번째) 로드
  useEffect(() => {
    if (!communities || communities.length === 0) return
    let cancelled = false
    ;(async () => {
      try {
        const results = await Promise.all(
          communities.map(async (c) => {
            try {
              const res = await fetch(`/api/community-images/${c.slug}?t=${Date.now()}`, { cache: 'no-store' })
              const j = await res.json()
              const url = j?.images?.[0]?.url || getVersionedUrl((c as any)?.image_url, (c as any)?.updated_at) || ''
              return [c.slug as string, url] as const
            } catch {
              const fallback = getVersionedUrl((c as any)?.image_url, (c as any)?.updated_at) || ''
              return [c.slug as string, fallback] as const
            }
          })
        )
        if (cancelled) return
        const map: Record<string, string> = {}
        results.forEach(([slug, url]) => { if (url) map[slug] = url })
        setBannerMap(map)
      } catch {}
    })()
    return () => { cancelled = true }
  }, [communities])

  // 자동 스크롤 효과
  useEffect(() => {
    const scrollContainer = scrollRef.current
    if (!scrollContainer || communities.length === 0 || isDragging) return

    const scrollWidth = scrollContainer.scrollWidth
    const clientWidth = scrollContainer.clientWidth
    let scrollPosition = 0

    const autoScroll = () => {
      scrollPosition += 1
      if (scrollPosition >= scrollWidth - clientWidth) {
        scrollPosition = 0
      }
      scrollContainer.scrollLeft = scrollPosition
    }

    const interval = setInterval(autoScroll, 50)
    return () => clearInterval(interval)
  }, [communities, isDragging])

  // 드래그 핸들러
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setStartX(e.pageX - (scrollRef.current?.offsetLeft || 0))
    setScrollLeft(scrollRef.current?.scrollLeft || 0)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return
    e.preventDefault()
    const x = e.pageX - (scrollRef.current.offsetLeft || 0)
    const walk = (x - startX) * 2
    scrollRef.current.scrollLeft = scrollLeft - walk
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleMouseLeave = () => {
    setIsDragging(false)
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-black">
      {/* Hero Section - 블랙 테마 집중형 */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* 가장 뒤: 그라디언트 배경 */}
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-black via-black to-black" />
        {/* 연결선/점 배경 (캔버스) */}
        <div className="absolute inset-0 z-10 pointer-events-none">
          <HeroConnections />
        </div>
        {/* 링 효과 레이어 1 */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.35] z-5">
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[160vmin] h-[160vmin] rounded-full animate-[spin_80s_linear_infinite]"
            style={{
              background:
                "repeating-radial-gradient(circle at center, rgba(255,255,255,0.10) 0px, rgba(255,255,255,0.10) 1px, transparent 1px, transparent 120px)",
              maskImage: "radial-gradient(circle at center, black 55%, transparent 70%)",
              WebkitMaskImage: "radial-gradient(circle at center, black 55%, transparent 70%)",
            }}
          />
        </div>
        {/* 링 효과 레이어 2 */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.2] z-4">
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[200vmin] h-[200vmin] rounded-full animate-[spin_120s_linear_infinite_reverse]"
            style={{
              background:
                "repeating-radial-gradient(circle at center, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 160px)",
              maskImage: "radial-gradient(circle at center, black 40%, transparent 70%)",
              WebkitMaskImage: "radial-gradient(circle at center, black 40%, transparent 70%)",
            }}
          />
        </div>

        {/* 콘텐츠 */}
        <div className="relative z-30 text-center px-6 max-w-3xl">
          <h1 className="text-white text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.05] fade-in-down" style={{ animationDelay: '60ms' }}>
            Your Community Platform
          </h1>
          <p className="mt-5 text-slate-100 text-base sm:text-lg fade-in-down" style={{ animationDelay: '140ms' }}>
            멤버십, 이벤트, 클래스, 멤버 관리를 — 한 곳에서.
          </p>
          <div className="mt-8">
            <button
              onClick={() => router.push(user ? '/create' : '/login')}
              className="px-6 py-3 rounded-full text-slate-900 font-semibold transition-transform transition-shadow duration-200 cursor-pointer hover:-translate-y-0.5 ring-1 ring-white/10 hover:ring-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 active:scale-[0.99] border border-slate-300 shadow-[0_0_18px_rgba(148,163,184,0.35)] hover:shadow-[0_0_26px_rgba(148,163,184,0.5)] fade-in-down"
              style={{
                animationDelay: '220ms',
                background: 'linear-gradient(135deg, #f8fafc 0%, #e5e7eb 20%, #cbd5e1 50%, #f1f5f9 75%, #d1d5db 100%)'
              }}
            >
              나의 커뮤니티 생성하기
            </button>
          </div>
        </div>

        {/* 키프레임 */}
        <style jsx>{`
          @keyframes spin { from { transform: translate(-50%, -50%) rotate(0deg); } to { transform: translate(-50%, -50%) rotate(360deg); } }
          @keyframes spin_120s_linear_infinite_reverse { }
          @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.03); } }
        `}</style>
      </section>

      {/* Main Content */}
      <main className="relative bg-white rounded-t-4xl -mt-12 z-10 px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 pt-10 pb-28">
        <div className="w-full">
          {/* Featured communities */}
          {communities.length > 0 && (
            <section className="mt-6 sm:mt-8 md:mt-12 lg:mt-16 w-full">
              <h2 className="text-2xl font-semibold mb-4 flex items-center justify-center gap-2">
                <Flame className="w-5 h-5 text-amber-500" />
                지금 인기 있는 루트
              </h2>
              <div className="relative overflow-hidden">
                <div 
                  ref={scrollRef}
                  className={`flex gap-4 overflow-x-hidden ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseLeave}
                  style={{ 
                    scrollbarWidth: 'none', 
                    msOverflowStyle: 'none',
                    WebkitOverflowScrolling: 'touch'
                  }}
                >
                  {/* 커뮤니티 카드들을 2번 복제해서 무한 스크롤 효과 */}
                  {[...communities, ...communities].map((c, index) => (
                    <Card
                      key={`${c.id}-${index}`}
                      className="w-[350px] flex-shrink-0 cursor-pointer border border-slate-300 bg-white rounded-xl hover:border-slate-400 hover:shadow-lg shadow-sm transition-all duration-200 overflow-hidden p-0"
                      onClick={() => !isDragging && router.push(`/${c.slug}`)}
                    >
                      {/* 상단 대표 이미지 */}
                      <div className="w-full h-50 bg-slate-100">
                        {(() => {
                          const topUrl = bannerMap[c.slug] || getVersionedUrl((c as any)?.image_url, (c as any)?.updated_at)
                          return topUrl ? (
                            <img src={topUrl} alt="banner" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-b from-slate-100 to-slate-200" />
                          )
                        })()}
                      </div>

                      {/* 본문 */}
                      <div className="px-4 py-3">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-md overflow-hidden bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-300">
                            {(c as any)?.icon_url || (c as any)?.image_url ? (
                              <img src={((c as any).icon_url || (c as any).image_url) as any} alt="icon" className="w-full h-full object-cover" />
                            ) : (
                              <span className="font-semibold text-sm">{c.name[0]}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base font-semibold text-slate-900 leading-tight truncate">{c.name}</CardTitle>
                            <CardDescription className="text-sm text-slate-600 line-clamp-2 mt-1">{c.description}</CardDescription>
                          </div>
                        </div>

                        {/* 하단 정보: 멤버수 • 카테고리 */}
                        <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
                          <span>멤버 {c.member_count}명</span>
                          <span className="flex items-center gap-1"><span className="text-slate-400">•</span>{c.category}</span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
                
                {/* 그라데이션 fade 효과 */}
                <div className="absolute top-0 left-0 w-8 h-full bg-gradient-to-r from-white to-transparent pointer-events-none z-10" />
                <div className="absolute top-0 right-0 w-8 h-full bg-gradient-to-l from-white to-transparent pointer-events-none z-10" />
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  )
}
