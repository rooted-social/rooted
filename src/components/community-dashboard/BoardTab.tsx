"use client"

import { useEffect, useState, useRef } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
// Textarea is already imported above; remove duplicate
import { createPost, deletePost, updatePost, getCategories, createCategory, updateCategory, deleteCategory, saveCategoryOrder, toggleLike, getLikeCount, incrementPostViews, hasLiked, getHasLikedMap } from "@/lib/communities"
import type { Post } from "@/types/community"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getAvatarUrl } from "@/lib/utils"
import { Heart, MessageSquare, MoreVertical, Rss, Eye, Sparkles, Send, Plus, Hash, Trash2, Edit3, Loader2, Pin } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { fetchFeed } from '@/lib/dashboard'
import { ensureProfile } from "@/lib/profiles"
import { Textarea } from "@/components/ui/textarea"
import { useAuthData } from "@/components/auth/AuthProvider"
import AnimatedBackground from "@/components/AnimatedBackground"
import { useCommunityContext } from "@/components/community-dashboard/CommunityContext"
import { getReadableTextColor, withAlpha } from "@/utils/color"

interface BoardTabProps {
  communityId: string
  ownerId?: string | null
  pageId?: string | null
}

type BoardFolder = { id: string; name: string; parent_id: string | null }
const FEED_ID = 'feed'

interface BoardTabWithVariantProps extends BoardTabProps {
  variant?: 'standalone' | 'contentOnly'
}

export function BoardTab({ communityId, ownerId, pageId = null, variant = 'standalone' }: BoardTabWithVariantProps & { pageId?: string | null }) {
  const { user } = useAuthData()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [activeFolder, setActiveFolder] = useState<string>(FEED_ID)
  const [categories, setCategories] = useState<BoardFolder[]>([])
  const [newCategory, setNewCategory] = useState("")
  const [page, setPage] = useState(1)
  const pageSize = 10
  const [totalCount, setTotalCount] = useState<number>(0)
  // 인라인 포스팅 바 상태
  const [inlineTitle, setInlineTitle] = useState("")
  const [inlineContent, setInlineContent] = useState("")
  const [meAvatar, setMeAvatar] = useState<string | undefined>(undefined)
  const [expanded, setExpanded] = useState<boolean>(false)
  const { brandColor: contextBrandColor } = useCommunityContext()
  const taRef = useRef<HTMLTextAreaElement | null>(null)
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({})
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({})
  const [showComments, setShowComments] = useState<Record<string, boolean>>({})
  const [comments, setComments] = useState<Record<string, Post[] | any[]>>({})
  const [commentCountsMap, setCommentCountsMap] = useState<Record<string, number>>({})
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({})
  const [commentEditInputs, setCommentEditInputs] = useState<Record<string, string>>({})
  const dragIndexRef = { current: -1 }
  const [openedPostMap, setOpenedPostMap] = useState<Record<string, boolean>>({})
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isOwner, setIsOwner] = useState<boolean>(false)
  const [editOpen, setEditOpen] = useState<boolean>(false)
  const queryClient = useQueryClient()
  const [refreshTick, setRefreshTick] = useState(0)

  // 브랜드 컬러는 컨텍스트에서 제공 (중복 DB 요청 제거)

  const timeAgo = (iso: string) => {
    const now = Date.now()
    const then = new Date(iso).getTime()
    const diffMs = Math.max(0, now - then)
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    if (hours >= 24) return `${Math.floor(hours / 24)}일 전`
    if (hours < 1) {
      const minutes = Math.floor(diffMs / (1000 * 60))
      return `${Math.max(0, minutes)}분 전`
    }
    return `${Math.max(1, hours)}시간 전`
  }

  // 모바일 표시용 이름 포맷터: 최대 7글자, 초과 시 말줄임표
  const truncateName = (name?: string, max: number = 7): string => {
    if (!name) return '사용자'
    const chars = Array.from(name.trim())
    return chars.length > max ? chars.slice(0, max).join('') + '…' : chars.join('')
  }

  // Feed query (키 기반 dedupe + 캐시)
  const { data: feedData, isLoading: feedLoading } = useQuery({
    queryKey: ['feed', communityId, page, pageId ?? 'null', refreshTick],
    queryFn: async () => {
      const offset = (page - 1) * pageSize
      return await fetchFeed(communityId, { pageId, limit: pageSize, offset, force: refreshTick > 0 })
    },
    staleTime: 120000,
    retry: 1,
    refetchOnWindowFocus: false,
  })

  // Categories query (존재 시 로드)
  const { data: categoryData } = useQuery({
    queryKey: ['categories', communityId],
    queryFn: async () => {
      try { return await getCategories(communityId) } catch { return [] as any[] }
    },
    staleTime: 300000,
    refetchOnWindowFocus: false,
  })

  // Query 결과를 로컬 상태에 반영 (기존 렌더 로직 유지)
  useEffect(() => {
    setLoading(feedLoading)
  }, [feedLoading])

  useEffect(() => {
    if (!feedData) return
    const { posts: data, likeCounts: likeMap, commentCounts: cMap, totalCount: tc } = feedData as any
    setPosts(data as any)
    setTotalCount(tc || 0)
    setLikeCounts(likeMap || {})
    setCommentCountsMap(cMap || {})
    ;(async () => {
      try {
        const ids = (data || []).map((pp: any) => pp.id)
        if (ids.length > 0) {
          const map = await getHasLikedMap(ids)
          setLikedMap(map)
        } else {
          setLikedMap({})
        }
      } catch {}
    })()
  }, [feedData])

  useEffect(() => {
    const rows = (categoryData || []) as any[]
    if (rows.length > 0) setCategories(rows.map(c => ({ id: c.id, name: c.name, parent_id: c.parent_id || null })))
    else setCategories([])
  }, [categoryData])

  // StrictMode 중복 호출 로직은 React Query 키 기반으로 대체

  useEffect(() => {
    // 내 프로필 이미지 로드(로그인 사용자 기준)
    ;(async () => {
      const uid = user?.id || null
      setCurrentUserId(uid)
      if (uid) {
        try {
          const profile = await ensureProfile(uid)
          setMeAvatar(profile?.avatar_url)
        } catch {}
      }
      const owner = ownerId || null
      setIsOwner(!!owner && !!uid && owner === uid)
    })()
  }, [communityId, ownerId, user?.id])

  const handleCreate = async () => {
    if (!title.trim()) return
    try {
      await createPost({ community_id: communityId, title, content })
      setTitle("")
      setContent("")
      setOpen(false)
      // 새 글 즉시 반영: 피드 쿼리 무효화
      await queryClient.invalidateQueries({ queryKey: ['feed'] })
      toast.success("게시글이 작성되었습니다.")
    } catch (err: any) {
      toast.error(err?.message || '글 작성 중 오류가 발생했습니다.')
    }
  }

  const handleUpdate = async (postId: string) => {
    try {
      const derivedTitle = (content || '').trim().slice(0, 30)
      await updatePost(postId, { title: derivedTitle, content })
      setEditingId(null)
      setTitle("")
      setContent("")
      setEditOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['feed'] })
      toast.success('게시글이 수정되었습니다.')
    } catch (err: any) {
      toast.error(err?.message || '수정 중 오류가 발생했습니다.')
    }
  }

  const handleDelete = async (postId: string) => {
    try {
      await deletePost(postId)
      // 삭제 직후 즉시 반영: 피드 쿼리 무효화
      await queryClient.invalidateQueries({ queryKey: ['feed'] })
      toast.success('게시글이 삭제되었습니다.')
    } catch (err: any) {
      toast.error(err?.message || '삭제 중 오류가 발생했습니다.')
    }
  }

  let filtered = posts
  // 스키마에 page_id 컬럼이 없는 경우가 있어(레거시) 필터링을 조건부로 적용한다
  const hasPageIdColumn = posts.some(p => Object.prototype.hasOwnProperty.call(p as any, 'page_id'))
  if (pageId !== null && hasPageIdColumn) {
    // 페이지 스코프인 경우: 해당 page_id의 글만 표시
    filtered = posts.filter(p => (p as any).page_id === pageId)
  }
  const filteredPosts = activeFolder === FEED_ID ? filtered.filter(p => (p as any).category_id == null) : filtered.filter(p => (p as any).category_id === activeFolder)
  const totalPages = Math.max(1, Math.ceil((totalCount || filteredPosts.length) / pageSize))
  const pagedPosts = filteredPosts // 서버 페이징으로 이미 잘려옴

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return
    try {
      const created = await createCategory({ community_id: communityId, name: newCategory.trim(), parent_id: null, position: categories.length })
      setCategories(prev => [...prev, { id: created.id, name: created.name, parent_id: created.parent_id || null }])
      setNewCategory("")
      toast.success('카테고리가 추가되었습니다.')
    } catch (err: any) {
      toast.error(err?.message || '카테고리 생성 중 오류가 발생했습니다. 테이블이 없는지 확인하세요.')
    }
  }

  const handleRemoveCategory = async (id: string) => {
    try {
      await deleteCategory(id)
      setCategories(prev => prev.filter(c => c.id !== id))
      toast.success('카테고리가 삭제되었습니다.')
    } catch (err: any) {
      toast.error(err?.message || '카테고리 삭제 중 오류가 발생했습니다.')
    }
  }

  const handleLike = async (postId: string) => {
    await toggleLike(postId)
    // 낙관적 업데이트: 즉시 카운트 갱신을 위해 다시 로드 또는 부분 업데이트 가능
    const c = await getLikeCount(postId)
    setLikeCounts(prev => ({ ...prev, [postId]: c }))
    setLikedMap(prev => ({ ...prev, [postId]: !prev[postId] }))
  }

  const handleReorder = async (from: number, to: number) => {
    setCategories(prev => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
    // 저장
    const orderedIds = categories.map(c => c.id)
    try { await saveCategoryOrder(communityId, orderedIds); toast.success('카테고리 순서가 저장되었습니다.') } catch (err: any) {
      toast.error(err?.message || '카테고리 순서 저장 중 오류가 발생했습니다.')
    }
  }

  const onDragStart = (idx: number) => { dragIndexRef.current = idx }
  const onDrop = (idx: number) => {
    if (dragIndexRef.current === -1 || dragIndexRef.current === idx) return
    void handleReorder(dragIndexRef.current, idx)
    dragIndexRef.current = -1
  }

  // 카드 펼침/접힘 + 조회수 증가
  const handleToggleCard = async (e: any, postId: string) => {
    const card = (e.currentTarget.closest('[data-slot=card]') as HTMLElement) || (e.currentTarget as HTMLElement)
    const body = card.querySelector('[data-slot=card-content]') as HTMLElement
    if (!body) return
    const isOpen = !!(body.style.maxHeight && body.style.maxHeight !== '0px')
    if (!isOpen) {
      if (!openedPostMap[postId]) {
        setOpenedPostMap(prev => ({ ...prev, [postId]: true }))
        try { await incrementPostViews(postId) } catch {}
        setPosts(prev => prev.map(pp => pp.id === postId ? ({ ...(pp as any), views: (((pp as any).views ?? 0) + 1) }) : pp))
      }
      body.style.maxHeight = body.scrollHeight + 'px'
      // 카드 열림 시 댓글 자동 로드 및 표시
      setShowComments(prev => ({ ...prev, [postId]: true }))
      if (!comments[postId]) {
        await loadComments(postId)
      }
    } else {
      body.style.maxHeight = ''
      // 카드 닫힘 시 댓글 영역도 닫기
      setShowComments(prev => ({ ...prev, [postId]: false }))
    }
  }

  const loadComments = async (postId: string) => {
    const { getComments } = await import("@/lib/communities")
    const cs = await getComments(postId)
    setComments(prev => ({ ...prev, [postId]: cs }))
    setCommentCountsMap(prev => ({ ...prev, [postId]: (cs || []).length }))
  }

  const addComment = async (postId: string) => {
    const text = commentInputs[postId]?.trim()
    if (!text) return
    try {
      // 낙관적 추가
      const tempId = `temp-${Date.now()}`
      const optimistic = {
        id: tempId,
        content: text,
        created_at: new Date().toISOString(),
        author: { full_name: '나', username: 'me', avatar_url: meAvatar, updated_at: null },
      }
      setComments(prev => ({ ...prev, [postId]: [...(prev[postId] || []), optimistic] }))
      setCommentCountsMap(prev => ({ ...prev, [postId]: (prev[postId] ?? 0) + 1 }))
      setCommentInputs(prev => ({ ...prev, [postId]: '' }))

      const { createComment } = await import("@/lib/communities")
      await createComment({ post_id: postId, content: text })
      // 서버 확정본으로 재동기화
      await loadComments(postId)
      toast.success('댓글이 등록되었습니다.')
    } catch (err: any) {
      // 롤백
      await loadComments(postId)
      toast.error(err?.message || '댓글 작성 중 오류가 발생했습니다.')
    }
  }

  return (
    <>
      <AnimatedBackground zIndexClass="-z-10" />
      <section className={`${variant === 'standalone' ? 'grid md:grid-cols-4 gap-4' : 'space-y-4 max-w-3xl md:max-w-2xl mx-auto w-full'} overflow-x-hidden px-3 md:px-0 relative z-10`}> 
      {variant === 'contentOnly' && (
        <>
          {!pageId && (
            <div className="flex items-center justify-center gap-3 text-slate-800 mb-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg ring-2 ring-white/60" style={{ backgroundColor: withAlpha(contextBrandColor || '#0f172a', 0.18) }}>
                <Sparkles className="w-5 h-5" style={{ color: contextBrandColor || '#0f172a' }} />
              </div>
              <span className="font-bold text-xl tracking-tight text-black">Hi, there!</span>
            </div>
          )}
          {/* 모바일 최적화된 작성 영역 */}
          <div className={`rounded-xl backdrop-blur-xl shadow-sm hover:shadow-md transition-all duration-300 ease-out p-3 md:p-3 overflow-x-hidden w-full max-w-full`} style={{ backgroundColor: withAlpha(contextBrandColor || '#0f172a', 0.06), border: `1px solid ${withAlpha(contextBrandColor || '#0f172a', 0.25)}` }}> 
            <div className={`flex items-start gap-3 md:gap-4 w-full max-w-full md:flex-row flex-col`}>
              <Avatar className="hidden md:block w-10 h-10 shrink-0 ring-2 ring-white shadow-lg">
                <AvatarImage src={getAvatarUrl(meAvatar)} alt="me" />
                <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold">?</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-3 order-1 w-full">
                <Textarea
                  ref={taRef}
                  value={inlineContent}
                  onChange={(e) => {
                    setInlineContent(e.target.value.slice(0, 400))
                  }}
                  // 단순 입력: 포커스/블러/오토사이즈 제거로 버벅임 최소화
                  onKeyDown={async (e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                      e.preventDefault()
                      if (!inlineContent.trim()) return
                      try {
                        const derivedTitle = inlineContent.trim().slice(0, 30)
                        await createPost({ community_id: communityId, page_id: pageId ?? null, title: derivedTitle, content: inlineContent.trim() })
                        setInlineTitle("")
                        setInlineContent("")
                        setExpanded(false)
                        
                        await queryClient.invalidateQueries({ queryKey: ['feed'] })
                        setRefreshTick(t => t + 1)
                        toast.success('게시글이 작성되었습니다.')
                      } catch (err: any) {
                        if (err?.message?.includes('로그인')) toast.error('로그인이 필요합니다.')
                        else toast.error('글 작성 중 오류가 발생했습니다.')
                      }
                    }
                  }}
                  placeholder="무엇을 공유하고 싶나요?"
                  maxLength={400}
                  className="w-full h-20 md:h-16 rounded-xl bg-white/90 px-4 py-3 text-base placeholder:text-slate-400 border-transparent ring-1 ring-slate-200/80 focus:ring-2 focus:ring-slate-400 focus:border-slate-300 shadow-sm resize-none break-all will-change-transform"
                  rows={3}
                />
                <div className="flex items-center justify-end gap-3 px-1">
                  <span className="text-[11px] text-slate-600">{inlineContent.length}/400</span>
                  <Button
                    size={"sm"}
                    className="rounded-md shadow-sm px-4 py-2 cursor-pointer"
                    style={contextBrandColor ? { backgroundColor: contextBrandColor, color: getReadableTextColor(contextBrandColor) } : undefined}
                    disabled={!inlineContent.trim()}
                    onClick={async () => {
                      try {
                         const derivedTitle = inlineContent.trim().slice(0, 30)
                         await createPost({ community_id: communityId, page_id: pageId ?? null, title: derivedTitle, content: inlineContent.trim() })
                        setInlineTitle("")
                        setInlineContent("")
                        setExpanded(false)
                        
                        await queryClient.invalidateQueries({ queryKey: ['feed'] })
                        setRefreshTick(t => t + 1)
                        toast.success('게시글이 작성되었습니다.')
                      } catch (err: any) {
                        if (err?.message?.includes('로그인')) toast.error('로그인이 필요합니다.')
                        else toast.error('글 작성 중 오류가 발생했습니다.')
                      }
                    }}
                  >
                    게시하기
                  </Button>
                </div>
              </div>

            </div>
          </div>
        </>
      )}
      {/* 좌측: 게시판 트리 (standalone 일 때만 표시) */}
      {variant === 'standalone' && (
      <aside className="md:col-span-1 space-y-4">
        <div className="bg-gradient-to-br from-white via-slate-50/30 to-white rounded-3xl border border-slate-200/50 shadow-sm p-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Hash className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-semibold text-slate-900">카테고리</h3>
            </div>
            <button
              onClick={() => setActiveFolder(FEED_ID)}
              className={`w-full text-left px-4 py-3 rounded-2xl text-sm flex items-center gap-3 transition-all duration-200 ${activeFolder === FEED_ID ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg' : 'text-slate-700 hover:bg-slate-100 hover:shadow-sm'} cursor-pointer`}
            >
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${activeFolder === FEED_ID ? 'bg-white/20' : 'bg-amber-100'}`}>
                <Rss className={`w-4 h-4 ${activeFolder === FEED_ID ? 'text-white' : 'text-amber-600'}`} />
              </div>
              <span className="font-medium">Feed</span>
            </button>
            {categories.length > 0 && <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent my-3" />}
            {categories.map((f, idx) => (
              <div key={f.id} className="flex items-center gap-2" draggable onDragStart={() => onDragStart(idx)} onDragOver={(e) => e.preventDefault()} onDrop={() => onDrop(idx)}>
                <button
                  onClick={() => setActiveFolder(f.id)}
                  className={`flex-1 text-left px-4 py-3 rounded-2xl text-sm flex items-center gap-3 transition-all duration-200 ${activeFolder === f.id ? 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-lg' : 'text-slate-700 hover:bg-slate-100 hover:shadow-sm'} cursor-pointer`}
                >
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${activeFolder === f.id ? 'bg-white/20' : 'bg-blue-100'}`}>
                    <Hash className={`w-4 h-4 ${activeFolder === f.id ? 'text-white' : 'text-blue-600'}`} />
                  </div>
                  <span className="font-medium">{f.name}</span>
                </button>
                <Button size="icon" variant="ghost" onClick={() => handleRemoveCategory(f.id)} aria-label="remove" className="h-8 w-8 rounded-xl hover:bg-red-50 hover:text-red-600 opacity-60 hover:opacity-100 transition-all duration-200">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
              <Input 
                placeholder="새 카테고리" 
                value={newCategory} 
                onChange={(e) => setNewCategory(e.target.value)} 
                className="cursor-text rounded-2xl border-slate-200 focus:ring-2 focus:ring-indigo-400 bg-white shadow-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddCategory()
                  }
                }}
              />
              <Button 
                size="sm" 
                onClick={handleAddCategory} 
                disabled={!newCategory.trim()}
                className="cursor-pointer rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-sm px-4"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="w-full rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200 py-3 font-semibold">
              <Plus className="w-4 h-4 mr-2" />
              글 작성하기
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-3xl border border-slate-200 max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-slate-900">새 글 작성</DialogTitle>
              <DialogDescription className="sr-only">게시글 제목과 내용을 입력하고 등록하세요.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* 제목 입력 제거: 이미지 스타일의 단일 본문 카드 */}
              <div className="flex items-center justify-end">
                <span className="text-xs text-slate-500">{title.length}/30</span>
              </div>
              <Textarea 
                placeholder="무엇을 공유하고 싶나요?" 
                value={content} 
                onChange={(e) => setContent(e.target.value.slice(0, 300))} 
                maxLength={300}
                className="rounded-2xl border-amber-200 focus:ring-2 focus:ring-amber-400 min-h-32 bg-amber-50"
                rows={6}
              />
              <div className="flex items-center justify-end">
                <span className="text-xs text-slate-500">{content.length}/300</span>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                {editingId ? (
                  <>
                    <Button 
                      size="sm" 
                      onClick={() => handleUpdate(editingId)}
                      className="rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 px-6"
                    >
                      수정 완료
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => { setEditingId(null); setTitle(""); setContent(""); setOpen(false) }}
                      className="rounded-2xl px-6"
                    >
                      취소
                    </Button>
                  </>
                ) : (
                  <Button 
                    size="sm" 
                    onClick={async () => {
                      // 카테고리 선택 시 category_id 지정
                       await createPost({ community_id: communityId, page_id: pageId ?? null, title, content, category_id: activeFolder === FEED_ID ? null : activeFolder })
                      setTitle("")
                      setContent("")
                      setOpen(false)
                      await queryClient.invalidateQueries({ queryKey: ['feed'] })
                      setRefreshTick(t => t + 1)
                    }}
                    disabled={!title.trim() || !content.trim()}
                    className="rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 px-6"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    등록
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </aside>
      )}

      {/* 메인: 글 목록 */}
      <div className={`${variant === 'standalone' ? 'md:col-span-3' : ''} space-y-3 overflow-x-hidden max-w-none`}>
        {loading ? (
          <div className="py-12 flex items-center justify-center">
            <div className="flex items-center gap-2 rounded-2xl bg-black/5 border border-black/10 px-3 py-2 shadow-sm">
              <Loader2 className="w-5 h-5 animate-spin text-slate-800" />
              <span className="text-sm font-medium text-slate-800">불러오는 중...</span>
            </div>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-16 rounded-3xl border border-dashed border-slate-300 bg-white/60">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg mb-4">
              <Rss className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">첫 번째 게시글을 작성해보세요!</h3>
            <p className="mt-1 text-sm text-slate-600">이 페이지의 첫 글을 등록해 커뮤니티와 공유해보세요.</p>
            {variant === 'standalone' && (
              <Button onClick={() => setOpen(true)} className="mt-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg">
                <Plus className="w-4 h-4 mr-2" /> 글 작성하기
              </Button>
            )}
          </div>
        ) : (
          pagedPosts.map((p) => (
            <div key={p.id} className="group w-full overflow-x-hidden" aria-expanded={false} data-slot="card">
              <div className={`rounded-2xl backdrop-blur-xl border shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_6px_rgba(0,0,0,0.04)] hover:shadow-[0_2px_6px_rgba(0,0,0,0.06),0_4px_14px_rgba(0,0,0,0.06)] transition-all duration-200 overflow-hidden w-full bg-white/80 border-black/60`}>
                <div className="flex items-center justify-between px-3 md:px-5 py-3 border-b border-slate-100/70">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex flex-col items-center w-14">
                      <Avatar className="w-10 h-10 ring-2 ring-white shadow-md">
                        <AvatarImage src={getAvatarUrl((p as any).author?.avatar_url, (p as any).author?.updated_at)} alt={(p as any).author?.full_name || 'user'} />
                        <AvatarFallback className="bg-gradient-to-br from-slate-400 to-slate-600 text-white font-semibold">{(((p as any).author?.full_name) || '?').slice(0,1)}</AvatarFallback>
                      </Avatar>
                      {/* 모바일 닉네임 텍스트 제거로 간결화 */}
                    </div>
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="text-sm text-slate-500 font-medium truncate">{(p as any).author?.full_name || (p as any).author?.username || 'Anonymous'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 md:shrink-0">
                    {p.pinned && (
                      <span className="inline-flex items-center rounded-md bg-amber-100 text-amber-800 border border-amber-200 px-1.5 py-0 text-[12px] font-semibold">필독</span>
                    )}
                    <span className="text-xs text-black bg-slate-100 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">{timeAgo(p.created_at)}</span>
                    {(p.user_id === currentUserId || isOwner) && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-all duration-200 hidden md:inline-flex cursor-pointer" onClick={(e)=>e.stopPropagation()} title="옵션">
                            <MoreVertical className="w-4 h-4 text-slate-600" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="rounded-xl border border-slate-200">
                          <DialogHeader>
                            <DialogTitle className="text-xl font-semibold">게시글 옵션</DialogTitle>
                            <DialogDescription className="sr-only">게시글을 수정하거나 삭제할 수 있습니다.</DialogDescription>
                          </DialogHeader>
                          <div className="flex gap-3 justify-end">
                            {isOwner && (
                              <Button variant="outline" className="rounded-2xl cursor-pointer" onClick={async (e) => {
                                e.stopPropagation()
                                const target = e.currentTarget as HTMLElement
                                try {
                                  const { getAuthToken } = await import('@/lib/supabase')
                                  const token = await getAuthToken().catch(() => null)
                                  const res = await fetch('/api/posts/pin', {
                                    method: 'PATCH',
                                    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
                                    body: JSON.stringify({ postId: p.id, pinned: !p.pinned })
                                  })
                                  if (res.ok) {
                                    const { pinned } = await res.json()
                                    setPosts(prev => prev.map(x => x.id === p.id ? { ...x, pinned } as any : x).sort((a: any, b: any) => (Number(b.pinned) - Number(a.pinned)) || (new Date(b.created_at).getTime() - new Date(a.created_at).getTime())))
                                  }
                                } catch {}
                                ;(target.closest('[data-slot=dialog-content]')?.querySelector('[data-slot=dialog-close]') as HTMLElement | null)?.click()
                              }}>
                                <Pin className="w-4 h-4 mr-2" />
                                {p.pinned ? '고정 해제' : '고정'}
                              </Button>
                            )}
                            <Button variant="outline" className="rounded-2xl" onClick={(e) => { e.stopPropagation(); setEditingId(p.id); setTitle(p.title); setContent(p.content); setEditOpen(true) }}>
                              <Edit3 className="w-4 h-4 mr-2" />
                              수정
                            </Button>
                            <Button variant="destructive" className="rounded-2xl" onClick={(e) => { e.stopPropagation(); handleDelete(p.id) }}>
                              <Trash2 className="w-4 h-4 mr-2" />
                              삭제
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
                  <div className="px-3 md:px-5 py-4 space-y-4" onClick={(e)=>e.stopPropagation()}>
                  <p className="text-slate-800 leading-relaxed whitespace-pre-wrap break-all sm:break-words text-[15px]">{p.content}</p>
                  <div className="flex gap-5 items-center pt-2 border-t border-slate-100">
                      <button className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-200 cursor-pointer bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600`} onClick={(e) => { e.stopPropagation(); handleLike(p.id) }}>
                        <Heart className={`w-4 h-4 ${ likedMap[p.id] ? 'text-rose-500 fill-rose-500' : ''}`} />
                        <span className={`text-sm font-medium`}>{likeCounts[p.id] ?? 0}</span>
                      </button>
                      <button className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-200 cursor-pointer bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600`} onClick={async (e) => { e.stopPropagation(); const next = !showComments[p.id]; setShowComments(prev => ({ ...prev, [p.id]: next })); if (next && !comments[p.id]) await loadComments(p.id) }}>
                        <MessageSquare className="w-4 h-4" />
                        <span className={`text-sm font-medium`}>{(commentCountsMap[p.id] ?? (comments[p.id]?.length ?? 0) ?? 0)}</span>
                      </button>
                  </div>
                </div>
              {showComments[p.id] && (
                <div className="bg-gradient-to-b from-slate-50/50 to-white px-3 md:px-5 py-4 space-y-4 border-t border-slate-100">
                  <div className="space-y-3">
                    {(comments[p.id] || []).map((c: any) => (
                      <div key={c.id} className="bg-white rounded-2xl p-3 md:p-4 shadow-sm border border-slate-100/50 hover:shadow-md transition-all duration-200">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1">
                            <Avatar className="w-8 h-8 ring-2 ring-white shadow-sm">
                              <AvatarImage src={getAvatarUrl(c.author?.avatar_url, c.author?.updated_at)} alt={c.author?.username || ''} />
                              <AvatarFallback className="bg-gradient-to-br from-slate-300 to-slate-500 text-white text-xs font-semibold">{(c.author?.full_name || c.author?.username || '?').slice(0,1)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-semibold text-slate-900">{c.author?.full_name || c.author?.username || 'Anonymous'}</span>
                                <span className="text-xs text-slate-400">{new Date(c.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{c.content}</p>
                            </div>
                          </div>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-7 w-7 rounded-xl hover:bg-slate-100 opacity-70 hover:opacity-100 transition-all duration-200 cursor-pointer" onClick={(e)=>{ e.stopPropagation() }} title="댓글 옵션">
                                <MoreVertical className="w-3.5 h-3.5 text-slate-500" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="rounded-3xl border border-slate-200">
                              <DialogHeader>
                                <DialogTitle className="text-xl font-semibold">댓글 옵션</DialogTitle>
                                <DialogDescription className="sr-only">댓글을 수정하거나 삭제할 수 있습니다.</DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4" onClick={(e)=>e.stopPropagation()}>
                                <Textarea
                                  value={commentEditInputs[c.id] ?? c.content}
                                  onChange={(e) => setCommentEditInputs(prev => ({ ...prev, [c.id]: e.target.value }))}
                                  className="rounded-2xl border-slate-200 focus:ring-2 focus:ring-indigo-400"
                                  rows={3}
                                />
                                <div className="flex justify-end gap-3">
                                  <Button size="sm" variant="outline" className="rounded-2xl" onClick={async (e) => { e.stopPropagation(); const btn = e.currentTarget as HTMLElement; const { updateComment } = await import('@/lib/communities'); const text = (commentEditInputs[c.id] ?? c.content) || ''; if (!text.trim()) return; const prev = comments[p.id] || []; setComments(prevMap => ({ ...prevMap, [p.id]: prev.map(x => x.id === c.id ? { ...x, content: text } : x) })); await updateComment(c.id, { content: text }); await loadComments(p.id); (btn.closest('[data-slot=dialog-content]')?.querySelector('[data-slot=dialog-close]') as HTMLElement | null)?.click(); toast.success('댓글이 수정되었습니다.') }}>
                                    <Edit3 className="w-4 h-4 mr-2" />
                                    수정
                                  </Button>
                                  <Button size="sm" variant="destructive" className="rounded-2xl" onClick={async (e) => { e.stopPropagation(); const { deleteComment } = await import('@/lib/communities'); const prev = comments[p.id] || []; setComments(prevMap => ({ ...prevMap, [p.id]: prev.filter(x => x.id !== c.id) })); setCommentCountsMap(m => ({ ...m, [p.id]: Math.max(0, (m[p.id] ?? prev.length) - 1) })); await deleteComment(c.id); await loadComments(p.id); toast.success('댓글이 삭제되었습니다.') }}>
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    삭제
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-3 items-end">
                    <Avatar className="w-8 h-8 ring-2 ring-white shadow-sm">
                      <AvatarImage src={getAvatarUrl(meAvatar)} alt="me" />
                      <AvatarFallback className="bg-gradient-to-br from-indigo-400 to-purple-600 text-white text-xs font-semibold">?</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 flex gap-2">
                      <Input 
                        placeholder="댓글을 입력하세요..." 
                        value={commentInputs[p.id] || ''} 
                        onChange={(e) => setCommentInputs(prev => ({ ...prev, [p.id]: e.target.value }))} 
                        className="rounded-2xl border-slate-200 focus:ring-2 focus:ring-indigo-400 bg-white shadow-sm"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            addComment(p.id)
                          }
                        }}
                      />
                      <Button 
                        size="sm" 
                        onClick={() => addComment(p.id)} 
                        disabled={!(commentInputs[p.id] || '').trim()}
                        className="rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-sm px-4"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              </div>
            </div>
          ))
        )}
        {posts.length > 0 && (
          <div className="flex items-center justify-center gap-4 pt-6">
            <Button 
              size="sm" 
              variant="outline" 
              disabled={page===1} 
              onClick={() => setPage(p => Math.max(1, p-1))}
              className="rounded-2xl px-6 py-2 border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
            >
              이전
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full">{page}</span>
              <span className="text-slate-400">/</span>
              <span className="text-sm text-slate-500">{totalPages}</span>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              disabled={page===totalPages} 
              onClick={() => setPage(p => Math.min(totalPages, p+1))}
              className="rounded-2xl px-6 py-2 border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
            >
              다음
            </Button>
          </div>
        )}
        {/* 전역 수정 모달: 어느 변형에서도 동작 */}
        <Dialog open={editOpen} onOpenChange={(o)=>{ if (!o) { setEditOpen(false); setEditingId(null); } }}>
          <DialogContent className="rounded-3xl border border-slate-200 max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-slate-900">게시글 수정</DialogTitle>
              <DialogDescription className="sr-only">게시글 제목과 내용을 수정 후 저장하세요.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input 
                placeholder="제목을 입력하세요" 
                value={title} 
                onChange={(e) => setTitle(e.target.value.slice(0, 30))} 
                maxLength={30}
                className="rounded-2xl border-slate-200 focus:ring-2 focus:ring-indigo-400 h-12 text-lg font-medium"
              />
              <Textarea 
                placeholder="내용을 입력하세요" 
                value={content} 
                onChange={(e) => setContent(e.target.value.slice(0, 300))} 
                maxLength={300}
                className="rounded-2xl border-slate-200 focus:ring-2 focus:ring-indigo-400 min-h-32"
                rows={6}
              />
              <div className="flex items-center justify-end">
                <span className="text-xs text-slate-500">{content.length}/300</span>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <Button 
                  size="sm" 
                  onClick={() => { if (!editingId) return; handleUpdate(editingId) }}
                  disabled={!title.trim() || !content.trim()}
                  className="rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 px-6"
                >
                  수정 완료
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => { setEditingId(null); setTitle(""); setContent(""); setEditOpen(false) }}
                  className="rounded-2xl px-6"
                >
                  취소
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </section>
    </>
  )
}



