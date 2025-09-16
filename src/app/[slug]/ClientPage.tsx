'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AnimatedBackground } from '@/components/AnimatedBackground'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Users, Crown, ArrowLeft, UserPlus, Check, BarChart3, Info, X, Loader2, Clock } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { joinCommunity, leaveCommunity } from '@/lib/communities'
import { fetchDashboardStats } from '@/lib/dashboard'
import { supabase } from '@/lib/supabase'
import { useAuthData } from '@/components/auth/AuthProvider'

interface CommunityWithOwner {
  id: string
  name: string
  description: string
  slug: string
  category: string
  image_url?: string
  owner_id: string
  member_count: number
  created_at: string
  updated_at: string
  join_policy?: 'free' | 'approval'
  profiles: {
    id: string
    username: string
    full_name: string
    bio: string
    avatar_url?: string
  }
}

type GalleryItem = { key: string; url: string }

export default function ClientCommunityPage({ initial }: { initial?: any }) {
  const params = useParams()
  const router = useRouter()
  const slug = (params as any).slug as string

  const [community, setCommunity] = useState<CommunityWithOwner | null>(null)
  const [loading, setLoading] = useState(true)
  const [isJoining, setIsJoining] = useState(false)
  const [isMember, setIsMember] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const { user } = useAuthData()
  const [services, setServices] = useState<{ id: string; label: string }[]>([])
  const [images, setImages] = useState<GalleryItem[]>([])
  const [mainIdx, setMainIdx] = useState<number>(0)
  const [stats, setStats] = useState<{ memberCount: number; postCount: number; commentCount: number; classCount: number }>({ memberCount: 0, postCount: 0, commentCount: 0, classCount: 0 })
  const [imageModal, setImageModal] = useState<{ open: boolean; url: string }>({ open: false, url: '' })

  const getCategoryColor = (category: string) => {
    const colorMap: { [key: string]: string } = {
      '기술': 'bg-blue-500',
      '디자인': 'bg-purple-500',
      '마케팅': 'bg-orange-500',
      '라이프스타일': 'bg-teal-500',
      '교육': 'bg-indigo-500',
      '비즈니스': 'bg-green-500',
    }
    return colorMap[category] || 'bg-slate-500'
  }

  // 초기 데이터가 있으면 즉시 반영하여 첫 렌더를 빠르게 함
  const initializedRef = useRef(false)
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true
    if (initial && initial.community) {
      setCommunity(initial.community)
      setServices(initial.services || [])
      setImages((initial.images || []).slice(0, 10))
      setMainIdx(0)
      // membership 힌트가 있으면 즉시 반영
      const role = (initial.membership as any)?.role
      if (role) {
        if (role === 'pending') { setIsPending(true); setIsMember(false) }
        else { setIsMember(true); setIsPending(false) }
      }
      // 통계는 비동기로 로드 (초기 렌더 차단 X)
      void fetchDashboardStats(initial.community.id).then((s) => setStats(s as any)).catch(() => {})
      setLoading(false)
      return
    }
    // 초기 데이터가 없으면 클라이언트에서 로드
    void loadCommunityData()
  }, [initial])

  const loadCommunityData = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/community/detail?slug=${encodeURIComponent(slug)}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('failed')
      const body = await res.json()
      setCommunity(body.community)
      setServices(body.services)
      setImages((body.images || []).slice(0, 10))
      setMainIdx(0)
      // 통계는 별도 비동기
      void fetchDashboardStats(body.community.id).then((s) => setStats(s as any)).catch(() => {})
    } catch (error) {
      console.error('커뮤니티 로드 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  const lastCheckRef = useRef<string | null>(null)
  useEffect(() => {
    if (community && user) {
      const key = `${community.id}:${user.id}`
      if (lastCheckRef.current === key) return
      lastCheckRef.current = key
      void checkMembership(user.id)
    }
  }, [community, user])

  const checkMembership = async (userId: string) => {
    if (!community) return
    try {
      const { data } = await supabase
        .from('community_members')
        .select('id, role')
        .eq('community_id', community.id)
        .eq('user_id', userId)
        .single()
      if (data) {
        const role = (data as any).role
        if (role === 'pending') { setIsPending(true); setIsMember(false) }
        else { setIsMember(true); setIsPending(false) }
      } else {
        setIsMember(false)
        setIsPending(false)
      }
    } catch {
      setIsMember(false)
      setIsPending(false)
    }
  }

  const handleJoinToggle = async () => {
    if (!user) {
      alert('로그인이 필요합니다.')
      router.push('/login')
      return
    }
    if (!community) return
    try {
      setIsJoining(true)
      if (isMember) {
        router.push(`/${community.slug}/dashboard`)
      } else if (isPending) {
        await leaveCommunity(community.id)
        setIsPending(false)
        setIsMember(false)
      } else {
        const res = await joinCommunity(community.id)
        const willBePending = (community.join_policy === 'approval') || ((res as any)?.role === 'pending')
        if (willBePending) { setIsPending(true); setIsMember(false) }
        else { setIsMember(true); setIsPending(false); setCommunity(prev => prev ? { ...prev, member_count: prev.member_count + 1 } : null) }
      }
    } catch (error: any) {
      alert(error.message || '오류가 발생했습니다.')
    } finally {
      setIsJoining(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <AnimatedBackground />
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="flex items-center gap-3 rounded-2xl bg-white/80 backdrop-blur px-4 py-3 border border-slate-200 shadow-sm">
            <Loader2 className="w-5 h-5 animate-spin text-slate-700" />
            <span className="text-sm font-medium text-slate-700">불러오는 중...</span>
          </div>
        </div>
      </div>
    )
  }

  if (!community) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <AnimatedBackground />
        <main className="relative px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 pt-5 pb-24 z-10">
          <div className="w-full">
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 mb-3">커뮤니티를 찾을 수 없습니다</h1>
            <p className="text-sm sm:text-base text-slate-600 mb-6">요청하신 커뮤니티가 존재하지 않거나 삭제되었습니다.</p>
            <Button onClick={() => router.push('/explore')} className="text-sm sm:text-base">
              <ArrowLeft className="w-4 h-4 mr-2" /> 탐색으로 돌아가기
            </Button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <AnimatedBackground />
      <main className="relative px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 pt-3 md:pt-15 pb-24 z-10">
        <div className="w-full max-w-6xl mx-auto">
          <Button variant="ghost" className="mb-4 cursor-pointer text-sm sm:text-base hidden" onClick={() => router.push('/explore')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> 다른 루트 둘러보기
          </Button>

          {/* 최상단: 타이틀 섹션 */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-300 mb-4 sm:mb-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className={`${community.image_url ? 'bg-transparent' : 'bg-slate-600'} w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0`}>
                {community.image_url ? (
                  <Image src={community.image_url} alt={community.name} width={56} height={56} className="object-cover rounded-xl" />
                ) : (
                  <span className="text-white font-bold text-lg sm:text-xl">{community.name[0]}</span>
                )}
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold text-slate-900 break-words">{community!.name}</h1>
                <div className="mt-1 flex items-center gap-2">
                  <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm text-white ${getCategoryColor(community!.category)}`}>{community!.category}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 상단: 갤러리 + 우측 정보 (전체 너비 그리드) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 mb-6">
            <div className="lg:col-span-8 order-2 lg:order-1">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-slate-300">
                {images.length === 0 ? (
                  <div className="aspect-[16/9] w-full rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500">
                    커뮤니티 이미지가 없습니다
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div 
                      className="relative aspect-[16/9] w-full overflow-hidden rounded-xl cursor-pointer hover:opacity-95 transition-opacity"
                      onClick={() => setImageModal({ open: true, url: images[mainIdx]?.url })}
                    >
                      <Image src={images[mainIdx]?.url} alt="community-main" fill className="object-cover" sizes="(max-width: 1024px) 100vw, 66vw" />
                      {images.length > 1 && (
                        <>
                          <button
                            aria-label="이전 이미지"
                            className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 bg-white/90 backdrop-blur border border-slate-200 shadow-lg rounded-full text-slate-700 hover:bg-white hover:shadow-xl transition cursor-pointer flex items-center justify-center"
                            onClick={(e) => { e.stopPropagation(); setMainIdx((prev) => (prev - 1 + images.length) % images.length) }}
                          >
                            ‹
                          </button>
                          <button
                            aria-label="다음 이미지"
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 bg-white/90 backdrop-blur border border-slate-200 shadow-lg rounded-full text-slate-700 hover:bg-white hover:shadow-xl transition cursor-pointer flex items-center justify-center"
                            onClick={(e) => { e.stopPropagation(); setMainIdx((prev) => (prev + 1) % images.length) }}
                          >
                            ›
                          </button>
                        </>
                      )}
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      {images.filter((_img, i) => i !== mainIdx).slice(0, 5).map((img, i) => (
                        <button 
                          key={img.key} 
                          onClick={() => setMainIdx(images.findIndex(x => x.key === img.key))} 
                          className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400 cursor-pointer hover:scale-105 hover:shadow-md transition-all duration-200"
                        >
                          <Image src={img.url} alt={`community-thumb-${i}`} fill className="object-cover" sizes="(max-width: 1024px) 20vw, 12vw" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-4 order-1 lg:order-2">
              <Card className="hover:shadow-sm transition-all duration-300 border border-slate-300">
                <CardContent className="space-y-4 sm:space-y-6 pb-3 sm:pb-5">
                  {/* 리더 소개 */}
                  <div className="pt-4 sm:pt-5 pb-2">
                    <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                      <Avatar className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0">
                        <AvatarImage src={community!.profiles.avatar_url || ''} alt={community!.profiles.full_name || community!.profiles.username} />
                        <AvatarFallback className="bg-slate-200 text-slate-600 font-semibold text-sm">{(community!.profiles.full_name || community!.profiles.username)[0]}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="text-base sm:text-lg font-semibold text-slate-900 truncate">{community!.profiles.full_name}</div>
                      </div>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2 inline-flex items-center"><Crown className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 text-yellow-500" />리더 소개</h3>
                    {community!.profiles.bio && (
                      <p className="text-slate-700 text-sm sm:text-base leading-relaxed">{community!.profiles.bio}</p>
                    )}
                  </div>

                  <div className="h-px bg-slate-200 mt-4" />

                  {/* 커뮤니티 소개 */}
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2 inline-flex items-center"><Info className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 text-slate-700" />커뮤니티 소개</h3>
                    <p className="text-sm sm:text-base leading-6 text-slate-800">
                      {(community!.description || '').slice(0, 100)}
                    </p>
                  </div>

                  <div className="h-px bg-slate-200" />

                  {/* 커뮤니티 현황 */}
                  <div>
                    <h3 className="text-sm sm:text-base font-semibold text-slate-900 mb-2 inline-flex items-center"><BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 text-indigo-600" />커뮤니티 현황</h3>
                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                      <div className="text-center p-3 sm:p-4 rounded-xl border border-slate-200 bg-white">
                        <div className="text-xl sm:text-2xl font-bold text-slate-900 mb-0.5">{stats.memberCount.toLocaleString()}</div>
                        <div className="text-[11px] sm:text-xs tracking-wide uppercase text-slate-500">멤버</div>
                      </div>
                      <div className="text-center p-3 sm:p-4 rounded-xl border border-slate-200 bg-white">
                        <div className="text-xl sm:text-2xl font-bold text-slate-900 mb-0.5">{stats.postCount.toLocaleString()}</div>
                        <div className="text-[11px] sm:text-xs tracking-wide uppercase text-slate-500">게시글</div>
                      </div>
                      <div className="text-center p-3 sm:p-4 rounded-xl border border-slate-200 bg-white">
                        <div className="text-xl sm:text-2xl font-bold text-slate-900 mb-0.5">{stats.classCount.toLocaleString()}</div>
                        <div className="text-[11px] sm:text-xs tracking-wide uppercase text-slate-500">클래스</div>
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-slate-200" />

                  {/* 가입 버튼 */}
                  <div className="mb-1 sm:mb-2">
                    <Button 
                      onClick={handleJoinToggle} 
                      disabled={isJoining} 
                      className={`${
                        isMember
                          ? 'bg-green-600 hover:bg-green-700 text-black shadow-lg shadow-black/20 ring-1 ring-black/20'
                          : isPending
                            ? 'bg-emerald-500 hover:bg-emerald-600 text-black shadow-lg shadow-black/20 ring-1 ring-black/20'
                            : (community?.join_policy === 'approval'
                                ? 'bg-amber-500 hover:bg-amber-600 text-black shadow-lg shadow-black/20 ring-1 ring-black/20'
                                : 'bg-black hover:bg-slate-800 text-white')
                      } w-full py-3 sm:py-4 text-sm sm:text-base transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/30 cursor-pointer border border-black`}
                    >
                      {isJoining ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />처리 중...</>
                      ) : isMember ? (
                        <><Check className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />가입된 커뮤니티로 이동</>
                      ) : isPending ? (
                        <><Clock className="w-4 h-4 mr-2" />승인 대기 중 (취소)</>
                      ) : (
                        <><UserPlus className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />{community?.join_policy === 'approval' ? '가입 신청' : '가입하기'}</>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* 하단 섹션: 제공 서비스 */}
          <div className="grid grid-cols-1 gap-4 sm:gap-6">
            <div>
              <Card className="hover:shadow-sm transition-all duration-300 border border-slate-300">
                <CardHeader className="pb-3 sm:pb-6">
                  <CardTitle className="flex items-center text-base sm:text-lg font-bold"><Users className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 text-blue-500" />커뮤니티 특징</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 sm:space-y-3 pt-0">
                  {services.length === 0 ? (
                    <p className="text-sm sm:text-base text-slate-600">등록된 서비스가 아직 없습니다.</p>
                  ) : (
                    services.map((s, i) => (
                      <div key={s.id} className="flex items-center gap-2 sm:gap-3">
                        <div className={`${['bg-blue-500','bg-green-500','bg-purple-500','bg-orange-500','bg-teal-500'][i % 5]} w-2 h-2 rounded-full flex-shrink-0`} />
                        <span className="text-slate-900 text-medium sm:text-base">{s.label}</span>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* 이미지 확대 모달 */}
      <Dialog open={imageModal.open} onOpenChange={(open) => setImageModal({ open, url: '' })}>
        <DialogContent 
          className="p-0 border-0 bg-transparent shadow-none max-w-none w-auto h-auto flex items-center justify-center"
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">커뮤니티 이미지 확대보기</DialogTitle>
          <div className="relative flex items-center justify-center">
            {imageModal.url && (
              <div className="relative">
                <Image 
                  src={imageModal.url} 
                  alt="확대된 이미지" 
                  width={1000}
                  height={700}
                  className="rounded-lg shadow-2xl block" 
                  style={{ maxWidth: '90vw', maxHeight: '80vh', width: 'auto', height: 'auto' }}
                />
                <button
                  onClick={() => setImageModal({ open: false, url: '' })}
                  className="absolute -top-2 -right-2 sm:-top-3 sm:-right-3 p-2 sm:p-2.5 bg-white hover:bg-gray-100 rounded-full shadow-lg transition-all duration-200 cursor-pointer hover:scale-110 z-50"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
                </button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}


