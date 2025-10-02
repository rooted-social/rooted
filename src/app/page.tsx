"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
// import { Button } from "@/components/ui/button"
// 기존 AnimatedBackground 제거
// HeroOrbs 제거
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useAuthData } from "@/components/auth/AuthProvider"
import HeroConnections from "@/components/HeroConnections"
import { fetchExploreCommunities } from "@/lib/dashboard"
import Image from "next/image"
import { getVersionedUrl } from "@/lib/utils"
import type { Community } from "@/types/community"
import { Flame, Users, FileText, Megaphone, CalendarDays, GraduationCap, BarChart3 } from "lucide-react"
import Footer from "@/components/Footer"

export default function HomePage() {
  const router = useRouter()
  const { user } = useAuthData()
  const [communities, setCommunities] = useState<Community[]>([])
  const [bannerMap, setBannerMap] = useState<Record<string, string>>({})
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)
  const [ctaVisible, setCtaVisible] = useState(false)
  const ctaRef = useRef<HTMLDivElement>(null)
  const [popularVisible, setPopularVisible] = useState(false)
  const popularRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/featured', { cache: 'force-cache', next: { revalidate: 60 } })
        if (res.ok) {
          const featured = await res.json()
          if (Array.isArray(featured) && featured.length > 0) {
            setCommunities(featured)
            return
          }
        }
        const data = await fetchExploreCommunities({ limit: 10, sort: 'popular' })
        setCommunities((data as any[]) as any)
      } catch {
        setCommunities([])
      }
    })()
  }, [])

  // 커뮤니티별 대표 이미지 매핑 간소화 (서버 제공 thumb_url 우선)
  useEffect(() => {
    if (!communities || communities.length === 0) return
    const map: Record<string, string> = {}
    for (const c of communities) {
      const url = (c as any)?.thumb_url || getVersionedUrl((c as any)?.image_url, (c as any)?.updated_at) || ''
      if (url) map[c.slug as string] = url
    }
    setBannerMap(map)
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

  // CTA 섹션: 뷰포트 진입 시 한 번만 노출 애니메이션
  useEffect(() => {
    const el = ctaRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setCtaVisible(true)
          observer.disconnect()
        }
      },
      { root: null, threshold: 0.4 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // 인기 섹션 타이틀: 스크롤 진입 시 애니메이션
  useEffect(() => {
    const el = popularRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setPopularVisible(true)
          observer.disconnect()
        }
      },
      { root: null, threshold: 0.4 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

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
          <div className="overflow-hidden">
            <h1 className="text-white text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.05]">
              <span className="block will-change-transform reveal-line" style={{ animationDelay: '40ms' }}>Your Community</span>
              <span className="block will-change-transform reveal-line" style={{ animationDelay: '160ms' }}>Platform</span>
            </h1>
          </div>
          <div className="mt-5 overflow-hidden">
            <p className="text-slate-100 text-base sm:text-lg will-change-transform reveal-line" style={{ animationDelay: '280ms' }}>
              멤버십, 클래스, 일정, 멤버 관리를 — 한 곳에서.
            </p>
          </div>
          <div className="mt-8 overflow-visible relative z-[60]">
            <button
              onClick={() => router.push(user ? '/create' : '/login')}
              className="group relative z-[60] inline-flex items-center gap-2 px-8 sm:px-9 py-3.5 rounded-2xl font-semibold cursor-pointer transition-all duration-300 text-slate-900 bg-white/95 hover:bg-white/100 backdrop-blur-xl backdrop-saturate-150 border border-white/70 ring-1 ring-white/70 hover:ring-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/90 shadow-[0_10px_36px_rgba(255,255,255,0.18),_0_18px_60px_rgba(2,6,23,0.10)] hover:shadow-[0_14px_48px_rgba(255,255,255,0.24),_0_26px_80px_rgba(2,6,23,0.14)] hover:-translate-y-0.5 active:translate-y-0 overflow-hidden will-change-transform reveal-line"
              style={{ animationDelay: '340ms' }}
            >
              {/* glow behind */}
              <span className="pointer-events-none absolute -inset-1 rounded-full bg-white/40 blur-lg opacity-70 group-hover:opacity-90 transition-opacity duration-300" />
              {/* label */}
              <span className="relative z-10">나의 커뮤니티 생성하기</span>
              {/* shimmer sweep */}
              <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-full z-10">
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/80 to-transparent opacity-80 group-hover:animate-[shine_1.1s_ease-out]" />
              </span>
            </button>
          </div>
        </div>

        {/* 키프레임 */}
        <style jsx>{`
          @keyframes spin { from { transform: translate(-50%, -50%) rotate(0deg); } to { transform: translate(-50%, -50%) rotate(360deg); } }
          @keyframes spin_120s_linear_infinite_reverse { }
          @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.03); } }
          @keyframes reveal {
            0% { transform: translateY(120%); opacity: 0; }
            60% { opacity: 1; }
            100% { transform: translateY(0%); opacity: 1; }
          }
          .reveal-line {
            animation: reveal 700ms cubic-bezier(0.22, 1, 0.36, 1) both;
          }
        `}</style>
      </section>

      {/* Main Content */}
      <main className="relative bg-white rounded-t-4xl -mt-12 z-10 px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 pt-10 pb-0">
        {/* 상단 외곽 글로우: 다음 섹션 존재감을 은은하게 강조 */}
        <div aria-hidden className="pointer-events-none absolute -top-10 left-0 right-0 h-12 z-[-1]">
          <div className="h-full w-full bg-gradient-to-t from-white/70 via-white/30 to-transparent blur-2xl" />
        </div>
        <div className="w-full">
          {/* Featured communities */}
          <section className="mt-4 sm:mt-6 md:mt-10 lg:mt-10 w-full">
              {/* 섹션 타이틀 영역 */}
              <div ref={popularRef} className={`mb-10 text-center transition-all duration-700 ease-out ${popularVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                <div className={`relative inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-slate-300/70 bg-gradient-to-r from-slate-50/95 via-slate-100/95 to-slate-200/90 text-slate-800 shadow-sm ring-1 ring-white/60 backdrop-blur-sm transition-all duration-700 ${popularVisible ? 'scale-100' : 'scale-95'} shadow-[0_0_0_3px_rgba(255,255,255,0.02),_0_10px_30px_rgba(2,6,23,0.06)]`}>
                  <Flame className="w-4 h-4 text-slate-500" />
                  <span className="text-[15px] font-semibold tracking-wide">Popular</span>
                  {/* shimmer */}
                  <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
                    <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/70 to-transparent opacity-60 animate-[shine_1.8s_linear_infinite]" />
                  </span>
                </div>
                <h2 className={`mt-5 text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 bg-clip-text text-transparent transition-all duration-1000 ${popularVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                  다양한 커뮤니티가 머무는 공간
                </h2>
                   {/* 서브 텍스트 */}
                    <p className={`mt-4 text-base sm:text-lg text-slate-800 max-w-2xl mx-auto transition-all duration-1000 ease-out delay-100 ${popularVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
                    만들기 쉽고, 운영은 가볍게, 성장은 자연스럽게.
                  </p>
                <style jsx>{`
                  @keyframes shine { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
                `}</style>
              </div>
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
                  {communities.length > 0 ? (
                    [...communities, ...communities].map((c, index) => (
                      <Card
                        key={`${c.id}-${index}`}
                        className="w-[350px] flex-shrink-0 cursor-pointer border border-slate-300 bg-white rounded-xl hover:border-slate-400 hover:shadow-lg shadow-sm transition-all duration-200 overflow-hidden p-0"
                        onClick={() => !isDragging && router.push(`/${c.slug}`)}
                      >
                        {/* 상단 대표 이미지 */}
                        <div className="w-full h-50 bg-slate-100 relative">
                          {(() => {
                            const topUrl = bannerMap[c.slug] || (c as any)?.thumb_url || getVersionedUrl((c as any)?.image_url, (c as any)?.updated_at)
                            return topUrl ? (
                              <Image src={topUrl} alt="banner" fill className="object-cover" sizes="350px" priority={index < 2} />
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
                                <Image src={((c as any).icon_url || (c as any).image_url) as any} alt="icon" width={32} height={32} className="object-cover" />
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
                            <span>멤버 {Math.max(0, (c as any).member_count ? Number((c as any).member_count) - 1 : 0)}명</span>
                            <span className="flex items-center gap-1"><span className="text-slate-400">•</span>{c.category}</span>
                          </div>
                        </div>
                      </Card>
                    ))
                  ) : (
                    Array.from({ length: 6 }).map((_, idx) => (
                      <div key={`skeleton-${idx}`} className="w-[350px] flex-shrink-0 border border-slate-200 bg-white rounded-xl overflow-hidden">
                        <div className="w-full h-50 bg-slate-100 animate-pulse" />
                        <div className="p-4 space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-md bg-slate-200 animate-pulse" />
                            <div className="flex-1 min-w-0">
                              <div className="h-4 w-1/2 bg-slate-200 rounded animate-pulse" />
                              <div className="mt-2 h-3 w-3/4 bg-slate-200 rounded animate-pulse" />
                            </div>
                          </div>
                          <div className="h-3 w-2/3 bg-slate-200 rounded animate-pulse" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
                
                {/* 그라데이션 fade 효과 */}
                <div className="absolute top-0 left-0 w-8 h-full bg-gradient-to-r from-white to-transparent pointer-events-none z-10" />
                <div className="absolute top-0 right-0 w-8 h-full bg-gradient-to-l from-white to-transparent pointer-events-none z-10" />
              </div>

              {/* 블랙 섹션 (커뮤니티 운영의 새로운 기준 ~ 하위 콘텐츠) */}
              <div className="-mx-3 sm:-mx-4 md:-mx-6 lg:-mx-8 xl:-mx-10 bg-black text-white mt-35 relative">
                {/* 상단 외곽 글로우: 윗 섹션과 자연스러운 연결 (카드 위로 겹치지 않도록 z-[-1]) */}
                <div aria-hidden className="pointer-events-none absolute -top-10 left-0 right-0 h-12 z-[-1]">
                  <div className="h-full w-full bg-gradient-to-t from-black/70 via-black/30 to-transparent blur-2xl" />
                </div>
                <div ref={ctaRef} className="relative px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 py-14">
                {/* 배경 그라데이션 장식 */}
                <div className="absolute inset-0 -top-12 -bottom-12 bg-gradient-to-b from-transparent via-white/10 to-transparent pointer-events-none" />
                
                {/* 콘텐츠 */}
                <div className="relative z-10 text-center max-w-5xl mx-auto px-4">
                  {/* 상단 뱃지 */}
                  <div className={`relative inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-slate-300/70 bg-gradient-to-r from-slate-50/95 via-slate-100/95 to-slate-200/90 text-slate-800 text-sm font-semibold mb-6 ring-1 ring-white/60 backdrop-blur-sm shadow-[0_0_0_3px_rgba(255,255,255,0.02),_0_10px_30px_rgba(2,6,23,0.06)] transition-all duration-1000 ease-out ${ctaVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-6 scale-95'}`}>
                    <span className="inline-block size-1.5 rounded-full bg-slate-500/90" />
                    <span>커뮤니티 운영의 새로운 기준</span>
                    <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
                      <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/70 to-transparent opacity-60 animate-[shine_1.8s_linear_infinite]" />
                    </span>
                  </div>
 
                  {/* 메인 타이틀 */}
                  <h3 className={`text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-tight transition-all duration-1000 ease-out ${ctaVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>   
                    오직 커뮤니티를 위한 운영 솔루션
                  </h3>
 
                  {/* 서브 텍스트 */}
                  <p className={`mt-4 text-base sm:text-lg text-white/90 max-w-2xl mx-auto transition-all duration-1000 ease-out delay-100 ${ctaVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
                    멤버들과 함께 성장하고, 당신의 커뮤니티 영향력을 확장하세요!
                  </p>
 
                  {/* 미리보기 (모니터 스타일) */}
                  <div className={`mt-8 mx-auto max-w-7xl px-2 sm:px-4 md:px-6 transition-all duration-1000 ease-out delay-150 ${ctaVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                    <div className="rounded-[28px] bg-gradient-to-br from-indigo-950/70 to-slate-900/70 p-1.5 ring-2 ring-white/50 shadow-[0_0_40px_rgba(255,255,255,0.12),_0_16px_60px_rgba(0,0,0,0.55)]">
                      <div className="rounded-[24px] bg-white/95 backdrop-blur-sm border border-white p-2 md:p-3 shadow-lg">
                        <div className="relative rounded-2xl overflow-hidden border border-white bg-slate-100 aspect-[16/10]">
                          <span className="pointer-events-none absolute -inset-2 rounded-[20px] shadow-[0_0_60px_20px_rgba(255,255,255,0.12)]" />
                          <Image src="/logos/511.png" alt="커뮤니티 대시보드 미리보기" fill priority className="object-cover" />
                        </div>
                      </div>
                    </div>
                  </div>
 
                  {/* CTA 버튼 */}
                  <div className={`mt-15 transition-all duration-1000 ease-out delay-200 ${ctaVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
                    <button
                      onClick={() => router.push('/explore')}
                      className="group relative inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold cursor-pointer transition-all duration-300 bg-white text-slate-900 hover:bg-white/90 hover:-translate-y-0.5 active:translate-y-0 shadow-[0_10px_30px_rgba(255,255,255,0.25)] hover:shadow-[0_16px_40px_rgba(255,255,255,0.35)] ring-1 ring-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white overflow-hidden"
                    >
                      {/* 버튼 내부 샤인 효과 */}
                      <span className="absolute inset-0 bg-gradient-to-r from-white to-white opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
                       
                      {/* 버튼 텍스트 */}
                      <span className="relative flex items-center gap-2">
                        다른 루트 둘러보기
                        <svg 
                          className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1.5" 
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </span>
                      {/* 외곽 하이라이트 */}
                      <span className="pointer-events-none absolute -inset-px rounded-full ring-1 ring-white/40" />
                    </button>
                  </div>
                </div>
              </div>
              </div>
              
              {/* 블랙 섹션과 푸터 자연 연결용 스페이서 */}
              <div className="bg-black h-15 -mx-3 sm:-mx-4 md:-mx-6 lg:-mx-8 xl:-mx-10" />
               
              {/* (이 섹션 전용) 시간 기반 지연 없이 뷰포트 진입 시 트랜지션 */}
            </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}
