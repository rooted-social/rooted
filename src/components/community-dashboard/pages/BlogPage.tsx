"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import SectionTitle from "@/components/SectionTitle"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getAvatarUrl } from "@/lib/profiles"
import { deleteBlogPost } from "@/lib/blog"
import { useAuthData } from "@/components/auth/AuthProvider"
import { getReadableTextColor } from "@/utils/color"
import AnimatedBackground from "@/components/AnimatedBackground"
import { Pencil, Trash2, Loader2 } from "lucide-react"
import { type BlogListItem as LibBlogListItem } from "@/lib/blog"
import { fetchBlogList } from '@/lib/dashboard'

interface BlogPageProps {
  title: string
  bannerUrl: string | null
  description: string | null
  pageId: string
  communityId: string
}

type BlogListItem = LibBlogListItem

function formatDateKST(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return iso
  }
}

function timeAgoKST(iso: string) {
  try {
    const now = new Date()
    const then = new Date(iso)
    // 밀리초 보정은 불필요, 단순 차이 계산
    const diffMs = now.getTime() - then.getTime()
    const minutes = Math.floor(diffMs / (1000 * 60))
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (minutes < 60) return `${Math.max(0, minutes)}분 전`
    if (hours < 24) return `${hours}시간 전`
    if (days < 7) return `${days}일 전`
    return formatDateKST(iso)
  } catch {
    return iso
  }
}

// 모바일용: 더 간결한 상대 시간 표기 (분/시간/일/달)
function timeAgoCompact(iso: string) {
  try {
    const now = new Date()
    const then = new Date(iso)
    const diffMs = now.getTime() - then.getTime()
    const minutes = Math.floor(diffMs / (1000 * 60))
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const months = Math.floor(days / 30)
    if (minutes < 60) return `${Math.max(0, minutes)}분 전`
    if (hours < 24) return `${hours}시간 전`
    if (days < 30) return `${days}일 전`
    return `${Math.max(1, months)}달 전`
  } catch {
    return ''
  }
}

function toPlainText(input: string): string {
  try {
    const el = document.createElement('div')
    el.innerHTML = input || ''
    const text = (el.textContent || el.innerText || '').replace(/\s+/g, ' ').trim()
    return text
  } catch {
    return (input || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  }
}

// 읽기 시간 뱃지 제거

export default function BlogPage({ title, bannerUrl, description, pageId, communityId }: BlogPageProps) {
  const decodeEntities = (str: string) => {
    if (!str) return ''
    const map: Record<string, string> = {
      '&nbsp;': ' ',
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
    }
    let out = str.replace(/&(nbsp|amp|lt|gt|quot|#39);/gi, (m) => map[m.toLowerCase()] || ' ')
    // numeric entities
    out = out.replace(/&#(x?[0-9a-fA-F]+);/g, (_, code) => {
      try { return String.fromCharCode(code.startsWith('x') || code.startsWith('X') ? parseInt(code.slice(1), 16) : parseInt(code, 10)) } catch { return ' ' }
    })
    return out.replace(/\s+/g, ' ').trim()
  }
  const { user } = useAuthData()
  const [items, setItems] = useState<BlogListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [slug, setSlug] = useState<string>("")
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isOwner, setIsOwner] = useState<boolean>(false)
  const [brandColor, setBrandColor] = useState<string | null>(null)
  const [page, setPage] = useState<number>(1)
  const perPage = 8

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(items.length === 0)
      try {
        const [overview] = await Promise.all([
          fetchBlogList(pageId),
        ])
        if (!mounted) return
        const list = (overview?.posts || []) as any[]
        console.log('Blog posts loaded:', list)
        setItems(list)
        setSlug(overview?.slug || "")
        const uid = user?.id || null
        const ownerId = overview?.isOwner ? uid : null
        setCurrentUserId(uid)
        setIsOwner(!!overview?.isOwner)
        setBrandColor(overview?.brandColor || null)
      } catch (error) {
        console.error('Failed to load blog data:', error)
        if (mounted) {
          setItems([])
          setSlug("")
        }
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [pageId, communityId, user?.id])

  // 아이템 변화 시 현재 페이지가 범위를 넘지 않도록 보정
  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(items.length / perPage))
    if (page > totalPages) setPage(totalPages)
  }, [items])

  return (
    <>
      <AnimatedBackground zIndexClass="-z-10" />
      <div className="space-y-3 relative z-10 max-w-none md:max-w-3xl mx-auto w-full px-2 md:px-0">
      {bannerUrl && (
        <div className="relative w-full h-40 overflow-hidden rounded-xl border">
          <Image src={bannerUrl} alt={title} fill className="object-cover" />
        </div>
      )}
      <div className="text-center mt-2">
        <h1 className="text-[28px] md:text-[36px] font-extrabold tracking-[-0.02em] text-slate-900 leading-tight">
          {title}
        </h1>
        {description && (
          <p className="mt-2 text-sm md:text-base text-slate-600 max-w-2xl mx-auto">{description}</p>
        )}
        {slug && (
          <div className="mt-3 px-0 flex justify-end">
            <Button asChild size="sm" className="h-auto whitespace-nowrap cursor-pointer rounded-lg shadow-md hover:shadow-lg transition-all duration-200 border-0 font-semibold px-3 py-2 text-sm"
              style={brandColor ? { backgroundColor: brandColor, color: getReadableTextColor(brandColor) } : undefined}
            >
              <Link href={`/${slug}/blog/new?pageId=${pageId}`} className="inline-flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                새 글 작성하기
              </Link>
            </Button>
          </div>
        )}
      </div>

      {loading && items.length === 0 ? (
        <div className="py-10 flex items-center justify-center">
          <div className="flex items-center gap-2 rounded-2xl bg-black/5 border border-black/10 px-3 py-2 shadow-sm">
            <Loader2 className="w-5 h-5 animate-spin text-slate-800" />
            <span className="text-sm font-medium text-slate-800">불러오는 중...</span>
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-16 rounded-3xl border border-dashed border-slate-300 bg-white/60">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg mb-4">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-900">첫 번째 게시글을 작성해보세요!</h3>
          <p className="mt-1 text-sm text-slate-600">첫 글을 등록해 커뮤니티와 소식을 공유해보세요.</p>
          {slug && (
            <Button asChild className="mt-4 h-auto rounded-xl md:rounded-2xl shadow-lg px-3 py-2 text-sm md:px-6 md:py-3 md:text-base"
              size="sm"
              style={brandColor ? { backgroundColor: brandColor, color: getReadableTextColor(brandColor) } : undefined}
            >
              <Link href={`/${slug}/blog/new?pageId=${pageId}`} className="inline-flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                새 글 작성하기
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <>
        <div className="space-y-3">
          {items.slice((page-1)*perPage, page*perPage).map((post: any) => (
            <Link key={post.id} href={`/${slug}/blog/${post.id}?pageId=${pageId}`} className="group block w-full" prefetch>
              <article className="w-full min-w-0 overflow-hidden rounded-2xl bg-white shadow-xs hover:shadow-lg transition-all duration-200 border border-slate-200 relative p-4">
                <div className="grid grid-cols-[1fr_auto] items-start gap-3 md:gap-4">
                  {/* 텍스트 영역 */}
                  <div className={`flex-1 min-w-0 ${post.thumbnail_url ? '' : ''}`}>
                    <h3 className="text-base md:text-lg font-semibold text-slate-900 leading-snug line-clamp-2 group-hover:text-slate-700 transition-colors duration-200">
                      {post.title}
                    </h3>
                    <p className="mt-2 text-sm text-slate-700 line-clamp-2 whitespace-pre-line break-words">
                      {decodeEntities(post.excerpt ? post.excerpt : toPlainText(post.content))}
                    </p>
                    <div className="mt-3 order-2 md:order-none">
                      <StatsRow counts={post.counts} createdAt={post.created_at} author={post.author} />
                    </div>
                  </div>

                  {/* 썸네일 영역: 정사각형, 우측 정렬 */}
                  {post.thumbnail_url && (
                    <div className="relative w-20 h-20 md:w-28 md:h-28 rounded-xl overflow-hidden bg-slate-50 flex-shrink-0 justify-self-end">
                      <Image
                        src={post.thumbnail_url}
                        alt={post.title}
                        fill
                        sizes="(max-width: 768px) 80px, 112px"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                  )}
                </div>

                {/* 액션 버튼: 작성자 또는 오너만 */}
                {(post.user_id === currentUserId || isOwner) && (
                  <div className="absolute right-3 top-3 z-30 opacity-0 group-hover:opacity-100 transition-all duration-200 flex gap-1">
                    <button 
                      className="w-8 h-8 rounded-lg bg-white/90 backdrop-blur-sm border border-slate-200 shadow-sm hover:shadow-md cursor-pointer grid place-items-center transition-all duration-200" 
                      title="수정" 
                      onClick={(e)=>{ e.preventDefault(); location.href = `/${slug}/blog/edit/${post.id}?pageId=${pageId}` }}
                    >
                      <Pencil className="w-3.5 h-3.5 text-slate-600" />
                    </button>
                    <button 
                      className="w-8 h-8 rounded-lg bg-white/90 backdrop-blur-sm border border-slate-200 shadow-sm hover:shadow-md cursor-pointer grid place-items-center text-red-600 transition-all duration-200" 
                      title="삭제" 
                      onClick={(e)=>{ e.preventDefault(); setConfirmId(post.id) }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </article>
            </Link>
          ))}
        </div>
        {items.length > perPage && (
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
              <span className="text-sm text-slate-500">{Math.max(1, Math.ceil(items.length / perPage))}</span>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              disabled={page >= Math.ceil(items.length / perPage)} 
              onClick={() => setPage(p => Math.min(Math.max(1, Math.ceil(items.length / perPage)), p+1))}
              className="rounded-2xl px-6 py-2 border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
            >
              다음
            </Button>
          </div>
        )}
        </>
      )}
      <Dialog open={!!confirmId} onOpenChange={(o)=>{ if(!o) setConfirmId(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>이 글을 삭제할까요?</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-slate-600">삭제하면 되돌릴 수 없습니다.</div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" className="cursor-pointer" onClick={()=>setConfirmId(null)}>취소</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white cursor-pointer" onClick={async ()=>{ if(!confirmId) return; await deleteBlogPost(confirmId); setItems(prev=>prev.filter(p=>p.id!==confirmId)); setConfirmId(null) }}>삭제</Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </>
  )
}

function StatsRow({ counts, createdAt, author }: { counts: { views: number; likes: number; comments: number }; createdAt: string; author?: { full_name?: string | null; username?: string | null } | null }) {
  return (
    <div className="relative flex items-center gap-2 md:gap-3 md:justify-between flex-wrap">
      <div className="flex items-center gap-2 md:gap-3 text-slate-500">
        <div className="inline-flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          <span className="text-[12px] font-medium">{counts.views}</span>
        </div>
        <div className="inline-flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          <span className="text-[12px] font-medium">{counts.likes}</span>
        </div>
        <div className="inline-flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/>
          </svg>
          <span className="text-[12px] font-medium">{counts.comments}</span>
        </div>
      </div>
      <div className="text-[11px] text-slate-500 md:ml-3">
        <span className="md:hidden">{timeAgoCompact(createdAt)}</span>
        <span className="hidden md:inline">{formatDateKST(createdAt)}</span>
        {' '}· by {author?.full_name || author?.username || 'Anonymous'}
      </div>
    </div>
  )
}


