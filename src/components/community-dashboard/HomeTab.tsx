"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { updateNotice, deleteNotice, createNotice } from "@/lib/communities"
import { fetchHomeData } from '@/lib/dashboard'
import { Target, FileText, BookOpen, Newspaper, CalendarClock, Rss, StickyNote, Calendar, Bell, Activity, Settings, Edit3, Trash2, MoreVertical, SquarePen } from "lucide-react"
import { toast } from "sonner"
import type { CommunitySettings, Notice, Post } from "@/types/community"
import { withAlpha } from "@/utils/color"
import { useCommunityContext } from "@/components/community-dashboard/CommunityContext"
// 클라이언트 직접 Supabase 조회 제거

interface HomeTabProps { communityId: string; slug?: string }

export function HomeTab({ communityId, slug }: HomeTabProps) {
  const [settings, setSettings] = useState<CommunitySettings | null>(null)
  const [notices, setNotices] = useState<Notice[]>([])
  // const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [canManage, setCanManage] = useState<boolean>(false)
  const [upcomingEvents, setUpcomingEvents] = useState<{ id: string; title: string; start_at: string }[]>([])
  const [recentActivity, setRecentActivity] = useState<{ id: string; kind: 'feed'|'blog'|'note'|'event'|'class'; title: string; created_at: string; href?: string; meta?: string }[]>([])
  // 홈 탭 내 통계 섹션은 별도 페이지로 이동됨
  const { brandColor: contextBrandColor } = useCommunityContext()

  useEffect(() => {
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
      {/* 상단 전체 배너 */}
      {settings?.banner_url && (
        <div className="lg:col-span-3 -mt-2 md:mt-0">
          <div className="relative w-full overflow-hidden rounded-3xl border border-slate-200/50 shadow-sm">
            <img
              src={settings.banner_url}
              alt="커뮤니티 배너"
              className="w-full h-40 md:h-56 lg:h-60 object-cover"
            />
          </div>
        </div>
      )}
      {/* 좌측 메인 컨텐츠 */}
      {(() => { const brandColor = settings?.brand_color || contextBrandColor || undefined; return (
      <div className="lg:col-span-2 space-y-6 min-w-0 max-w-full">
        {/* 1) Our Mission */}
        <div className="rounded-3xl shadow-sm bg-white/60 backdrop-blur-md border" style={{ borderColor: withAlpha(brandColor || '#0f172a', 0.18) }}>
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
        <RecentActivityCard items={recentActivity} slug={slug} brandColor={brandColor} />
      </div>
      )})()}

      {/* 우측 사이드바 */}
      {(() => { const brandColor = settings?.brand_color || contextBrandColor || undefined; return (
      <div className="space-y-6 min-w-0 max-w-full">
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
              <div className="rounded-3xl shadow-sm bg-white/60 backdrop-blur-md border" style={{ borderColor: withAlpha(brandColor || '#0f172a', 0.18) }}>
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
              <div className="text-xs text-slate-500">{new Date(viewNotice.created_at).toLocaleString('ko-KR')}</div>
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

function UpcomingEventsCard({ items, brandColor }: { items: { id: string; title: string; start_at: string }[]; brandColor?: string }) {
  return (
    <div className="rounded-3xl shadow-sm bg-white/60 backdrop-blur-md border" style={{ borderColor: withAlpha(brandColor || '#0f172a', 0.18) }}>
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
                className="rounded-2xl p-4 border transition-all hover:shadow-sm hover:scale-[1.02]"
                style={{
                  backgroundColor: withAlpha(brandColor || '#0f172a', 0.08),
                  borderColor: withAlpha(brandColor || '#0f172a', 0.22),
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-3 h-3 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: brandColor || '#0f172a' }}></div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900 mb-1">{ev.title}</div>
                      <div className="text-xs font-medium" style={{ color: brandColor || '#0f172a' }}>
                        {new Date(ev.start_at).toLocaleDateString('ko-KR', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
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
    <div className="rounded-3xl shadow-sm bg-white/60 backdrop-blur-md border" style={{ borderColor: withAlpha(brandColor || '#0f172a', 0.18) }}>
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
            <a key={`${it.kind}:${it.id}`} href={it.href || '#'} className={`block rounded-2xl p-4 border border-slate-100 hover:shadow-sm transition-all hover:scale-[1.02] ${it.href ? 'cursor-pointer bg-gradient-to-r from-slate-50 to-white' : 'cursor-default bg-slate-50'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Icon kind={it.kind} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-900 mb-1 line-clamp-2">{it.title}</div>
                    {it.meta && <div className="text-xs text-slate-600 font-medium">{it.meta}</div>}
                  </div>
                </div>
                <div className="text-xs text-slate-500 shrink-0 mt-1">
                  {new Date(it.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}


