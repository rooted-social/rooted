"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
// import { Button } from "@/components/ui/button"
import { AnimatedBackground } from "@/components/AnimatedBackground"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { getCommunities } from "@/lib/communities"
import type { Community } from "@/types/community"
import { Flame, Sparkles, Sprout, ChevronDown, ChevronUp, Users, FileText, Megaphone, CalendarDays, GraduationCap, BarChart3 } from "lucide-react"

export default function HomePage() {
  const router = useRouter()
  const [communities, setCommunities] = useState<Community[]>([])
  const [isAboutOpen, setIsAboutOpen] = useState(false)
  const [isServicesOpen, setIsServicesOpen] = useState(false)
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

  const totalMembers = communities.reduce((sum, c) => sum + (c.member_count || 0), 0)

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
    <div className="min-h-screen relative overflow-hidden">
      <AnimatedBackground />

      {/* Main Content */}
      <main className="relative px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 pt-6 sm:pt-6 md:pt-6 lg:pt-6 pb-28 z-10">
        <div className="w-full">
          {/* Hero */}
          <div className="pt-2 max-w-6xl pb-10 sm:pb-12 md:pb-16 lg:pb-20">
            <div className="flex flex-col">
              {/* Left: copy & CTA */}
              <div className="text-center md:text-left">
                <div className="refined-banner relative inline-flex items-center gap-3 text-slate-800 px-5 sm:px-6 py-1 rounded-full text-sm font-semibold mb-6 bg-gradient-to-r from-amber-100 via-amber-50 to-orange-100 border border-amber-200 shadow-sm ring-1 ring-white/50 backdrop-blur-[2px]">
                  <div className="flex items-center justify-center w-7 h-7 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full shadow-md ring-1 ring-white/70">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <span className="whitespace-nowrap relative z-10">Connect Deeply, Grow Widely</span>
                </div>
                <h1 className="text-[clamp(1.9rem,8vw,2.25rem)] sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold leading-[1.1] tracking-tight mb-4 md:whitespace-nowrap">
                  <span className="block sm:inline"> 커뮤니티의 시작과 성장, </span>
                  <br className="block sm:hidden" />
                  <span className="text-transparent bg-gradient-to-r from-amber-500 to-amber-600 bg-clip-text">루티드</span>
                </h1>
                <div className="flex flex-col">
                  <p className="text-[clamp(1rem,4.5vw,1.125rem)] sm:text-lg md:text-xl text-slate-600 leading-relaxed">
                    <span className="block sm:inline">시작은 간편하게, 운영은 강력하게.</span>
                    <br className="block sm:hidden" />
                    <span className="block sm:inline"> 멤버 모집부터 수익화까지 한 번에!</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Featured communities */}
          {communities.length > 0 && (
            <section className="mt-10 sm:mt-12 md:mt-16 lg:mt-20 w-full">
              <h2 className="text-xl font-semibold mb-4 flex items-center justify-center md:justify-start gap-2">
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
                      className="w-[350px] h-[145px] flex-shrink-0 cursor-pointer border border-slate-400 bg-white rounded-xl hover:border-slate-500 hover:shadow-lg shadow-sm transition-all duration-200 gap-3 py-5" 
                      onClick={() => !isDragging && router.push(`/${c.slug}`)}
                    >
                                          <CardHeader className="pb-0 relative px-4">
                      {/* 카테고리 스티커 - 카드 우측 상단 테두리 */}
                      <div className="absolute -top-2 -right-2 z-10">
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-900 text-white text-xs font-medium shadow-lg border-2 border-white">
                          {c.category}
                        </span>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-md overflow-hidden bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-300">
                          {(c as any)?.image_url ? (
                            <img src={(c as any).image_url as any} alt="icon" className="w-full h-full object-cover" />
                          ) : (
                            <span className="font-semibold text-sm">{c.name[0]}</span>
                          )}
                        </div>
                        <div className="flex-1 pt-0.5">
                          <CardTitle className="text-base font-semibold text-slate-900 leading-tight">
                            <div className={(c.name?.length || 0) >= 10 ? 'marquee' : 'truncate'}>
                              <span>{c.name}</span>
                            </div>
                          </CardTitle>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                            <span>멤버 {c.member_count}명</span>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                      <CardContent className="pt-0 px-4">
                        <CardDescription className="text-sm text-slate-600 line-clamp-2">{c.description}</CardDescription>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {/* 그라데이션 fade 효과 */}
                <div className="absolute top-0 left-0 w-8 h-full bg-gradient-to-r from-white to-transparent pointer-events-none z-10" />
                <div className="absolute top-0 right-0 w-8 h-full bg-gradient-to-l from-white to-transparent pointer-events-none z-10" />
              </div>
            </section>
          )}

          {/* What is Root - Enhanced Section */}
          <section className="mt-10 sm:mt-10 md:mt-10 lg:mt-10 w-full">
            <button
              onClick={() => setIsAboutOpen(!isAboutOpen)}
              className="w-full flex items-center justify-between p-4 sm:p-5 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 hover:from-emerald-100 hover:via-teal-100 hover:to-cyan-100 border-1 border-neutral-900/60 hover:border-neutral-900/70 rounded-2xl transition-all duration-300 group cursor-pointer shadow-sm hover:shadow-md backdrop-blur-sm"
            >
              <div className="flex items-center gap-3">
                <div className="relative p-2 sm:p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                  <Sprout className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  <div className="absolute inset-0 bg-white/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                <div className="flex flex-col items-start">
                  <h2 className="text-base sm:text-lg font-bold text-neutral-900 group-hover:text-neutral-900 transition-colors">
                    루트가 뭔가요?
                  </h2>
                  <p className="text-xs text-neutral-700 font-medium mt-0.5">
                    커뮤니티 플랫폼의 핵심 철학
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden sm:block text-xs text-neutral-800 font-medium">
                  {isAboutOpen ? '접기' : '자세히'}
                </div>
                <div className="p-1.5 bg-white/70 hover:bg-white rounded-lg transition-colors duration-200 shadow-sm">
                  {isAboutOpen ? (
                    <ChevronUp className="w-4 h-4 text-neutral-900" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-neutral-900" />
                  )}
                </div>
              </div>
            </button>
            
            {isAboutOpen && (
              <div className="mt-6 sm:mt-8 animate-in slide-in-from-top-2 duration-300 ease-out">
                <Card className="group border-0 bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/30 backdrop-blur-sm shadow-md overflow-hidden">
                  <CardContent className="p-6 sm:p-7">
                    <div className="flex items-start gap-3 text-left">
                      <div className="mt-0.5 w-7 h-7 rounded-md bg-emerald-100 flex items-center justify-center">
                        <Sprout className="w-4 h-4 text-emerald-700" />
                      </div>
                      <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
                        <span className="font-semibold">루트(Root)</span>는 뿌리로서, 생명의 근본이 됩니다. 하나의 커뮤니티인 당신만의 <span className="font-semibold">루트</span>를 만들어 나만이 가진 전문성과 노하우를 공유하고 커뮤니티의 힘을 키워가세요!
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </section>

          {/* Services - Enhanced Section */}
          <section className="mt-5 sm:mt-6 md:mt-6 lg:mt-6 w-full">
            <button
              onClick={() => setIsServicesOpen(!isServicesOpen)}
              className="w-full flex items-center justify-between p-4 sm:p-5 bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 hover:from-amber-100 hover:via-orange-100 hover:to-red-100 border-1 border-neutral-900/60 hover:border-neutral-900/70 rounded-2xl transition-all duration-300 group cursor-pointer shadow-sm hover:shadow-md backdrop-blur-sm"
            >
              <div className="flex items-center gap-3">
                <div className="relative p-2 sm:p-2.5 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  <div className="absolute inset-0 bg-white/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                <div className="flex flex-col items-start">
                  <h2 className="text-base sm:text-lg font-bold text-neutral-900 group-hover:text-neutral-900 transition-colors">
                    커뮤니티를 위한 모든 기능을 한번에!
                  </h2>
                  <p className="text-xs text-neutral-800 font-medium mt-0.5">
                    커뮤니티 운영을 위한 올인원 솔루션
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden sm:block text-xs text-neutral-800 font-medium">
                  {isServicesOpen ? '접기' : '더보기'}
                </div>
                <div className="p-1.5 bg-white/70 hover:bg-white rounded-lg transition-colors duration-200 shadow-sm">
                  {isServicesOpen ? (
                    <ChevronUp className="w-4 h-4 text-neutral-900" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-neutral-900" />
                  )}
                </div>
              </div>
            </button>
            
            {isServicesOpen && (
              <div className="mt-6 sm:mt-8 animate-in slide-in-from-top-2 duration-300 ease-out">
                <div className="relative">
                  {/* 배경 장식 */}
                  <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-amber-200/10 to-orange-200/10 rounded-full blur-3xl" />
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-red-200/10 to-amber-200/10 rounded-full blur-2xl" />
                  
                  <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {/* 멤버십ㆍ수익화 */}
                    <Card className="group border-0 bg-gradient-to-br from-white via-amber-50/30 to-orange-50/30 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 backdrop-blur-sm overflow-hidden">
                      <CardHeader className="pb-3 relative">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-amber-200/20 to-orange-200/20 rounded-full blur-lg" />
                        <div className="relative flex items-center gap-2.5 mb-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                            <Users className="w-4 h-4 text-white" />
                          </div>
                          <CardTitle className="text-slate-800 text-base font-bold">
                            멤버십ㆍ수익화
                          </CardTitle>
                        </div>
                        <div className="w-10 h-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full" />
                      </CardHeader>
                      <CardContent className="text-slate-600 leading-relaxed relative text-sm">
                        간편한 멤버 관리와 차별화된 커뮤니티 운영
                      </CardContent>
                    </Card>
                    
                    {/* 콘텐츠 */}
                    <Card className="group border-0 bg-gradient-to-br from-white via-green-50/30 to-emerald-50/30 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 backdrop-blur-sm overflow-hidden">
                      <CardHeader className="pb-3 relative">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-green-200/20 to-emerald-200/20 rounded-full blur-lg" />
                        <div className="relative flex items-center gap-2.5 mb-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                            <FileText className="w-4 h-4 text-white" />
                          </div>
                          <CardTitle className="text-slate-800 text-base font-bold">
                            콘텐츠
                          </CardTitle>
                        </div>
                        <div className="w-10 h-0.5 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full" />
                      </CardHeader>
                      <CardContent className="text-slate-600 leading-relaxed relative text-sm">
                        피드, 포스트, 댓글 등 다양한 기능으로 지식과 경험을 활발히 공유
                      </CardContent>
                    </Card>
                    
                    {/* 공지ㆍ소통 */}
                    <Card className="group border-0 bg-gradient-to-br from-white via-purple-50/30 to-pink-50/30 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 backdrop-blur-sm overflow-hidden">
                      <CardHeader className="pb-3 relative">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-purple-200/20 to-pink-200/20 rounded-full blur-lg" />
                        <div className="relative flex items-center gap-2.5 mb-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                            <Megaphone className="w-4 h-4 text-white" />
                          </div>
                          <CardTitle className="text-slate-800 text-base font-bold">
                            공지ㆍ소통
                          </CardTitle>
                        </div>
                        <div className="w-10 h-0.5 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full" />
                      </CardHeader>
                      <CardContent className="text-slate-600 leading-relaxed relative text-sm">
                        중요한 소식을 빠르게 알리고, 체계적인 공지 관리
                      </CardContent>
                    </Card>
                    
                    {/* 이벤트 */}
                    <Card className="group border-0 bg-gradient-to-br from-white via-indigo-50/30 to-blue-50/30 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 backdrop-blur-sm overflow-hidden">
                      <CardHeader className="pb-3 relative">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-indigo-200/20 to-blue-200/20 rounded-full blur-lg" />
                        <div className="relative flex items-center gap-2.5 mb-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                            <CalendarDays className="w-4 h-4 text-white" />
                          </div>
                          <CardTitle className="text-slate-800 text-base font-bold">
                            이벤트
                          </CardTitle>
                        </div>
                        <div className="w-10 h-0.5 bg-gradient-to-r from-indigo-500 to-blue-600 rounded-full" />
                      </CardHeader>
                      <CardContent className="text-slate-600 leading-relaxed relative text-sm">
                        오프라인 모임부터 온라인 행사까지, 일정 공유와 운영을 손쉽게!
                      </CardContent>
                    </Card>
                    
                    {/* 온라인 클래스 운영 */}
                    <Card className="group border-0 bg-gradient-to-br from-white via-teal-50/30 to-cyan-50/30 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 backdrop-blur-sm overflow-hidden">
                      <CardHeader className="pb-3 relative">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-teal-200/20 to-cyan-200/20 rounded-full blur-lg" />
                        <div className="relative flex items-center gap-2.5 mb-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                            <GraduationCap className="w-4 h-4 text-white" />
                          </div>
                          <CardTitle className="text-slate-800 text-base font-bold">
                            온라인 클래스 운영
                          </CardTitle>
                        </div>
                        <div className="w-10 h-0.5 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-full" />
                      </CardHeader>
                      <CardContent className="text-slate-600 leading-relaxed relative text-sm">
                        나의 전문성, 노하우를 강의ㆍ콘텐츠로 제공하고 멤버십 기반 수익 창출
                      </CardContent>
                    </Card>
                    
                    {/* 통합 대시보드 */}
                    <Card className="group border-0 bg-gradient-to-br from-white via-rose-50/30 to-pink-50/30 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 backdrop-blur-sm overflow-hidden">
                      <CardHeader className="pb-3 relative">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-rose-200/20 to-pink-200/20 rounded-full blur-lg" />
                        <div className="relative flex items-center gap-2.5 mb-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-rose-500 to-pink-600 rounded-lg flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                            <BarChart3 className="w-4 h-4 text-white" />
                          </div>
                          <CardTitle className="text-slate-800 text-base font-bold">
                            통합 대시보드
                          </CardTitle>
                        </div>
                        <div className="w-10 h-0.5 bg-gradient-to-r from-rose-500 to-pink-600 rounded-full" />
                      </CardHeader>
                      <CardContent className="text-slate-600 leading-relaxed relative text-sm">
                        활동 현황, 참여도, 매출 데이터를 한눈에! 운영 효율성 극대화
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
