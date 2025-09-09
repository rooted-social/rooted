'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
// 사이드바가 전역 레이아웃으로 이동함에 따라 개별 페이지에서 헤더 임포트 제거
import { AnimatedBackground } from "@/components/AnimatedBackground"
import { Input } from "@/components/ui/input"
import { Search, Plus, ChevronLeft, ChevronRight, Compass, Sparkles } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { createCommunity } from "@/lib/communities"
import { fetchExploreCommunities } from '@/lib/dashboard'
import { Community } from "@/types/community"
import { useRouter } from "next/navigation"
import { COMMUNITY_CATEGORIES, DEFAULT_EXPLORE_CATEGORY } from '@/lib/constants'

export default function ExplorePage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState(DEFAULT_EXPLORE_CATEGORY)
  const [communities, setCommunities] = useState<Community[]>([])
  const [loading, setLoading] = useState(true)
  // 모바일 페이지네이션
  const [currentPage, setCurrentPage] = useState(1)
  const [isMobile, setIsMobile] = useState(false)
  const MOBILE_ITEMS_PER_PAGE = 15
  
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

  // 화면 크기 감지
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)
    
    return () => window.removeEventListener('resize', checkIsMobile)
  }, [])

  // 커뮤니티 데이터 로드
  useEffect(() => {
    const controller = new AbortController()
    ;(async () => {
      try {
        setLoading(true)
        const data = await fetchExploreCommunities({ category: selectedCategory !== '전체' ? selectedCategory : undefined, signal: controller.signal })
        setCommunities(data)
      } catch (e:any) {
        if (e?.name !== 'AbortError') console.error('커뮤니티 로드 오류:', e)
      } finally { setLoading(false) }
    })()
    return () => controller.abort()
  }, [])

  // 별도 /create 페이지로 분리됨

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

  // 검색어나 카테고리 변경 시 데이터 다시 로드
  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(() => {
      loadCommunities(controller.signal)
    }, 250) // 250ms 디바운스로 단축
    return () => { controller.abort(); clearTimeout(timer) }
  }, [searchTerm, selectedCategory])

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category)
  }

  // 커뮤니티 생성 핸들러
  const handleCreateCommunity = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.description.trim() || !formData.slug.trim()) {
      alert("모든 필드를 입력해주세요.")
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
      
      alert("커뮤니티가 성공적으로 생성되었습니다!")
      // 완료 후 스테이트 초기화
    } catch (error) {
      console.error("커뮤니티 생성 오류:", error)
      alert("커뮤니티 생성에 실패했습니다. 다시 시도해주세요.")
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
      .replace(/[^a-z0-9가-힣]/g, '-')
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white via-slate-50/30 to-slate-100/60 relative overflow-hidden">
      <AnimatedBackground zIndexClass="-z-0" />

      {/* Main Content */}
      <main className="relative px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 pt-5 pb-24 z-10">
        <div className="w-full">
          {/* 상단 헤더 - 개선된 디자인 */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3 text-center md:text-left justify-center md:justify-start">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-500 rounded-xl shadow-lg">
                <Compass className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">루트 둘러보기</h1>
              </div>
            </div>
            <div className="flex items-center gap-2 text-center md:text-left justify-center md:justify-start">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <p className="text-slate-600 font-medium">관심 있는 루트를 찾아보세요!</p>
            </div>
          </div>
          
          {/* 검색창 - 개선된 디자인 */}
          <div className="mb-8">
            <div className="relative max-w-2xl mx-auto md:mx-0">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 z-10">
                <Search className="w-5 h-5 text-slate-500" />
              </div>
              <Input
                type="text"
                placeholder="커뮤니티 이름이나 키워드로 검색해보세요..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-14 pr-6 py-4 text-base rounded-2xl border-2 border-slate-300 focus:border-amber-500 bg-white shadow-lg hover:shadow-xl transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-amber-100"
              />
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
                      onChange={(e) => updateFormData('slug', e.target.value)}
                      pattern="[a-z0-9-]+"
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

          {/* Category Filter */}
          <div className="mb-8">
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
              {categories.map((category) => {
                const isSelected = selectedCategory === category
                return (
                  <Button
                    key={category}
                    variant="ghost"
                    className={`px-5 py-2.5 rounded-xl border text-sm font-semibold transition-all duration-300 whitespace-nowrap flex-shrink-0 cursor-pointer
                      ${isSelected 
                        ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-white border-amber-400' 
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 hover:border-slate-400 shadow-sm hover:shadow-md'
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
            {/* 커뮤니티 카드 그리드 - 반응형 최적화 */}
            <div className="w-full px-2 sm:px-4 md:px-0">
              <div className="grid gap-6 justify-items-center md:justify-items-start"
                   style={{
                     gridTemplateColumns: isMobile
                       ? '1fr'  // 모바일에서는 1줄에 1개 유지
                       : 'repeat(auto-fit, minmax(290px, 1fr))'  // PC에서는 2~4개 유연하게
                   }}>
                {loading ? (
                  // 로딩 스켈레톤
                  Array.from({ length: 6 }).map((_, index) => (
                    <Card key={index} className="w-full h-[145px] animate-pulse border border-slate-300 bg-white shadow-sm">
                      <CardHeader className="pb-3">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-slate-100 rounded-md border border-slate-300"></div>
                          <div className="flex-1 pt-1">
                            <div className="h-4 bg-gray-200 rounded mb-2"></div>
                            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          <div className="h-3 bg-gray-200 rounded"></div>
                          <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : communities.length === 0 ? (
                  <div className="w-full text-center py-16">
                    <p className="text-xl text-slate-600 mb-4">검색 결과가 없습니다.</p>
                    <p className="text-slate-500">다른 검색어나 카테고리를 시도해보세요.</p>
                  </div>
                ) : (
                  // 모바일에서는 페이지네이션된 커뮤니티만 표시
                  (isMobile ? getDisplayedCommunities() : communities).map((community) => {
                    return (
                      <Card 
                        key={community.id} 
                        className="w-full h-[145px] group cursor-pointer border border-slate-400 bg-white rounded-xl hover:border-slate-500 hover:shadow-lg shadow-sm transition-all duration-200 gap-3 py-5 relative"
                        onClick={() => router.push(`/${community.slug}`)}
                      >
                        {/* 카테고리 스티커 - 카드 바깥 우측 상단 플로팅 */}
                        <div className="pointer-events-none absolute -top-4 -right-4 z-20">
                          <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-900 text-white text-[11px] font-semibold shadow-lg border-2 border-white">
                            {community.category}
                          </span>
                        </div>

                        <CardHeader className="pb-0 relative px-4">
                          
                          <div className="flex items-start gap-3">
                            <div className="relative">
                              <div className="w-10 h-10 rounded-md overflow-hidden bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-300">
                                {(community as any)?.image_url ? (
                                  <img src={(community as any).image_url as any} alt="icon" className="w-full h-full object-cover" />
                                ) : (
                                  <span className="font-semibold text-sm">{community.name[0]}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex-1 pt-0.5 min-w-0">
                              <CardTitle className="text-base font-semibold text-slate-900 leading-tight min-w-0">
                                <div className="w-full overflow-hidden truncate">
                                  <span>{community.name}</span>
                                </div>
                              </CardTitle>
                              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                <span>멤버 {community.member_count}명</span>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0 px-4">
                          <p className="text-sm text-slate-600 line-clamp-2">
                            {community.description}
                          </p>
                        </CardContent>
                        
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