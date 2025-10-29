"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { updateNotice, deleteNotice, createNotice } from "@/lib/communities"
import { fetchHomeData } from '@/lib/dashboard'
import { Target, FileText, BookOpen, Newspaper, CalendarClock, Rss, StickyNote, Calendar, Bell, Activity, Settings, Edit3, Trash2, MoreVertical, SquarePen, MapPin, Plus } from "lucide-react"
import { toast } from "sonner"
import { getAuthToken } from '@/lib/supabase'
import { useAuthData } from '@/components/auth/AuthProvider'
import type { CommunitySettings, Notice, Post } from "@/types/community"
import { withAlpha } from "@/utils/color"
import { useCommunityContext } from "@/components/community-dashboard/CommunityContext"
// 클라이언트 직접 Supabase 조회 제거

interface HomeTabProps { communityId: string; slug?: string; ownerId?: string | null; initial?: { settings?: any; notices?: any[]; canManage?: boolean; upcomingEvents?: any[]; recentActivity?: any[] } }

export function HomeTab({ communityId, slug, ownerId, initial }: HomeTabProps) {
  const router = useRouter()
  const [settings, setSettings] = useState<CommunitySettings | null>(null)
  const [notices, setNotices] = useState<Notice[]>([])
  // const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [canManage, setCanManage] = useState<boolean>(false)
  const [upcomingEvents, setUpcomingEvents] = useState<{ id: string; title: string; start_at: string; end_at?: string | null; location?: string | null; description?: string | null }[]>([])
  const [recentActivity, setRecentActivity] = useState<{ id: string; kind: 'feed'|'blog'|'note'|'event'|'class'; title: string; created_at: string; href?: string; meta?: string }[]>([])
  // 홈 탭 내 통계 섹션은 별도 페이지로 이동됨
  const { brandColor: contextBrandColor } = useCommunityContext()
  const { user } = useAuthData()
  const isOwner = !!user && !!ownerId && user.id === ownerId

  useEffect(() => {
    if (initial && (initial.settings || initial.notices)) {
      setSettings((initial.settings || null) as any)
      setNotices((initial.notices || []) as any)
      setCanManage(!!initial.canManage)
      setUpcomingEvents(((initial.upcomingEvents || []) as any).slice(0,5))
      setRecentActivity((initial.recentActivity || []) as any)
      setLoading(false)
      try { window.dispatchEvent(new Event('dashboard-initial-ready')) } catch {}
      return
    }
    let isMounted = true
    ;(async () => {
      try {
        setLoading(true)
        const home = await fetchHomeData(communityId)
        if (!isMounted) return
        setSettings(home.settings)
        setNotices(home.notices)
        setCanManage(!!home.canManage)
        setUpcomingEvents((home.upcomingEvents || []) as any)
        setRecentActivity((home.recentActivity || []) as any)
      } finally {
        if (isMounted) setLoading(false)
        try { window.dispatchEvent(new Event('dashboard-initial-ready')) } catch {}
      }
    })()
    return () => {
      isMounted = false
    }
  }, [communityId])

  // 클라이언트 권한 재조회 제거 (서버에서 canManage를 내려줌)

  // 대시보드 내 브랜드 컬러를 전역 이벤트로 즉시 업데이트
  useEffect(() => {
    const handler = (e: any) => {
      setSettings(prev => prev ? { ...prev, brand_color: e?.detail?.color ?? null } as any : prev)
    }
    window.addEventListener('brand-color-updated', handler as any)
    return () => window.removeEventListener('brand-color-updated', handler as any)
  }, [])

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
          <div className="h-24 bg-slate-100 rounded-xl animate-pulse" />
          <div className="h-40 bg-slate-100 rounded-xl animate-pulse" />
          <div className="h-28 bg-slate-100 rounded-xl animate-pulse" />
        </div>
        <div className="space-y-4">
          <div className="h-40 bg-slate-100 rounded-xl animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <section className="grid gap-6 lg:grid-cols-3 overflow-x-hidden">
      {/* 상단 전체 배너 / 빈 상태 */}
      {settings?.banner_url ? (
        <div className="lg:col-span-3 -mt-0 md:mt-0">
          <div className="relative w-full overflow-hidden rounded-xl border border-slate-200/50 shadow-sm">
            {/* 모바일: 세로 여유(16:3), 데스크탑: 16:4 */}
            <div className="relative w-full md:hidden" style={{ aspectRatio: '16 / 4.5' }}>
              <Image
                src={settings.banner_url}
                alt="커뮤니티 배너"
                fill
                sizes="100vw"
                className="object-cover"
                priority
              />
            </div>
            <div className="relative w-full hidden md:block" style={{ aspectRatio: '16 / 3.5' }}>
              <Image
                src={settings.banner_url}
                alt="커뮤니티 배너"
                fill
                sizes="100vw"
                className="object-cover"
                priority
              />
            </div>
          </div>
        </div>
      ) : (
        isOwner ? (
          <div className="lg:col-span-3 -mt-0 md:mt-0">
            <button
              onClick={() => slug && router.push(`/${slug}/settings`) }
              className="relative w-full overflow-hidden rounded-xl border border-dashed border-slate-300 bg-white/60 hover:bg-white/80 transition-colors shadow-sm cursor-pointer"
              title="배너 이미지를 추가해보세요"
            >
              {/* 모바일 비율 */}
              <div className="relative w-full md:hidden" style={{ aspectRatio: '16 / 4.5' }}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="inline-flex items-center gap-2 text-slate-500">
                    <Plus className="w-5 h-5" />
                    <span className="text-sm font-medium">배너 이미지를 추가해보세요</span>
                  </div>
                </div>
              </div>
              {/* 데스크탑 비율 */}
              <div className="relative w-full hidden md:block" style={{ aspectRatio: '16 / 3.5' }}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="inline-flex items-center gap-2 text-slate-500">
                    <Plus className="w-5 h-5" />
                    <span className="text-sm font-medium">배너 이미지를 추가해보세요</span>
                  </div>
                </div>
              </div>
            </button>
          </div>
        ) : null
      )}
      {/* 좌측 메인 컨텐츠 */}
      {(() => { const brandColor = settings?.brand_color || contextBrandColor || undefined; return (
      <div className="lg:col-span-2 space-y-6 min-w-0 max-w-full">
        {/* 1) Our Mission */}
        <div className="rounded-xl shadow-sm bg-white/60 backdrop-blur-md border" style={{ borderColor: withAlpha(brandColor || '#0f172a', 0.18) }}>
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm" style={{ backgroundColor: withAlpha(brandColor || '#0f172a', 0.08), borderColor: withAlpha(brandColor || '#0f172a', 0.25) }}>
                <Target className="w-5 h-5" style={{ color: brandColor || '#0f172a' }} />
              </div>
              <h3 className="text-xl font-semibold text-slate-900">Our Mission</h3>
            </div>
            <div className="text-slate-900 font-medium text-lg leading-relaxed">
              {settings?.mission || "커뮤니티의 목표와 가치를 설정해보세요."}
            </div>
          </div>
        </div>

        {/* 2) 공지사항 */}
        <NoticesSection 
          communityId={communityId} 
          notices={notices} 
          onNoticesChange={(newNotices) => setNotices(newNotices)}
          brandColor={brandColor}
          canManage={canManage}
        />

        {/* 3) 최근 활동 */}
        {/* 모바일: 다가오는 이벤트를 최근 활동 위로 노출 */}
        <div className="lg:hidden">
          <UpcomingEventsCard items={upcomingEvents.slice(0,5)} brandColor={brandColor} />
        </div>
        <RecentActivityCard items={recentActivity} slug={slug} brandColor={brandColor} />
      </div>
      )})()}

      {/* 우측 사이드바 */}
      {(() => { const brandColor = settings?.brand_color || contextBrandColor || undefined; return (
      <div className="space-y-6 min-w-0 max-w-full hidden lg:block">
        {/* 4) 다가오는 이벤트 */}
        <UpcomingEventsCard items={upcomingEvents.slice(0,5)} brandColor={brandColor} />
      </div>
      )})()}
    </section>
  )
}

// 공지사항 섹션 컴포넌트
function NoticesSection({ 
  communityId, 
  notices, 
  onNoticesChange, 
  brandColor,
  canManage = false,
}: { 
  communityId: string
  notices: Notice[]
  onNoticesChange: (notices: Notice[]) => void
  brandColor?: string
  canManage?: boolean
}) {
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [viewNotice, setViewNotice] = useState<Notice | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)

  // 외부 클릭 시 메뉴 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuOpenId && !(event.target as Element)?.closest('.notice-menu')) {
        setMenuOpenId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpenId])

  const handleEditClick = (notice: Notice) => {
    setEditingNotice(notice)
    setEditTitle(notice.title)
    setEditContent(notice.content)
    setIsEditDialogOpen(true)
    setMenuOpenId(null)
  }

  const handleSaveEdit = async () => {
    if (!editingNotice || !editTitle.trim()) {
      toast.error('제목을 입력해주세요.')
      return
    }

    try {
      const updatedNotice = await updateNotice(editingNotice.id, {
        title: editTitle.trim(),
        content: editContent.trim()
      })
      
      const newNotices = notices.map(n => 
        n.id === editingNotice.id ? updatedNotice : n
      )
      onNoticesChange(newNotices)
      
      setIsEditDialogOpen(false)
      setEditingNotice(null)
      setEditTitle('')
      setEditContent('')
      toast.success('공지사항이 수정되었습니다.')
    } catch (error: any) {
      toast.error(error.message || '수정 중 오류가 발생했습니다.')
    }
  }

  const handleDelete = async (notice: Notice) => {
    if (!confirm('정말로 이 공지사항을 삭제하시겠습니까?')) return

    try {
      await deleteNotice(notice.id)
      const newNotices = notices.filter(n => n.id !== notice.id)
      onNoticesChange(newNotices)
      setMenuOpenId(null)
      toast.success('공지사항이 삭제되었습니다.')
    } catch (error: any) {
      toast.error(error.message || '삭제 중 오류가 발생했습니다.')
    }
  }

  const handleCreate = async () => {
    if (!editTitle.trim()) {
      toast.error('제목을 입력해주세요.')
      return
    }
    try {
      const newNotice = await createNotice({
        community_id: communityId,
        title: editTitle.trim(),
        content: editContent.trim(),
        pinned: false,
      } as any)
      onNoticesChange([newNotice, ...notices])
      setIsCreateDialogOpen(false)
      setEditTitle('')
      setEditContent('')
      toast.success('공지사항이 등록되었습니다.')
    } catch (error: any) {
      toast.error(error?.message || '등록 중 오류가 발생했습니다.')
    }
  }

  return (
    <>
              <div className="rounded-xl shadow-sm bg-white/60 backdrop-blur-md border" style={{ borderColor: withAlpha(brandColor || '#0f172a', 0.18) }}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm" style={{ backgroundColor: withAlpha(brandColor || '#0f172a', 0.08), borderColor: withAlpha(brandColor || '#0f172a', 0.25) }}>
                <Bell className="w-5 h-5" style={{ color: brandColor || '#0f172a' }} />
              </div>
              <h3 className="text-xl font-semibold text-slate-900">공지사항</h3>
              </div>
              {canManage && (
                <button
                  onClick={() => { setIsCreateDialogOpen(true); setEditTitle(''); setEditContent('') }}
                  className="w-9 h-9 rounded-lg bg-white/80 hover:bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                  title="공지 작성"
                >
                  <SquarePen className="w-4 h-4" />
                </button>
              )}
            </div>
          <div className="space-y-3">
            {notices.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-3">
                  <Bell className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-slate-500 text-sm">등록된 공지사항이 없습니다.</p>
              </div>
            ) : (
              notices.slice(0, 3).map((notice) => (
                <div
                  key={notice.id}
                  className="relative bg-gradient-to-r from-slate-50 to-white rounded-2xl p-4 border border-slate-100 hover:shadow-sm transition-shadow group cursor-pointer"
                  onClick={() => { setViewNotice(notice); setIsViewDialogOpen(true) }}
                >
                  {canManage && (
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="relative notice-menu">
                        <button
                          onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === notice.id ? null : notice.id) }}
                          className="w-8 h-8 rounded-lg bg-white/80 hover:bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors"
                          title="설정"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {menuOpenId === notice.id && (
                          <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg py-1 text-sm z-20 min-w-[120px]">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleEditClick(notice) }}
                              className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-slate-50 transition-colors"
                            >
                              <Edit3 className="w-4 h-4" />
                              수정
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(notice) }}
                              className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-red-50 text-red-600 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                              삭제
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="pr-10">
                    <div className="text-sm font-semibold text-slate-900 mb-2">{notice.title}</div>
                    <div className="text-sm text-slate-600 leading-relaxed line-clamp-2 whitespace-pre-wrap">{notice.content}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 수정 다이얼로그 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>공지사항 수정</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">제목</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="공지사항 제목을 입력하세요"
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-content">내용</Label>
              <Textarea
                id="edit-content"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="공지사항 내용을 입력하세요"
                rows={5}
                maxLength={500}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false)
                  setEditingNotice(null)
                  setEditTitle('')
                  setEditContent('')
                }}
                className="cursor-pointer"
              >
                취소
              </Button>
              <Button onClick={handleSaveEdit} className="cursor-pointer">
                수정 완료
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 작성 다이얼로그 */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>새 공지 작성</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="create-title">제목</Label>
              <Input
                id="create-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="공지사항 제목을 입력하세요"
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-content">내용</Label>
              <Textarea
                id="create-content"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="공지사항 내용을 입력하세요"
                rows={5}
                maxLength={500}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false)
                  setEditTitle('')
                  setEditContent('')
                }}
                className="cursor-pointer"
              >
                취소
              </Button>
              <Button onClick={handleCreate} className="cursor-pointer">작성</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 보기 다이얼로그 */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">{viewNotice?.title || '공지사항'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {viewNotice?.created_at && (
              <div className="text-xs text-slate-500">{new Date(viewNotice.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</div>
            )}
            <div className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
              {viewNotice?.content}
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={() => setIsViewDialogOpen(false)} className="cursor-pointer">닫기</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function UpcomingEventsCard({ items, brandColor }: { items: { id: string; title: string; start_at: string; end_at?: string | null; location?: string | null; description?: string | null }[]; brandColor?: string }) {
  const { user } = useAuthData()
  const [selected, setSelected] = useState<{ id: string; title: string; start_at: string; end_at?: string | null; location?: string | null; description?: string | null } | null>(null)
  const [open, setOpen] = useState(false)
  const [isAttending, setIsAttending] = useState(false)
  const [attendees, setAttendees] = useState<{ id: string; avatar_url?: string; name?: string }[]>([])
  const [loadingAttendees, setLoadingAttendees] = useState(false)

  useEffect(() => {
    if (!open || !selected) return
    let aborted = false
    const load = async () => {
      setLoadingAttendees(true)
      try {
        const [token] = await Promise.all([getAuthToken()])
        const res = await fetch(`/api/events/attendees?eventId=${encodeURIComponent(selected.id)}`, {
          headers: token ? { authorization: `Bearer ${token}` } : undefined,
          cache: 'no-store',
        })
        if (!res.ok) throw new Error('failed')
        const list = await res.json()
        if (!aborted) {
          setAttendees(list || [])
          const uid = user?.id
          if (uid) setIsAttending((list || []).some((m: any) => m?.id === uid))
          else setIsAttending(false)
        }
      } catch {
        if (!aborted) setAttendees([])
      } finally {
        if (!aborted) setLoadingAttendees(false)
      }
    }
    void load()
    return () => { aborted = true }
  }, [open, selected, user?.id])

  return (
    <div className="rounded-xl shadow-sm bg-white/60 backdrop-blur-md border" style={{ borderColor: withAlpha(brandColor || '#0f172a', 0.18) }}>
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm" style={{ backgroundColor: withAlpha(brandColor || '#0f172a', 0.08), borderColor: withAlpha(brandColor || '#0f172a', 0.25) }}>
            <CalendarClock className="w-5 h-5" style={{ color: brandColor || '#0f172a' }} />
          </div>
          <h3 className="text-xl font-semibold text-slate-900">다가오는 이벤트</h3>
        </div>
        <div className="space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-3">
                <CalendarClock className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-slate-500 text-sm">예정된 이벤트가 없습니다.</p>
            </div>
          ) : (
            items.map(ev => (
              <div
                key={ev.id}
                className="rounded-2xl p-4 border transition-all hover:shadow-sm hover:scale-[1.02] cursor-pointer"
                style={{
                  backgroundColor: withAlpha(brandColor || '#0f172a', 0.08),
                  borderColor: withAlpha(brandColor || '#0f172a', 0.22),
                }}
                onClick={() => { setSelected(ev); setOpen(true); }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-3 h-3 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: brandColor || '#0f172a' }}></div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900 mb-1">{ev.title}</div>
                      <div className="text-xs font-medium" style={{ color: brandColor || '#0f172a' }}>
                        {new Date(ev.start_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul' })}
                        {ev.end_at && (
                          <>
                            <span className="mx-1">~</span>
                            {new Date(ev.end_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul' })}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 이벤트 상세 모달 */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-center">{selected?.title || '이벤트'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-1">
            {/* 이벤트 항목 */}
            <div className="space-y-3">
              <div className="text-sm font-medium text-slate-900 text-center">이벤트 정보</div>
              <div className="space-y-2">
                <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center border shadow-sm" style={{ backgroundColor: withAlpha(brandColor || '#0f172a', 0.08), borderColor: withAlpha(brandColor || '#0f172a', 0.25) }}>
                    <CalendarClock className="w-4 h-4" style={{ color: brandColor || '#0f172a' }} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">일시</div>
                    <div className="text-sm font-medium text-slate-800">
                      {selected ? new Date(selected.start_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) : '-'}
                      {selected?.end_at && (
                        <>
                          <span className="mx-1">~</span>
                          {new Date(selected.end_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center border shadow-sm" style={{ backgroundColor: withAlpha(brandColor || '#0f172a', 0.08), borderColor: withAlpha(brandColor || '#0f172a', 0.25) }}>
                    <MapPin className="w-4 h-4" style={{ color: brandColor || '#0f172a' }} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">장소</div>
                    <div className="text-sm font-medium text-slate-800">{selected?.location || '미정'}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center border shadow-sm" style={{ backgroundColor: withAlpha(brandColor || '#0f172a', 0.08), borderColor: withAlpha(brandColor || '#0f172a', 0.25) }}>
                    <FileText className="w-4 h-4" style={{ color: brandColor || '#0f172a' }} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">설명</div>
                    <div className="text-sm font-medium text-slate-800">{selected?.description || '추가 정보가 없습니다.'}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 참여 예정 멤버 */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-slate-900">참여 예정 멤버</div>
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {attendees.slice(0, 5).map((m) => (
                    <Avatar key={m.id} className="w-8 h-8 border-2 border-white">
                      <AvatarImage src={m.avatar_url || ''} alt={m.name || 'attendee'} />
                      <AvatarFallback className="text-xs">{(m.name || 'U').slice(0,1)}</AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                <span className="text-xs text-slate-500">{loadingAttendees ? '로딩 중...' : `총 ${attendees.length}명 참여 예정`}</span>
              </div>
            </div>

            {/* 참석하기 토글 */}
            <div className="flex items-center justify-end pt-2">
              <Button
                onClick={async () => {
                  if (!selected) return
                  try {
                    const token = await getAuthToken()
                    const res = await fetch('/api/events/attend', {
                      method: 'POST',
                      headers: {
                        'content-type': 'application/json',
                        ...(token ? { authorization: `Bearer ${token}` } : {}),
                      },
                      body: JSON.stringify({ eventId: selected.id, attend: !isAttending }),
                    })
                    if (!res.ok) throw new Error('failed')
                    setIsAttending((prev) => !prev)
                    // 성공 후 목록 재조회
                    try {
                      const res2 = await fetch(`/api/events/attendees?eventId=${encodeURIComponent(selected.id)}`, {
                        headers: token ? { authorization: `Bearer ${token}` } : undefined,
                        cache: 'no-store',
                      })
                      if (res2.ok) setAttendees(await res2.json())
                    } catch {}
                  } catch {
                    toast.error('처리에 실패했습니다.')
                  }
                }}
                className={`cursor-pointer ${isAttending ? '' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'}`}
                variant={isAttending ? 'default' : 'ghost'}
              >
                {isAttending ? '참여 완료!' : '참여하기'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}


function RecentActivityCard({ items: rawItems, slug, brandColor }: { items: { id: string; kind: 'feed'|'blog'|'note'|'event'|'class'; title: string; created_at: string; href?: string; meta?: string }[]; slug?: string; brandColor?: string }) {
  const items = (rawItems || []).map((it) => {
    if (it.kind === 'feed') return { ...it, href: slug ? `/${slug}/dashboard?tab=home` : undefined }
    if (it.kind === 'blog') return { ...it, href: slug ? `/${slug}/blog/${it.id}` : undefined }
    if (it.kind === 'event') return { ...it, href: slug ? `/${slug}/dashboard?tab=calendar` : undefined }
    if (it.kind === 'class') return { ...it, href: slug ? `/${slug}/classes/${it.id}` : undefined }
    return it
  })

  const Icon = ({ kind }: { kind: 'feed'|'blog'|'note'|'event'|'class' }) => {
    const iconColors = {
      feed: "w-5 h-5 text-slate-600",
      blog: "w-5 h-5 text-slate-600",
      note: "w-5 h-5 text-slate-600",
      event: "w-5 h-5 text-slate-600",
      class: "w-5 h-5 text-slate-600"
    }
    const bgColors = {
      feed: "w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center",
      blog: "w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center",
      note: "w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center",
      event: "w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center",
      class: "w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center"
    }
    
    const IconComponent = {
      feed: Rss,
      blog: Newspaper,
      note: StickyNote,
      event: Calendar,
      class: BookOpen
    }[kind] || FileText

    return (
      <div className={bgColors[kind] || bgColors.feed}>
        <IconComponent className={iconColors[kind] || iconColors.feed} />
      </div>
    )
  }

  return (
    <div className="rounded-xl shadow-sm bg-white/60 backdrop-blur-md border" style={{ borderColor: withAlpha(brandColor || '#0f172a', 0.18) }}>
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm" style={{ backgroundColor: withAlpha(brandColor || '#0f172a', 0.08), borderColor: withAlpha(brandColor || '#0f172a', 0.25) }}>
            <Activity className="w-5 h-5" style={{ color: brandColor || '#0f172a' }} />
          </div>
          <h3 className="text-xl font-semibold text-slate-900">최근 활동</h3>
        </div>
        <div className="space-y-3">
          {items.length===0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-3">
                <Activity className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-slate-500 text-sm">최근 활동이 없습니다.</p>
            </div>
          ) : items.map(it => (
            it.href ? (
              <a key={`${it.kind}:${it.id}`} href={it.href} className={`block rounded-2xl p-4 border border-slate-100 hover:shadow-sm transition-all hover:scale-[1.02] cursor-pointer bg-gradient-to-r from-slate-50 to-white`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <Icon kind={it.kind} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-900 mb-1 line-clamp-2">{it.title}</div>
                      {it.meta && <div className="text-xs text-slate-600 font-medium">{it.meta}</div>}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 shrink-0 mt-1">
                    {new Date(it.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', timeZone: 'Asia/Seoul' })}
                  </div>
                </div>
              </a>
            ) : (
              <div key={`${it.kind}:${it.id}`} role="article" className={`block rounded-2xl p-4 border border-slate-100 hover:shadow-sm transition-all hover:scale-[1.02] cursor-default bg-slate-50`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <Icon kind={it.kind} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-900 mb-1 line-clamp-2">{it.title}</div>
                      {it.meta && <div className="text-xs text-slate-600 font-medium">{it.meta}</div>}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 shrink-0 mt-1">
                    {new Date(it.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', timeZone: 'Asia/Seoul' })}
                  </div>
                </div>
              </div>
            )
          ))}
        </div>
      </div>
    </div>
  )
}


