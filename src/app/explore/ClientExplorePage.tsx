'use client'

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useAuthData } from "@/components/auth/AuthProvider"
import { Card, CardTitle } from "@/components/ui/card"
import dynamic from "next/dynamic"
import { Input } from "@/components/ui/input"
import { Search, ChevronLeft, ChevronRight, Compass, Sparkles } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { createCommunity } from "@/lib/communities"
import { fetchExploreCommunities } from '@/lib/dashboard'
import { Community } from "@/types/community"
import { useRouter } from "next/navigation"
import { COMMUNITY_CATEGORIES, DEFAULT_EXPLORE_CATEGORY } from '@/lib/constants'
import { getVersionedUrl } from '@/lib/utils'
import { toast } from "sonner"

// 배경 애니메이션은 동적 로드하여 초기 페인트 비용을 낮춤
const AnimatedBackground = dynamic(() => import("@/components/AnimatedBackground").then(m => m.AnimatedBackground), { ssr: false })

export default function ClientExplorePage({ initial }: { initial?: Community[] }) {
  const router = useRouter()
  const { user } = useAuthData()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState(DEFAULT_EXPLORE_CATEGORY)
  const [communities, setCommunities] = useState<Community[]>(initial || [])
  const [bannerMap, setBannerMap] = useState<Record<string, string>>({})
  const [bannerMetaMap, setBannerMetaMap] = useState<Record<string, { width: number; height: number }>>({})
  const [loading, setLoading] = useState(false)
  // 모바일 페이지네이션
  const [currentPage, setCurrentPage] = useState(1)
  const [isMobile, setIsMobile] = useState(false)
  const [mountBg, setMountBg] = useState(false)
  const MOBILE_ITEMS_PER_PAGE = 15
  const firstEffectSkippedRef = useRef(false)
  
  // 인라인 생성 섹션 표시 상태
  const [showCreateSection, setShowCreateSection] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    slug: "",
    category: COMMUNITY_CATEGORIES.find(c => c !== '전체') || '테크 & IT'
  })

  const categories = COMMUNITY_CATEGORIES
  // 모바일에서 '전체' 항목을 항상 포함하고 처음 선택되도록 보장
  useEffect(() => {
    if (!categories.includes('전체')) return
    if (!selectedCategory) setSelectedCategory('전체' as any)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 화면 크기 감지
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)
    
    return () => window.removeEventListener('resize', checkIsMobile)
  }, [])

  // 배경 애니메이션은 메인 컨텐츠 렌더 후 브라우저 idle 타이밍에 마운트
  useEffect(() => {
    if (isMobile) return
    const cb = () => setMountBg(true)
    if (typeof (window as any).requestIdleCallback === 'function') {
      ;(window as any).requestIdleCallback(cb)
    } else {
      const t = setTimeout(cb, 200)
      return () => clearTimeout(t)
    }
  }, [isMobile])

  const loadCommunities = async (signal?: AbortSignal) => {
    try {
      setLoading(true)
      const data = await fetchExploreCommunities({
        search: searchTerm || undefined,
        category: selectedCategory !== "전체" ? selectedCategory : undefined,
        signal,
      })
      setCommunities(data)
    } catch (error: any) {
      if (error?.name !== 'AbortError') console.error("커뮤니티 로드 오류:", error)
    } finally {
      setLoading(false)
    }
  }

  // 검색어나 카테고리 변경 시 데이터 다시 로드 (초기 로드 포함)
  useEffect(() => {
    if (!firstEffectSkippedRef.current) {
      firstEffectSkippedRef.current = true
      return
    }
    const controller = new AbortController()
    const timer = setTimeout(() => {
      loadCommunities(controller.signal)
    }, 250)
    return () => { controller.abort(); clearTimeout(timer) }
  }, [searchTerm, selectedCategory])

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category)
  }

  // 커뮤니티 생성 핸들러
  const handleCreateCommunity = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.description.trim() || !formData.slug.trim()) {
      toast.error("모든 필드를 입력해주세요.")
      return
    }

    if (formData.slug.length < 3 || formData.slug.length > 32) {
      toast.error("URL은 3~32자 사이여야 합니다.")
      return
    }

    try {
      setIsCreating(true)
      await createCommunity(formData)
      
      // 폼 초기화
      setFormData({
        name: "",
        description: "",
        slug: "",
        category: (COMMUNITY_CATEGORIES.find(c => c !== '전체') || '테크 & IT')
      })
      
      // 생성 섹션 닫기
      setShowCreateSection(false)
      
      // 커뮤니티 목록 새로고침
      loadCommunities()
      
      toast.success("커뮤니티가 성공적으로 생성되었습니다!")
    } catch (error) {
      console.error("커뮤니티 생성 오류:", error)
      toast.error("커뮤니티 생성에 실패했습니다. 다시 시도해주세요.")
    } finally {
      setIsCreating(false)
    }
  }

  // 폼 데이터 업데이트
  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // slug 자동 생성 (커뮤니티 이름 기반)
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  }

  // 모바일 환경에서 커뮤니티 페이지네이션
  const getDisplayedCommunities = () => {
    const startIndex = (currentPage - 1) * MOBILE_ITEMS_PER_PAGE
    const endIndex = startIndex + MOBILE_ITEMS_PER_PAGE
    return communities.slice(startIndex, endIndex)
  }

  const totalPages = Math.ceil(communities.length / MOBILE_ITEMS_PER_PAGE)

  // 검색이나 카테고리 변경 시 첫 페이지로 리셋
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedCategory])

  // 커뮤니티별 대표 이미지(첫 번째) 로드
  useEffect(() => {
    if (!communities || communities.length === 0) return
    let cancelled = false
    ;(async () => {
      try {
        // 서버가 thumb_url을 내려주면 추가 요청 없이 사용
        const results = await Promise.all(
          communities.map(async (c) => {
            const pre = (c as any)?.thumb_url || getVersionedUrl((c as any)?.image_url, (c as any)?.updated_at) || ''
            if (pre) return { slug: c.slug as string, url: pre, meta: null as any }
            try {
              const res = await fetch(`/api/community-images/${c.slug}`)
              const j = await res.json()
              const first = j?.images?.[0] || null
              const url = first?.url || pre || ''
              const meta = first?.meta || null
              return { slug: c.slug as string, url, meta }
            } catch {
              return { slug: c.slug as string, url: pre, meta: null as any }
            }
          })
        )
        if (cancelled) return
        const urlMap: Record<string, string> = {}
        const metaMap: Record<string, { width: number; height: number }> = {}
        results.forEach((r) => { if (r.url) urlMap[r.slug] = r.url; if (r.meta && r.meta.width && r.meta.height) metaMap[r.slug] = { width: r.meta.width, height: r.meta.height } })
        setBannerMap(urlMap)
        setBannerMetaMap(metaMap)
      } catch {}
    })()
    return () => { cancelled = true }
  }, [communities])

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {mountBg && <AnimatedBackground zIndexClass="-z-0" />}
      {/* Main Content */}
      <main className="relative px-2 sm:px-6 md:px-10 lg:px-16 xl:px-24 pt-12 md:pt-20 pb-24 z-10">
        <div className="w-full">
          {/* 상단 헤더 - 중앙 정렬 */}
          <div className="mb-8 text-center">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl shadow-sm border border-slate-300 bg-white">
                <Compass className="w-5 h-5 text-slate-900" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900">루트 둘러보기</h1>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <p className="text-slate-600 font-medium">관심 있는 루트를 찾아보세요!</p>
            </div>
          </div>

          {/* 검색창 + 커뮤니티 생성 버튼 */}
          <div className="mb-8">
            <div className="mx-auto max-w-2xl">
              <div className="flex items-center justify-center gap-2 sm:gap-3">
                <div className="relative flex-1 max-w-2xl">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 z-10">
                    <Search className="w-5 h-5 text-slate-500" />
                  </div>
                  <Input
                    type="text"
                    placeholder={isMobile ? '' : '커뮤니티 이름이나 키워드로 검색해보세요...'}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-12 pl-14 pr-6 text-base rounded-2xl border-2 border-slate-300 focus:border-slate-900 bg-white shadow-lg hover:shadow-xl transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-slate-200"
                  />
                </div>
                <Button asChild className="h-12 px-3 sm:px-4 rounded-2xl bg-black hover:bg-black/90 text-white border border-slate-300 shrink-0 transition-transform duration-200 hover:-translate-y-0.5">
                  <Link href={user ? "/create" : "/login"} className="inline-flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    커뮤니티 생성
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {/* 인라인 생성 섹션 */}
          {showCreateSection && (
            <div className="border border-slate-200 rounded-xl p-5 mb-8 bg-white">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">새 커뮤니티 만들기</h2>
                <Button variant="ghost" onClick={() => setShowCreateSection(false)} disabled={isCreating}>
                  취소
                </Button>
              </div>
              <form onSubmit={handleCreateCommunity} className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-1">
                  <Label htmlFor="name">커뮤니티 이름</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="커뮤니티 이름을 입력하세요"
                    value={formData.name}
                    onChange={(e) => {
                      updateFormData('name', e.target.value)
                      if (e.target.value) updateFormData('slug', generateSlug(e.target.value))
                    }}
                    required
                    disabled={isCreating}
                  />
                </div>
                <div className="space-y-2 md:col-span-1">
                  <Label htmlFor="slug">커뮤니티 URL</Label>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-2 text-sm text-slate-500 bg-slate-50 rounded border border-slate-200">rooted.kr/</span>
                    <Input
                      id="slug"
                      type="text"
                      placeholder="community-url"
                      value={formData.slug}
                      onChange={(e) => updateFormData('slug', generateSlug(e.target.value))}
                      pattern="[a-z0-9-]+"
                      minLength={3}
                      maxLength={32}
                      required
                      disabled={isCreating}
                    />
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">커뮤니티 소개</Label>
                  <Textarea
                    id="description"
                    placeholder="커뮤니티에 대해 간단히 소개해주세요"
                    value={formData.description}
                    onChange={(e) => updateFormData('description', e.target.value)}
                    rows={4}
                    required
                    disabled={isCreating}
                  />
                </div>
                <div className="space-y-2 md:col-span-1">
                  <Label htmlFor="category">카테고리</Label>
                  <select
                    id="category"
                    value={formData.category}
                    onChange={(e) => updateFormData('category', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md"
                    required
                    disabled={isCreating}
                  >
                    {categories.filter(cat => cat !== '전체').map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-1 flex items-end justify-end">
                  <Button type="submit" disabled={isCreating}>
                    {isCreating ? '생성 중...' : '커뮤니티 생성'}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Category Filter - 중앙 정렬 */}
          <div className="mb-6">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 justify-start md:justify-center -mx-1 px-1">
              {categories.map((category) => {
                const isSelected = selectedCategory === category
                return (
                  <Button
                    key={category}
                    variant="ghost"
                    className={`px-4 py-2 rounded-lg border text-xs font-medium transition-all duration-300 whitespace-nowrap flex-shrink-0 cursor-pointer
                      ${isSelected 
                        ? 'bg-black text-white border-slate-700' 
                        : 'bg-white text-slate-900 border-slate-300 hover:bg-slate-50 hover:border-slate-400 shadow-sm hover:shadow-md'
                      }`}
                    onClick={() => handleCategoryChange(category)}
                    aria-pressed={isSelected}
                  >
                    {category}
                  </Button>
                )
              })}
            </div>
          </div>

          {/* Community Grid */}
          <div className="flex flex-col items-center">
            <div className="w-full mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
              {/* 한 줄 최대 4개, 카드 최대 너비 350px, 최소 간격 보장 */}
              <div className="grid gap-4 sm:gap-6 xl:gap-7 justify-items-center grid-cols-[repeat(auto-fit,minmax(270px,1fr))] sm:grid-cols-[repeat(auto-fit,minmax(290px,1fr))] xl:[&>*]:max-w-[350px]">
                {communities.length === 0 ? (
                  <div className="w-full text-center py-16">
                    <p className="text-xl text-slate-600 mb-4">검색 결과가 없습니다.</p>
                    <p className="text-slate-500">다른 검색어나 카테고리를 시도해보세요.</p>
                  </div>
                ) : (
                  (isMobile ? getDisplayedCommunities() : communities).map((community, idx) => {
                    const topUrl = bannerMap[community.slug] || community.thumb_url || getVersionedUrl(community.image_url as any, community.updated_at) || ''
                    const hasIconImage = Boolean(community.icon_url || community.image_url)
                    const firstChar = (community.name || '').charAt(0)
                    const memberCount = Math.max(0, (Number(community?.member_count) || 0) - 1)
                    return (
                      <Card
                        key={community.id}
                        className="w-full min-w-[290px] max-w-[370px] group cursor-pointer border border-slate-300 bg-white rounded-xl hover:border-slate-400 hover:shadow-lg shadow-sm transition-all duration-200 overflow-hidden p-0 fade-in-down"
                        style={{ animationDelay: `${Math.min(idx, 8) * 70 + 40}ms` }}
                        onClick={() => router.push(`/${community.slug}`)}
                      >
                        {/* 상단 대표 이미지 */}
                        {(() => { const m = bannerMetaMap[community.slug]; const containerClass = m ? "w-full bg-slate-100 relative" : "w-full h-50 bg-slate-100 relative"; const style = m ? { aspectRatio: `${Math.max(1, m.width)} / ${Math.max(1, m.height)}` } as any : undefined; return (
                        <div className={containerClass} style={style}>
                          {topUrl ? (
                            <Image src={topUrl} alt="banner" fill priority={false} sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 350px" className="object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-b from-slate-100 to-slate-200" />
                          )}
                        </div>
                        )})()}

                        {/* 본문 */}
                        <div className="px-4 py-3">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-md overflow-hidden bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-300">
                              {hasIconImage ? (
                                <Image src={(community.icon_url || community.image_url) as string} alt="icon" width={32} height={32} className="object-cover" />
                              ) : (
                                <span className="font-semibold text-sm">{firstChar}</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base font-semibold text-slate-900 leading-tight truncate">{community.name}</CardTitle>
                              <p className="text-sm text-slate-600 line-clamp-2 mt-1">{community.description}</p>
                            </div>
                          </div>

                          {/* 하단 정보: 멤버수 • 카테고리 */}
                          <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
                            <span>멤버 {memberCount}명</span>
                            <span className="flex items-center gap-1"><span className="text-slate-400">•</span>{community.category}</span>
                          </div>
                        </div>
                      </Card>
                    )
                  })
                )}
              </div>
            </div>

            {/* 모바일 페이지네이션 */}
            {!loading && communities.length > 0 && (
              <div className="md:hidden mt-8 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = i + 1
                    if (totalPages <= 5) {
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className="w-8 h-8 p-0"
                        >
                          {pageNum}
                        </Button>
                      )
                    }
                    return null
                  })}
                  
                  {totalPages > 5 && (
                    <>
                      <Button
                        variant={currentPage === 1 ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(1)}
                        className="w-8 h-8 p-0"
                      >
                        1
                      </Button>
                      {currentPage > 3 && <span className="px-1">...</span>}
                      {currentPage > 2 && currentPage < totalPages - 1 && (
                        <Button
                          variant="default"
                          size="sm"
                          className="w-8 h-8 p-0"
                        >
                          {currentPage}
                        </Button>
                      )}
                      {currentPage < totalPages - 2 && <span className="px-1">...</span>}
                      <Button
                        variant={currentPage === totalPages ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(totalPages)}
                        className="w-8 h-8 p-0"
                      >
                        {totalPages}
                      </Button>
                    </>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}


