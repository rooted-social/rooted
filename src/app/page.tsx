"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
// import { Button } from "@/components/ui/button"
// 기존 AnimatedBackground 제거
// HeroOrbs 제거
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useAuthData } from "@/components/auth/AuthProvider"
import HeroConnections from "@/components/HeroConnections"
import { fetchExploreCommunities } from "@/lib/dashboard"
import Image from "next/image"
import { getVersionedUrl } from "@/lib/utils"
import type { Community } from "@/types/community"
import { Flame, Users, FileText, Megaphone, CalendarDays, GraduationCap, BarChart3, ChevronRight, Check, HelpCircle } from "lucide-react"
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
  const [desiredSlug, setDesiredSlug] = useState("")
  const [featuresVisible, setFeaturesVisible] = useState(false)
  const featuresRef = useRef<HTMLDivElement>(null)
  const [whoWhyVisible, setWhoWhyVisible] = useState(false)
  const whoWhyRef = useRef<HTMLDivElement>(null)

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

  // CTA 섹션: 뷰포트 진입 시 한 번만 노출 애니메이션 (모바일 호환 강화)
  useEffect(() => {
    const el = ctaRef.current
    if (!el) return
    // Fallback: 지원 안 하거나 매우 작은 화면에서 관찰이 지연될 경우 대비
    if (typeof IntersectionObserver === 'undefined') {
      setCtaVisible(true)
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setCtaVisible(true)
          observer.disconnect()
        }
      },
      { root: null, threshold: 0.15, rootMargin: '0px 0px -10% 0px' }
    )
    observer.observe(el)

    // 추가 스크롤 체크(일부 모바일 브라우저에서 관찰이 느릴 때)
    const check = () => {
      const r = el.getBoundingClientRect()
      if (r.top < (typeof window !== 'undefined' ? window.innerHeight * 0.9 : 0)) {
        setCtaVisible(true)
        window.removeEventListener('scroll', check)
      }
    }
    window.addEventListener('scroll', check, { passive: true })
    check()

    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', check)
    }
  }, [])

  const generateSlug = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")

  const handleCreateCta = () => {
    const target = desiredSlug ? `/create?slug=${encodeURIComponent(desiredSlug)}` : "/create"
    if (user) {
      router.push(target)
      return
    }
    try { if (typeof window !== 'undefined') localStorage.setItem('rooted:return_to', target) } catch {}
    router.push('/signup')
  }

  // 인기 섹션 타이틀: 스크롤 진입 시 애니메이션 (옵션 완화)
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
      { root: null, threshold: 0.15, rootMargin: '0px 0px -10% 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // 블랙 섹션의 기능 그리드: 뷰포트 진입 시 애니메이션 (옵션 완화)
  useEffect(() => {
    const el = featuresRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setFeaturesVisible(true)
          observer.disconnect()
        }
      },
      { root: null, threshold: 0.12, rootMargin: '0px 0px -10% 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Who & Why 섹션 애니메이션 진입
  useEffect(() => {
    const el = whoWhyRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setWhoWhyVisible(true)
          observer.disconnect()
        }
      },
      { root: null, threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
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
          {/* 상단 뱃지 (히어로 상단) */}
          <div className="overflow-hidden">
            <div className="inline-block will-change-transform reveal-line" style={{ animationDelay: '20ms' }}>
              <div className="relative inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/70 bg-gradient-to-r from-slate-50/95 via-slate-100/95 to-slate-200/90 text-slate-800 text-sm font-semibold mb-4 ring-1 ring-white/60 backdrop-blur-sm shadow-[0_0_0_3px_rgba(255,255,255,0.02),_0_10px_30px_rgba(2,6,23,0.06)]">
                <span className="inline-block size-1.5 rounded-full bg-slate-500/90" />
                <span>Connect & Grow</span>
                <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
                  <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/70 to-transparent opacity-60 animate-[shine_1.8s_linear_infinite]" />
                </span>
              </div>
            </div>
          </div>
          <div className="overflow-hidden">
            <h1 className="text-white text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.05]">
              <span className="block will-change-transform reveal-line" style={{ animationDelay: '80ms' }}>Your Community</span>
              <span className="block will-change-transform reveal-line" style={{ animationDelay: '200ms' }}>Platform</span>
            </h1>
          </div>
          <div className="mt-5 overflow-hidden">
            <p className="text-slate-100 text-base sm:text-lg will-change-transform reveal-line" style={{ animationDelay: '380ms' }}>
              멤버십, 클래스, 소통, 일정, 멤버 관리 — 한 곳에서.
            </p>
          </div>
          <div className="mt-8 overflow-visible relative z-[60]">
            <div className="mx-auto w-full max-w-xl flex flex-col sm:flex-row items-stretch gap-2 sm:gap-3 will-change-transform reveal-line" style={{ animationDelay: '440ms' }}>
              <div className="flex-1">
                <div className="flex items-center overflow-hidden rounded-2xl bg-white/95 backdrop-blur-xl border border-white/70 ring-1 ring-white/70 focus-within:ring-2 focus-within:ring-white/90">
                  <span className="pl-4 pr-0 text-slate-500 select-none">rooted.kr/</span>
                  <Input
                    value={desiredSlug}
                    onChange={(e)=> setDesiredSlug(generateSlug(e.target.value))}
                    placeholder="your-community"
                    className="h-12 border-0 bg-transparent pl-0 pr-3 focus-visible:ring-0 focus:outline-none text-slate-900 placeholder:text-slate-400"
                  />
                </div>
              </div>
              <button
                onClick={handleCreateCta}
                className="group relative z-[60] inline-flex items-center justify-center gap-2 px-7 h-12 rounded-2xl font-semibold cursor-pointer transition-all duration-300 text-cyan-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70 hover:-translate-y-0.5 active:translate-y-0 overflow-hidden w-full sm:w-auto"
              >
                {/* base glass */}
                <span className="pointer-events-none absolute inset-0 rounded-2xl bg-slate-900/45 backdrop-blur-[2px]" />
                {/* neon border + glow */}
                <span className="pointer-events-none absolute inset-0 rounded-2xl border border-white-200/60" />
                <span className="pointer-events-none absolute -inset-px rounded-2xl [box-shadow:0_0_0_1px_rgba(34,211,238,0.35),0_0_14px_rgba(34,211,238,0.42),inset_0_0_26px_rgba(34,211,238,0.16)] group-hover:[box-shadow:0_0_0_1px_rgba(34,211,238,0.45),0_0_22px_rgba(34,211,238,0.62),inset_0_0_36px_rgba(34,211,238,0.22)] transition-all duration-300" />
                {/* sweeping shine (stays at end using forwards) */}
                <span className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.8),transparent)] opacity-70 group-hover:animate-[shine_0.8s_ease-out_forwards] rounded-2xl" />
                {/* persistent filled shine after sweep (appears slightly after hover) */}
                <span className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-r from-white-300/10 via-white-200/12 to-white-300/10 opacity-0 transition-opacity duration-300 group-hover:opacity-25 group-hover:delay-[1100ms]" />
                {/* label */}
                <span className="relative z-10 text-white transition-colors duration-200 group-hover:text-white-900">내 커뮤니티 생성하기</span>
                <ChevronRight className="relative z-10 w-4 h-4 text-cyan-100/90 transition-all duration-200 group-hover:text-white-900 group-hover:translate-x-0.5" />
              </button>
            </div>
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
          @keyframes shine { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
          @keyframes glint {
            0% { transform: translateX(0); opacity: 0; }
            10% { opacity: 1; }
            60% { transform: translateX(140px); opacity: 1; }
            100% { transform: translateX(200px); opacity: 0; }
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
                <div className="relative z-10 text-center max-w-6xl mx-auto px-2">
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

                  {/* 기능 하이라이트 섹션 */}
                  <div ref={featuresRef} className="mt-18">
                    <div className={`relative mx-auto max-w-6xl transition-all duration-700 ease-out ${featuresVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
                      {/* 섬세한 상단 헤어라인 */}
                      <div aria-hidden className="h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent mb-5" />
                      {/* 섹션 서브 타이틀 */}
                      <div className={`mb-7 text-center text-[13px] tracking-[0.18em] uppercase ${featuresVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'} transition-all duration-700 text-white/70`}>Features</div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 sm:gap-x-8 lg:gap-x-10 gap-y-6 sm:gap-y-10 lg:gap-y-14 text-left">
                        {/* 1. 멤버십ㆍ수익화 */}
                        <div className={`relative ${featuresVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'} transition-all duration-700`} style={{ transitionDelay: featuresVisible ? '60ms' : '0ms' }}>
                          <div className="relative rounded-2xl border border-white/15 bg-gradient-to-b from-white/5 to-transparent p-5 sm:p-6 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
                            <span className="absolute -inset-1 rounded-2xl pointer-events-none [mask-image:radial-gradient(60%_40%_at_50%_0%,rgba(255,255,255,0.25),transparent)]" />
                            <div className="mb-1 text-[11px] uppercase tracking-wider text-white/55">Membership</div>
                            <div className="mb-4 flex items-center gap-3 text-white">
                              <Users className="w-5 h-5 text-white/85" />
                              <h4 className="text-lg font-semibold text-white">멤버십ㆍ수익화</h4>
                            </div>
                            <ul className="mt-3 space-y-2 text-sm text-white/75">
                              <li className="flex items-start gap-2"><Check className="mt-0.5 w-4 h-4 text-white/80" /><span>멤버 관리</span></li>
                              <li className="flex items-start gap-2"><Check className="mt-0.5 w-4 h-4 text-white/80" /><span>결제/구독 기반 수익화</span></li>
                              <li className="flex items-start gap-2"><Check className="mt-0.5 w-4 h-4 text-white/80" /><span>초대/가입 승인흐름</span></li>
                            </ul>
                          </div>
                        </div>

                        {/* 2. 콘텐츠 */}
                        <div className={`relative ${featuresVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'} transition-all duration-700`} style={{ transitionDelay: featuresVisible ? '120ms' : '0ms' }}>
                          <div className="relative rounded-2xl border border-white/15 bg-gradient-to-b from-white/5 to-transparent p-5 sm:p-6 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
                            <span className="absolute -inset-1 rounded-2xl pointer-events-none [mask-image:radial-gradient(60%_40%_at_50%_0%,rgba(255,255,255,0.25),transparent)]" />
                            <div className="mb-1 text-[11px] uppercase tracking-wider text-white/55">Content</div>
                            <div className="mb-4 flex items-center gap-3 text-white">
                              <FileText className="w-5 h-5 text-white/85" />
                              <h4 className="text-lg font-semibold text-white">콘텐츠</h4>
                            </div>
                            <ul className="mt-3 space-y-2 text-sm text-white/75">
                              <li className="flex items-start gap-2"><Check className="mt-0.5 w-4 h-4 text-white/80" /><span>피드/포스트/댓글</span></li>
                              <li className="flex items-start gap-2"><Check className="mt-0.5 w-4 h-4 text-white/80" /><span>파일/이미지 업로드</span></li>
                              <li className="flex items-start gap-2"><Check className="mt-0.5 w-4 h-4 text-white/80" /><span>검색/알림/좋아요</span></li>
                            </ul>
                          </div>
                        </div>

                        {/* 3. 공지ㆍ소통 */}
                        <div className={`relative ${featuresVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'} transition-all duration-700`} style={{ transitionDelay: featuresVisible ? '180ms' : '0ms' }}>
                          <div className="relative rounded-2xl border border-white/15 bg-gradient-to-b from-white/5 to-transparent p-5 sm:p-6 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
                            <span className="absolute -inset-1 rounded-2xl pointer-events-none [mask-image:radial-gradient(60%_40%_at_50%_0%,rgba(255,255,255,0.25),transparent)]" />
                            <div className="mb-1 text-[11px] uppercase tracking-wider text-white/55">Communication</div>
                            <div className="mb-4 flex items-center gap-3 text-white">
                              <Megaphone className="w-5 h-5 text-white/85" />
                              <h4 className="text-lg font-semibold text-white">공지ㆍ소통</h4>
                            </div>
                            <ul className="mt-3 space-y-2 text-sm text-white/75">
                              <li className="flex items-start gap-2"><Check className="mt-0.5 w-4 h-4 text-white/80" /><span>공지/알림</span></li>
                              <li className="flex items-start gap-2"><Check className="mt-0.5 w-4 h-4 text-white/80" /><span>메시지(추후 예정)</span></li>
                              <li className="flex items-start gap-2"><Check className="mt-0.5 w-4 h-4 text-white/80" /><span>커뮤니티 가이드라인</span></li>
                            </ul>
                          </div>
                        </div>

                        {/* 4. 일정 관리 */}
                        <div className={`relative ${featuresVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'} transition-all duration-700`} style={{ transitionDelay: featuresVisible ? '240ms' : '0ms' }}>
                          <div className="relative rounded-2xl border border-white/15 bg-gradient-to-b from-white/5 to-transparent p-5 sm:p-6 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
                            <span className="absolute -inset-1 rounded-2xl pointer-events-none [mask-image:radial-gradient(60%_40%_at_50%_0%,rgba(255,255,255,0.25),transparent)]" />
                            <div className="mb-1 text-[11px] uppercase tracking-wider text-white/55">Events</div>
                            <div className="mb-4 flex items-center gap-3 text-white">
                              <CalendarDays className="w-5 h-5 text-white/85" />
                              <h4 className="text-lg font-semibold text-white">일정 관리</h4>
                            </div>
                            <ul className="mt-3 space-y-2 text-sm text-white/75">
                              <li className="flex items-start gap-2"><Check className="mt-0.5 w-4 h-4 text-white/80" /><span>일정 등록 및 공유</span></li>
                              <li className="flex items-start gap-2"><Check className="mt-0.5 w-4 h-4 text-white/80" /><span>이벤트 참여 및 체크인</span></li>
                              <li className="flex items-start gap-2"><Check className="mt-0.5 w-4 h-4 text-white/80" /><span>대시보드 이벤트 항목 추가</span></li>
                            </ul>
                          </div>
                        </div>

                        {/* 5. 클래스 운영 */}
                        <div className={`relative ${featuresVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'} transition-all duration-700`} style={{ transitionDelay: featuresVisible ? '300ms' : '0ms' }}>
                          <div className="relative rounded-2xl border border-white/15 bg-gradient-to-b from-white/5 to-transparent p-5 sm:p-6 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
                            <span className="absolute -inset-1 rounded-2xl pointer-events-none [mask-image:radial-gradient(60%_40%_at_50%_0%,rgba(255,255,255,0.25),transparent)]" />
                            <div className="mb-1 text-[11px] uppercase tracking-wider text-white/55">Classes</div>
                            <div className="mb-4 flex items-center gap-3 text-white">
                              <GraduationCap className="w-5 h-5 text-white/85" />
                              <h4 className="text-lg font-semibold text-white">클래스 운영</h4>
                            </div>
                            <ul className="mt-3 space-y-2 text-sm text-white/75">
                              <li className="flex items-start gap-2"><Check className="mt-0.5 w-4 h-4 text-white/80" /><span>강의 및 자료 등록</span></li>
                              <li className="flex items-start gap-2"><Check className="mt-0.5 w-4 h-4 text-white/80" /><span>수강 여부 관리</span></li>
                              <li className="flex items-start gap-2"><Check className="mt-0.5 w-4 h-4 text-white/80" /><span>결제/쿠폰 (추후 예정)</span></li>
                            </ul>
                          </div>
                        </div>

                        {/* 6. 통합 대시보드 */}
                        <div className={`relative ${featuresVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'} transition-all duration-700`} style={{ transitionDelay: featuresVisible ? '360ms' : '0ms' }}>
                          <div className="relative rounded-2xl border border-white/15 bg-gradient-to-b from-white/5 to-transparent p-5 sm:p-6 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
                            <span className="absolute -inset-1 rounded-2xl pointer-events-none [mask-image:radial-gradient(60%_40%_at_50%_0%,rgba(255,255,255,0.25),transparent)]" />
                            <div className="mb-1 text-[11px] uppercase tracking-wider text-white/55">Dashboard</div>
                            <div className="mb-4 flex items-center gap-3 text-white">
                              <BarChart3 className="w-5 h-5 text-white/85" />
                              <h4 className="text-lg font-semibold text-white">통합 대시보드</h4>
                            </div>
                            <ul className="mt-3 space-y-2 text-sm text-white/75">
                              <li className="flex items-start gap-2"><Check className="mt-0.5 w-4 h-4 text-white/80" /><span>활동/참여/매출 분석</span></li>
                              <li className="flex items-start gap-2"><Check className="mt-0.5 w-4 h-4 text-white/80" /><span>성장 지표/리텐션</span></li>
                              <li className="flex items-start gap-2"><Check className="mt-0.5 w-4 h-4 text-white/80" /><span>대시보드 커스터마이징</span></li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 대상/고민 섹션 - 다른 레이아웃으로 생동감 부여 (항상 펼침) */}
                  <div ref={whoWhyRef} className={`mt-18 transition-all duration-900 ease-out ${whoWhyVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                    <div className="mx-auto max-w-6xl">
                      {/* 상단 헤어라인 구분선 */}
                      <div aria-hidden className="h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent mb-10" />
                      {/* 섹션 헤더: 배지 + 타이틀 + 서브타이틀 */}
                      <div className="text-center mb-8">
                        {/* 배지: Popular 스타일과 동일 */}
                        <div className={`relative inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-slate-300/70 bg-gradient-to-r from-slate-50/95 via-slate-100/95 to-slate-200/90 text-slate-800 shadow-sm ring-1 ring-white/60 backdrop-blur-sm shadow-[0_0_0_3px_rgba(255,255,255,0.02),_0_10px_30px_rgba(2,6,23,0.06)]`}>
                          <span className="text-[13px] font-semibold tracking-wide">Who & Why</span>
                          <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
                            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/70 to-transparent opacity-60 animate-[shine_1.8s_linear_infinite]" />
                          </span>
                        </div>
                        <h3 className="mt-4 text-2xl sm:text-3xl font-bold text-white">누구에게, 왜 필요한가</h3>
                        <p className="mt-2 text-white/80">이제 한 곳에서 당신의 전문성과 노하우를 공유하고 소통하세요.</p>
                      </div>

                      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 transition-all duration-900 ease-out ${whoWhyVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}>
                        {/* 이런 분들에게 적합해요! - 항상 펼침, 사람 아이콘 */}
                        <div className={`group relative w-full overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-b from-white/5 to-transparent p-6 text-left shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] transition-all duration-900 ease-out ${whoWhyVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`} style={{ transitionDelay: whoWhyVisible ? '80ms' : '0ms' }}>
                          <div className="flex items-center gap-3">
                            <Users className="w-5 h-5 text-white/85" />
                            <h4 className="text-white font-semibold text-lg">누구에게 필요할까요?</h4>
                          </div>
                          <div>
                            <ul className="mt-4 space-y-3 text-white/90">
                              <li className="flex gap-3 items-start"><span className="mt-2 size-1.5 rounded-full bg-white/70" />자신만의 커뮤니티를 만들고 싶은 크리에이터</li>
                              <li className="flex gap-3 items-start"><span className="mt-2 size-1.5 rounded-full bg-white/70" />강의/클래스를 운영하며 수익화를 고민하는 전문가</li>
                              <li className="flex gap-3 items-start"><span className="mt-2 size-1.5 rounded-full bg-white/70" />단순한 오픈채팅보다 깊은 관계를 원하는 그룹 리더</li>
                              <li className="flex gap-3 items-start"><span className="mt-2 size-1.5 rounded-full bg-white/70" />팬들과의 연결을 강화하고 싶은 아티스트</li>
                              <li className="flex gap-3 items-start"><span className="mt-2 size-1.5 rounded-full bg-white/70" />회원들을 모아 꾸준히 소통하고 싶은 모임의 리더</li>
                              <li className="flex gap-3 items-start"><span className="mt-2 size-1.5 rounded-full bg-white/70" />브랜드나 팀 문화를 함께 성장시키고 싶은 운영자</li>
                            </ul>
                          </div>
                          <span className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-white/15" />
                          <div className="absolute -top-24 -left-24 size-[220px] rounded-full bg-white/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>

                        {/* 이런 고민을 하고 계신가요? - 항상 펼침 */}
                        <div className={`group relative w-full overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-b from-slate-50/10 to-transparent p-6 text-left shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] transition-all duration-900 ease-out ${whoWhyVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`} style={{ transitionDelay: whoWhyVisible ? '160ms' : '0ms' }}>
                          <div className="flex items-center gap-3">
                            <HelpCircle className="w-5 h-5 text-white/85" />
                            <h4 className="text-white font-semibold text-lg">이런 고민을 하고 계신가요?</h4>
                          </div>
                          <div>
                            <div className="mt-4 space-y-3">
                              <div className="rounded-xl border border-white/15 bg-white/5 p-3">
                                <p className="text-sm">“N사의 카페는 너무 복잡하고, K사의 오픈챗은 관리가 힘들다”</p>
                                <p className="text-sm text-white/70 mt-1">→ 루티드는 직관적이고 깔끔한 커뮤니티 공간을 제공합니다.</p>
                              </div>
                              <div className="rounded-xl border border-white/15 bg-white/5 p-3">
                                <p className="text-sm">“내 콘텐츠를 수익화하고 싶은데 방법을 모르겠다”</p>
                                <p className="text-sm text-white/70 mt-1">→ 멤버십·커뮤니티 관리 기능으로 쉽게 수익화할 수 있어요.</p>
                              </div>
                              <div className="rounded-xl border border-white/15 bg-white/5 p-3">
                                <p className="text-sm">“나의 멤버들과 진짜 소속감을 키우고 공유하고 싶다”</p>
                                <p className="text-sm text-white/70 mt-1">→ 진정한 연결감과 지속적인 성장 경험을 지원합니다.</p>
                              </div>
                            </div>
                          </div>
                          <span className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-white/15" />
                          <div className="absolute -top-24 -right-24 size-[220px] rounded-full bg-white/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>

                      {/* 하단 CTA: 내 커뮤니티 생성하기 (Explore 버튼 스타일) */}
                      <div className={`mt-10 text-center transition-all duration-900 ease-out ${whoWhyVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`} style={{ transitionDelay: whoWhyVisible ? '240ms' : '0ms' }}>
                        <button
                          onClick={handleCreateCta}
                          className="group relative inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold cursor-pointer transition-all duration-300 bg-white text-slate-900 hover:bg-white/90 hover:-translate-y-0.5 active:translate-y-0 shadow-[0_10px_30px_rgba(255,255,255,0.25)] hover:shadow-[0_16px_40px_rgba(255,255,255,0.35)] ring-1 ring-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white overflow-hidden"
                        >
                          <span className="absolute inset-0 bg-gradient-to-r from-white to-white opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
                          <span className="relative flex items-center gap-2">
                            내 커뮤니티 생성하기
                            <svg 
                              className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1.5" 
                              fill="none" 
                              viewBox="0 0 24 24" 
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                          </span>
                          <span className="pointer-events-none absolute -inset-px rounded-full ring-1 ring-white/40" />
                        </button>
                      </div>
                    </div>
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
