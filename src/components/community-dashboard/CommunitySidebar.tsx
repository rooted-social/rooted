"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Rss, Home as HomeIcon, Plus, GripVertical, ArrowUp, ArrowDown, Newspaper } from "lucide-react"
import { getCommunityPages, createCommunityPage, deleteCommunityPage, saveCommunityPageOrder, renameCommunityPage, updateCommunityPageMeta } from "@/lib/communities"
import { Settings } from "lucide-react"
import { getReadableTextColor, withAlpha } from "@/utils/color"
 
import { useCommunityContext } from "@/components/community-dashboard/CommunityContext"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
 
import { useAuthData } from "@/components/auth/AuthProvider"

interface CommunitySidebarProps {
  communityId: string
  ownerId?: string | null
  active: { type: "home" } | { type: "feed" } | { type: "page"; id: string }
  onSelectHome: () => void
  onSelectFeed: () => void
  onSelectPage: (id: string) => void
  isOpen?: boolean
  onClose?: () => void
  hideDesktop?: boolean
  communityName?: string
  communityIconUrl?: string | null
}

type PageItem = { id: string; title: string; group_id: string | null; type?: 'feed' | 'blog' | 'page' }

export function CommunitySidebar({ communityId, ownerId, active, onSelectHome, onSelectFeed, onSelectPage, isOpen = false, onClose, hideDesktop = false, communityName, communityIconUrl }: CommunitySidebarProps) {
  const { user } = useAuthData()
  const { brandColor } = useCommunityContext()
  const [pages, setPages] = useState<PageItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [menu, setMenu] = useState<{ type: 'page' | 'group'; id: string } | null>(null)
  const [isAddPageOpen, setIsAddPageOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newType, setNewType] = useState<'feed'|'blog'>('feed')
  const [editTarget, setEditTarget] = useState<{ type: 'page'; id: string; title: string } | null>(null)
  const [confirmTarget, setConfirmTarget] = useState<{ type: 'page'; id: string; title?: string } | null>(null)
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null)
  const [isOwner, setIsOwner] = useState<boolean>(false)
  // 모바일 오버레이 열고 닫힘 애니메이션 상태
  const [mobileVisible, setMobileVisible] = useState<boolean>(false)
  const [mobileAnimateIn, setMobileAnimateIn] = useState<boolean>(false)
  // 재정렬 모드 (HTML5 Drag & Drop 기반, 모바일은 포인터 보조)
  const [reorderMode, setReorderMode] = useState<boolean>(false)
  const [isCoarsePointer, setIsCoarsePointer] = useState<boolean>(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const mq = window.matchMedia('(pointer: coarse)')
      const update = () => setIsCoarsePointer(mq.matches)
      update()
      mq.addEventListener('change', update)
      return () => mq.removeEventListener('change', update)
    } catch {
      setIsCoarsePointer(false)
    }
  }, [])

  // 단순화: 모바일에서도 HTML5 DnD만 사용 (아이콘은 시각적 힌트)

  // 사이드바 폭 비율에 따른 스케일링 (버튼 영역에 적용)
  const desktopAsideRef = useRef<HTMLElement | null>(null)
  const mobileAsideRef = useRef<HTMLElement | null>(null)
  const [desktopScale, setDesktopScale] = useState<number>(1)
  const [mobileScale, setMobileScale] = useState<number>(1)
  const [initialLoaded, setInitialLoaded] = useState<boolean>(false)
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false)
  const lastRefreshRef = useRef<number>(0)

  useEffect(() => {
    const el = desktopAsideRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width
        const base = 256 // 16rem 기준
        const scale = Math.max(0.85, Math.min(1, width / base))
        setDesktopScale(scale)
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const el = mobileAsideRef.current
    if (!mobileVisible || !el) return
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width
        const base = 256 // 모바일도 동일 기준 사용
        const scale = Math.max(0.85, Math.min(1, width / base))
        setMobileScale(scale)
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [mobileVisible])

  const load = async (showSkeleton: boolean = false) => {
    try {
      if (showSkeleton && !initialLoaded) {
        setLoading(true)
      } else {
        setIsRefreshing(true)
      }
      const list = await getCommunityPages(communityId)
      setPages(list.map(p => ({ id: p.id, title: p.title, group_id: (p as any).group_id ?? null, type: (p as any).type || 'page' })))
      const uid = user?.id || null
      const owner = ownerId || null
      setIsOwner(!!uid && !!owner && uid === owner)
    } finally {
      if (showSkeleton && !initialLoaded) {
        setLoading(false)
      }
      setIsRefreshing(false)
      setInitialLoaded(true)
    }
  }

  // 커뮤니티 ID 변경, 페이지 가시성/포커스 복귀 시 재로딩
  useEffect(() => {
    void load(true)
  }, [communityId])
  useEffect(() => {
    const refresh = () => {
      const now = Date.now()
      if (now - lastRefreshRef.current < 5000) return
      lastRefreshRef.current = now
      void load(false)
    }
    const onFocus = () => { refresh() }
    const onVisibility = () => { if (document.visibilityState === 'visible') { refresh() } }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  // 브랜드 컬러는 Context에서 제공됨

  // 사용자 또는 ownerId 변경 시 오너 여부 동기화
  useEffect(() => {
    const uid = user?.id || null
    const owner = ownerId || null
    setIsOwner(!!uid && !!owner && uid === owner)
  }, [user?.id, ownerId])

  // 사용자가 인증되었을 때(세션 준비 완료) 다시 로드
  

  // isOpen prop 변경에 따라 모바일 오버레이 애니메이션 제어
  useEffect(() => {
    if (isOpen) {
      // 열기: 먼저 보이게 한 뒤 다음 프레임에서 슬라이드 인
      setMobileVisible(true)
      const id = requestAnimationFrame(() => setMobileAnimateIn(true))
      return () => cancelAnimationFrame(id)
    } else if (mobileVisible) {
      // 닫기: 슬라이드 아웃 후 언마운트
      setMobileAnimateIn(false)
      const timer = setTimeout(() => setMobileVisible(false), 250)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // 단순화: 포인터 기반 보조 제거

  const handleAddPage = async () => {
    setNewTitle('')
    setIsAddPageOpen(true)
  }


  const handleRemove = async (id: string) => {
    await deleteCommunityPage(id)
    setPages(prev => prev.filter(p => p.id !== id))
    if (active.type === 'page' && active.id === id) onSelectFeed()
    setConfirmTarget(null)
  }

  

  // Flat list only

  // Drag & Drop helpers
  const onDragStart = (e: React.DragEvent, pageId: string, fromGroupId: string | null) => {
    e.dataTransfer.setData('type', 'page')
    e.dataTransfer.setData('pageId', pageId)
    e.dataTransfer.setData('fromGroupId', fromGroupId || '')
    try { e.dataTransfer.effectAllowed = 'move' } catch {}
  }

  const onDropBeforeItem = async (e: React.DragEvent, _targetGroupId: string | null, targetIndex: number) => {
    e.preventDefault()
    if (!isOwner) return
    const type = e.dataTransfer.getData('type')
    if (type !== 'page') return
    const pageId = e.dataTransfer.getData('pageId')
    if (!pageId) return

    // Flat list reorder
    setPages(prev => {
      const ids = prev.map(p => p.id)
      const fromIdx = ids.indexOf(pageId)
      if (fromIdx < 0) return prev
      const safeIdx = Math.max(0, Math.min(targetIndex, ids.length - 1))
      const next = [...prev]
      const [m] = next.splice(fromIdx, 1)
      next.splice(safeIdx, 0, m)
      return next
    })
    try {
      const nextIds = pages.map(p => p.id).filter(id => id !== pageId)
      const safeIdx = Math.max(0, Math.min(targetIndex, nextIds.length))
      nextIds.splice(safeIdx, 0, pageId)
      await saveCommunityPageOrder(communityId, nextIds)
      await load()
    } catch {}
  }

  const handleRenamePage = async (id: string, title: string) => {
    if (!title || !title.trim()) return
    const updated = await renameCommunityPage(id, title.trim())
    setPages(prev => prev.map(p => p.id === id ? { ...p, title: updated.title } : p))
    setEditTarget(null)
  }

  

  // Row component (desktop): 공통 행 렌더링
  const PageRow = ({ p, idx }: { p: PageItem; idx: number }) => {
    const highlight = 'bg-slate-100/80 ring-2 ring-slate-300/60 rounded-xl shadow-sm'
    return (
      <div
        key={p.id}
        className={`relative flex items-center gap-2 ${dragOverItemId===p.id ? highlight : ''} transition-all duration-200`}
        draggable={isOwner && reorderMode}
        onDragStart={(e) => onDragStart(e, p.id, null)}
        onDragOver={(e) => { e.preventDefault(); setDragOverItemId(p.id) }}
        onDrop={(e) => { void onDropBeforeItem(e, null, idx); setDragOverItemId(null) }}
      >
        <>
          {isOwner && reorderMode && (
            <button className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-grab touch-none" title="드래그하여 순서 변경">
              <GripVertical className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => onSelectPage(p.id)}
            className={`group flex-1 text-left px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-all duration-200 transform hover:scale-[1.01] ${
              active.type === 'page' && active.id === p.id
                ? (brandColor ? 'shadow-lg' : 'bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-lg shadow-slate-900/25')
                : 'text-slate-600 hover:bg-gradient-to-r hover:from-slate-50 hover:to-slate-100 hover:text-slate-800 hover:shadow-md'
            }`}
            style={active.type === 'page' && active.id === p.id && brandColor ? { backgroundColor: brandColor, color: getReadableTextColor(brandColor) } : undefined}
          >
            <span className="inline-block w-2 h-2 bg-current rounded-full mr-3 opacity-60"></span>
            {p.title}
          </button>
          {isOwner && reorderMode && (
            <button className="h-8 w-8 rounded-lg hover:bg-slate-100/80 text-slate-400 hover:text-slate-600 transition-all duration-200 transform hover:scale-110 cursor-pointer" onClick={(e) => { e.stopPropagation(); setMenu({ type: 'page', id: p.id }) }} title="설정">
              <Settings className="w-4 h-4" />
            </button>
          )}
          {isOwner && menu?.type === 'page' && menu?.id === p.id && (
            <div className="absolute right-0 top-full mt-2 bg-white/95 backdrop-blur-sm border border-slate-200/60 rounded-lg shadow-lg p-2 text-xs z-10" onClick={(e)=>e.stopPropagation()}>
              <button className="block w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 hover:text-slate-700 transition-colors text-slate-600" onClick={() => setEditTarget({ type: 'page', id: p.id, title: p.title })}>이름 수정</button>
              <button className="block w-full text-left px-3 py-2 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors text-slate-600" onClick={() => setConfirmTarget({ type: 'page', id: p.id, title: p.title })}>삭제</button>
            </div>
          )}
        </>
      </div>
    )
  }

  // 모바일 대안: 같은 그룹 내에서 위/아래 버튼으로 순서 이동
  const movePageWithinGroup = async (pageId: string, groupId: string | null, direction: 'up' | 'down') => {
    setPages(prev => {
      const ids = prev.map(p => p.id)
      const idx = ids.indexOf(pageId)
      if (idx < 0) return prev
      const nextIdx = direction === 'up' ? Math.max(0, idx - 1) : Math.min(ids.length - 1, idx + 1)
      if (nextIdx === idx) return prev
      const next = [...prev]
      const [m] = next.splice(idx, 1)
      next.splice(nextIdx, 0, m)
      return next
    })
    try {
      const ids = pages.map(p => p.id)
      const idx = ids.indexOf(pageId)
      if (idx >= 0) {
        const nextIdx = direction === 'up' ? Math.max(0, idx - 1) : Math.min(ids.length - 1, idx + 1)
        if (nextIdx !== idx) {
          const arr = [...ids]
          const [m] = arr.splice(idx, 1)
          arr.splice(nextIdx, 0, m)
          await saveCommunityPageOrder(communityId, arr)
          await load()
        }
      }
    } catch {}
  }

  return (
    <>
      {/* Desktop Sidebar */}
      {!hideDesktop && (
      <aside ref={desktopAsideRef} className="hidden md:block shrink-0 border-r border-slate-200/60 bg-gradient-to-b from-white via-slate-50/30 to-white min-h-screen sticky top-0 z-30 shadow-lg overflow-y-auto" style={{ width: 'clamp(14rem, 18vw, 16rem)' }} onClick={() => setMenu(null)}>
        <div className="p-4 space-y-3">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wide px-3 mb-2">메인</div>
          <button
            onClick={onSelectHome}
            className={`group w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer transform hover:scale-[1.02] ${
              active.type === 'home'
                ? (brandColor ? 'shadow-lg' : 'bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-lg shadow-slate-900/25')
                : 'text-slate-600 hover:bg-gradient-to-r hover:from-slate-50 hover:to-slate-100 hover:text-slate-800 hover:shadow-md'
            }`}
            style={active.type === 'home' && brandColor ? { backgroundColor: brandColor, color: getReadableTextColor(brandColor) } : undefined}
          >
            <HomeIcon className={`w-5 h-5 transition-colors ${
              active.type === 'home' ? (brandColor ? 'text-white' : 'text-white') : 'text-slate-500 group-hover:text-slate-700'
            }`} />
            <span className="truncate">대시보드</span>
          </button>

          <button
            onClick={onSelectFeed}
            className={`group w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer transform hover:scale-[1.02] ${
              active.type === 'feed'
                ? (brandColor ? 'shadow-lg' : 'bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-lg shadow-slate-900/25')
                : 'text-slate-600 hover:bg-gradient-to-r hover:from-slate-50 hover:to-slate-100 hover:text-slate-800 hover:shadow-md'
            }`}
            style={active.type === 'feed' && brandColor ? { backgroundColor: brandColor, color: getReadableTextColor(brandColor) } : undefined}
          >
            <Rss className={`w-5 h-5 transition-colors ${
              active.type === 'feed' ? (brandColor ? 'text-white' : 'text-white') : 'text-slate-500 group-hover:text-slate-700'
            }`} />
            <span className="truncate">피드</span>
          </button>

          <div className="my-4 border-t border-slate-200/60" />

          {isOwner && (
            <div className="hidden"></div>
          )}

          {loading ? (
            <div className="space-y-3">
              <div className="h-10 bg-gradient-to-r from-slate-100 to-slate-200 rounded-xl animate-pulse" />
              <div className="h-10 bg-gradient-to-r from-slate-100 to-slate-200 rounded-xl animate-pulse" />
              <div className="h-10 bg-gradient-to-r from-slate-100 to-slate-200 rounded-xl animate-pulse" />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wide px-3 mb-2">페이지 목록</div>
              {/* 그룹 없는 페이지 영역 */}
              <div
                className="rounded-xl transition-all duration-200"
                onDragOver={(e) => isOwner ? e.preventDefault() : undefined}
              >
                {pages.length ? (
                  <div className="space-y-1">
                    {pages.map((p, idx) => (
                      <PageRow key={p.id} p={p} idx={idx} />
                    ))}
                  </div>
                ) : (
                  <></>
                )}
              </div>
              <div className="my-4 border-t border-slate-200/60" />
                  
            </div>
          )}
        </div>
        {/* 하단 추가영역: 오너에게만 표시 */}
        {isOwner && (
          <div className="p-4 space-y-3">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide px-3">페이지 목록 관리</div>
            <div className="flex gap-3" style={{ transform: `scale(${desktopScale})`, transformOrigin: 'left top', width: `${(1 / desktopScale) * 100}%` }}>
              <button
                onClick={handleAddPage}
                className="group flex-1 flex items-center justify-center gap-2 px-4 py-3 text-xs font-medium rounded-xl border text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all duration-200 whitespace-nowrap cursor-pointer"
              >
                <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" />
                페이지 추가
              </button>
            </div>
            <div className="mt-3">
              <button
                onClick={() => setReorderMode(v => !v)}
                className={`w-full px-4 py-3 text-xs font-medium rounded-xl border cursor-pointer whitespace-nowrap inline-flex items-center justify-center gap-2 ${reorderMode ? 'bg-slate-900 text-white border-slate-900' : 'text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                title="페이지 관리"
              >
                <Settings className="w-4 h-4" />
                {reorderMode ? '완료' : '페이지 관리'}
              </button>
            </div>
          </div>
        )}
      </aside>
      )}

      {/* Mobile Sidebar Overlay */}
      {mobileVisible && (
        <div className="md:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div 
            className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${mobileAnimateIn ? 'opacity-100' : 'opacity-0'}`}
            onClick={onClose}
          />
          
          {/* Sidebar - 세련된 디자인 */}
          <aside
            ref={mobileAsideRef}
            className={`absolute left-0 top-0 bottom-0 bg-white border-r border-slate-200/60 shadow-xl transform transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${mobileAnimateIn ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'} transition-opacity`}
            style={{ width: 'clamp(16rem, 85vw, 18rem)' }}
            onClick={() => setMenu(null)}
          >
            <div className="h-full flex flex-col">
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* 헤더: 커뮤니티 아이콘 + 이름 */}
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-white border border-slate-200 flex-shrink-0">
                  {communityIconUrl ? (
                    <img src={communityIconUrl} alt="icon" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-slate-900 text-white grid place-items-center">
                      <span className="text-sm font-bold">{communityName?.[0] || '?'}</span>
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-slate-500">커뮤니티</div>
                  <div className="text-base font-semibold text-slate-900 truncate">{communityName || 'Community'}</div>
                </div>
              </div>

              {/* 메인 섹션 */}
              <div className="pt-1">
                <div className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">메인</div>
              {/* 메인 버튼들 - 세련된 스타일 */}
              <button
                onClick={() => {
                  onSelectHome()
                  onClose?.()
                }}
                className={`group w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  active.type === 'home' ? '' : 'text-slate-700 hover:bg-slate-100'
                }`}
                style={active.type === 'home' && brandColor ? { backgroundColor: withAlpha(brandColor, 0.12), color: brandColor } : undefined}
              >
                <HomeIcon className="w-5 h-5" style={active.type === 'home' && brandColor ? { color: brandColor } : undefined} />
                <span className="font-medium">대시보드</span>
              </button>

              <button
                onClick={() => {
                  onSelectFeed()
                  onClose?.()
                }}
                className={`group w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  active.type === 'feed' ? '' : 'text-slate-700 hover:bg-slate-100'
                }`}
                style={active.type === 'feed' && brandColor ? { backgroundColor: withAlpha(brandColor, 0.12), color: brandColor } : undefined}
              >
                <Rss className="w-5 h-5" style={active.type === 'feed' && brandColor ? { color: brandColor } : undefined} />
                <span className="font-medium">피드</span>
              </button>
              </div>

              {pages.length > 0 && (
                <div className="border-t border-slate-200/60 my-3" />
              )}

              {/* 오너 전용 버튼들은 페이지/그룹 목록 하단으로 이동 */}

              {loading ? (
                <div className="space-y-3">
                  <div className="h-10 bg-gradient-to-r from-slate-100 to-slate-200 rounded-xl animate-pulse" />
                  <div className="h-10 bg-gradient-to-r from-slate-100 to-slate-200 rounded-xl animate-pulse" />
                  <div className="h-10 bg-gradient-to-r from-slate-100 to-slate-200 rounded-xl animate-pulse" />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="px-1 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">페이지 목록</div>
                  {/* 페이지 목록 - 세련된 스타일 */}
                  <div
                    className="rounded-lg"
                    onDragOver={(e) => isOwner ? e.preventDefault() : undefined}
                  >
                    {pages.map((p, idx) => (
                      <div
                        key={p.id}
                        className={`relative flex items-center gap-2 ${dragOverItemId===p.id ? 'bg-slate-100/80 ring-2 ring-slate-300/60 rounded-lg' : ''} transition-all duration-200`}
                        draggable={isOwner && reorderMode && !isCoarsePointer}
                        onDragStart={(e) => onDragStart(e, p.id, null)}
                        onDragOver={(e) => { if (isOwner) { e.preventDefault(); setDragOverItemId(p.id) } }}
                        onDrop={(e) => { if (isOwner) { void onDropBeforeItem(e, null, idx); setDragOverItemId(null) } }}
                      >
                        {isOwner && reorderMode && (
                          <div className="flex items-center gap-1">
                            <button className="h-7 w-7 rounded-md hover:bg-slate-100 text-slate-500 cursor-pointer" title="위로" onClick={() => movePageWithinGroup(p.id, null, 'up')}>
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button className="h-7 w-7 rounded-md hover:bg-slate-100 text-slate-500 cursor-pointer" title="아래로" onClick={() => movePageWithinGroup(p.id, null, 'down')}>
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button className="h-7 w-7 rounded-md hover:bg-slate-100 text-slate-500 cursor-pointer" title="설정" onClick={(e) => { e.stopPropagation(); setMenu({ type: 'page', id: p.id }) }}>
                              <Settings className="w-3.5 h-3.5" />
                            </button>
                            {menu?.type === 'page' && menu?.id === p.id && (
                              <div className="absolute right-0 top-full mt-2 bg-white/95 backdrop-blur-sm border border-slate-200/60 rounded-lg shadow-lg p-2 text-xs z-50" onClick={(e)=>e.stopPropagation()}>
                                <button className="block w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 hover:text-slate-700 transition-colors text-slate-600" onClick={() => { setEditTarget({ type: 'page', id: p.id, title: p.title }); setMenu(null) }}>이름 수정</button>
                                <button className="block w-full text-left px-3 py-2 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors text-slate-600" onClick={() => { setConfirmTarget({ type: 'page', id: p.id, title: p.title }); setMenu(null) }}>삭제</button>
                              </div>
                            )}
                          </div>
                        )}
                        <button
                          onClick={() => {
                            onSelectPage(p.id)
                            onClose?.()
                          }}
                          className={`group flex-1 text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                            active.type === 'page' && active.id === p.id ? '' : 'text-slate-700 hover:bg-slate-100'
                          }`}
                          style={active.type === 'page' && active.id === p.id && brandColor ? { backgroundColor: withAlpha(brandColor, 0.12), color: brandColor } : undefined}
                        >
                          <>
                            <span className="inline-block w-1.5 h-1.5 bg-current rounded-full mr-3 opacity-60"></span>
                            {p.title}
                          </>
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  {/* 하단: 오너 전용 추가/관리 버튼 */}
                  {isOwner && (
                    <>
                      <div className="border-t border-slate-200/60 my-4" />
                      <div className="flex items-center gap-2" style={{ transform: `scale(${mobileScale})`, transformOrigin: 'left top', width: `${(1 / mobileScale) * 100}%` }}>
                        <button onClick={handleAddPage} className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 cursor-pointer">페이지 추가</button>
                        <button
                          onClick={() => setReorderMode(v => !v)}
                          className={`px-3 py-2 rounded-lg border text-slate-700 text-sm font-medium cursor-pointer ${reorderMode ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-300 hover:bg-slate-50'}`}
                          title="모바일 관리 모드"
                        >
                          {reorderMode ? '완료' : '관리'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* 모달들 */}
      <Dialog open={isAddPageOpen} onOpenChange={setIsAddPageOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새 페이지 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="page-title">페이지 이름</Label>
            <Input id="page-title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="예: 소개, 공지 등" />
            <div className="space-y-2">
              <Label>페이지 유형</Label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { key: 'feed', label: '피드' },
                  { key: 'blog', label: '블로그' },
                ] as const).map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setNewType(opt.key as any)}
                    className={`rounded-full border px-3 py-2 text-sm cursor-pointer transition-colors ${newType===opt.key ? 'bg-slate-900 text-white border-slate-900' : 'text-slate-700 hover:bg-slate-50'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {/* 유형 설명 */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3">
                {newType === 'feed' ? (
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <Rss className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium text-slate-900">피드 · 빠른 공유와 토론</p>
                      <p className="text-xs text-slate-600">카드형 게시글과 댓글 중심. 공지, 질문, 토론 등 빠른 업데이트에 적합합니다.</p>
                      <div className="mt-2 grid grid-cols-1 gap-1.5">
                        <div className="h-7 rounded-lg bg-white border border-slate-200 flex items-center gap-2 px-2">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" />
                          <span className="h-2 w-20 rounded bg-slate-200" />
                        </div>
                        <div className="h-7 rounded-lg bg-white border border-slate-200 flex items-center gap-2 px-2 opacity-80">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400" />
                          <span className="h-2 w-16 rounded bg-slate-200" />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <Newspaper className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium text-slate-900">블로그 · 깊이 있는 글</p>
                      <p className="text-xs text-slate-600">이미지와 본문 중심의 글 형식으로 장문 콘텐츠에 적합합니다.</p>
                      <div className="mt-2 grid grid-cols-3 gap-1.5">
                        <div className="col-span-1 h-12 rounded-lg bg-white border border-slate-200" />
                        <div className="col-span-2 space-y-1.5">
                          <div className="h-2.5 rounded bg-slate-200 w-24" />
                          <div className="h-2 rounded bg-slate-200 w-36" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <button className="px-3 py-1.5 rounded-md border text-sm" onClick={() => setIsAddPageOpen(false)}>취소</button>
            <button className="px-3 py-1.5 rounded-md bg-slate-900 text-white text-sm" onClick={async () => {
              if (!newTitle.trim()) return
              // 타입별 기본 메타 설정
              const meta = newType === 'blog' ? { description: '블로그 글을 작성해보세요' } : {}
              let created = await createCommunityPage(communityId, newTitle.trim(), null, newType, null, (meta as any).description || null)
              // 일부 환경에서 type 컬럼이 없을 수 있으므로 방어적으로 한번 더 기록
              try { created = await updateCommunityPageMeta(created.id, { type: newType }) } catch {}
              setPages(prev => [...prev, { id: created.id, title: created.title, group_id: null, type: (created as any).type || newType }])
              setIsAddPageOpen(false)
            }}>추가</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      

      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>페이지 이름 수정</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="edit-title">이름</Label>
            <Input id="edit-title" value={editTarget?.title || ''} onChange={(e) => editTarget && setEditTarget({ ...editTarget, title: e.target.value })} />
          </div>
          <DialogFooter>
            <button className="px-3 py-1.5 rounded-md border text-sm" onClick={() => setEditTarget(null)}>취소</button>
            <button className="px-3 py-1.5 rounded-md bg-slate-900 text-white text-sm" onClick={() => { if (!editTarget) return; void handleRenamePage(editTarget.id, editTarget.title); }}>저장</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmTarget} onOpenChange={(open) => { if (!open) setConfirmTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>정말 삭제하시겠습니까?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 px-1">이 작업은 되돌릴 수 없습니다.</p>
          <DialogFooter>
            <button className="px-3 py-1.5 rounded-md border text-sm" onClick={() => setConfirmTarget(null)}>취소</button>
            <button className="px-3 py-1.5 rounded-md bg-red-600 text-white text-sm" onClick={() => { if (!confirmTarget) return; void handleRemove(confirmTarget.id) }}>삭제</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}


 