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
import { supabase, getUserId } from "@/lib/supabase"
import { getCommunitySlugById, getCommunitySettings } from "@/lib/communities"
import { getReadableTextColor } from "@/utils/color"
import AnimatedBackground from "@/components/AnimatedBackground"
import { Pencil, Trash2 } from "lucide-react"
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

function formatDate(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return iso
  }
}

// 읽기 시간 뱃지 제거

export default function BlogPage({ title, bannerUrl, description, pageId, communityId }: BlogPageProps) {
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
      setLoading(true)
      try {
        const [list, s, uid, comm, settings] = await Promise.all([
          fetchBlogList(pageId),
          getCommunitySlugById(communityId),
          getUserId(),
          supabase.from('communities').select('owner_id').eq('id', communityId).single(),
          getCommunitySettings(communityId).catch(() => null),
        ])
        if (!mounted) return
        console.log('Blog posts loaded:', list) // 디버깅용
        setItems(list as any)
        setSlug(s || "")
        const ownerId = (comm.data as any)?.owner_id || null
        setCurrentUserId(uid || null)
        setIsOwner(!!uid && !!ownerId && uid === ownerId)
        setBrandColor((settings as any)?.brand_color || null)
      } catch (error) {
        console.error('Failed to load blog data:', error)
        if (mounted) {
          setItems([])
          setSlug("")
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    })()
    return () => { mounted = false }
  }, [pageId, communityId])

  // 아이템 변화 시 현재 페이지가 범위를 넘지 않도록 보정
  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(items.length / perPage))
    if (page > totalPages) setPage(totalPages)
  }, [items])

  return (
    <>
      <AnimatedBackground zIndexClass="-z-10" />
      <div className="space-y-3 relative z-10">
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
          <div className="mt-3 px-4 md:px-0 md:pr-[5%] flex justify-end">
            <Button asChild size="sm" className="h-auto whitespace-nowrap cursor-pointer rounded-xl md:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border-0 font-semibold px-3 py-2 text-sm md:px-6 md:py-3 md:text-base"
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

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-[repeat(auto-fit,minmax(250px,330px))] justify-center md:justify-start justify-items-center md:justify-items-stretch gap-5 w-full max-w-[1400px] md:max-w-none mx-auto md:mx-0 px-[2%] md:px-0">
          {Array.from({ length: perPage }).map((_, i) => (
            <div key={i} className="h-80 rounded-2xl bg-white animate-pulse shadow-sm border border-slate-200 overflow-hidden">
              {/* 썸네일 스켈레톤 */}
              <div className="w-full aspect-[16/9] bg-slate-100" />
              {/* 콘텐츠 스켈레톤 */}
              <div className="p-5 space-y-4">
                {/* 작성자 스켈레톤 */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-200 rounded-full" />
                  <div className="h-4 bg-slate-200 rounded w-20" />
                </div>
                {/* 제목 스켈레톤 */}
                <div className="h-6 bg-slate-200 rounded w-3/4" />
                {/* 통계 스켈레톤 */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-3">
                    <div className="h-7 w-12 bg-slate-200 rounded-full" />
                    <div className="h-7 w-12 bg-slate-200 rounded-full" />
                    <div className="h-7 w-12 bg-slate-200 rounded-full" />
                  </div>
                  <div className="h-7 w-20 bg-slate-200 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-16 rounded-3xl border border-dashed border-slate-300 bg-white/60">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg mb-4">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-900">첫 번째 게시글을 작성해보세요!</h3>
          <p className="mt-1 text-sm text-slate-600">블로그의 첫 글을 등록해 커뮤니티와 소식을 공유해보세요.</p>
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
        <div className="grid grid-cols-1 md:grid-cols-[repeat(auto-fit,minmax(250px,330px))] justify-center md:justify-start justify-items-center md:justify-items-stretch gap-5 w-full max-w-[1400px] md:max-w-none mx-auto md:mx-0 px-[3%] md:px-0">
          {items.slice((page-1)*perPage, page*perPage).map((post: any) => (
            <Link key={post.id} href={`/${slug}/blog/${post.id}?pageId=${pageId}`} className="group block w-full" prefetch={false}>
              <article className="w-full h-[400px] md:h-auto min-w-0 overflow-hidden rounded-2xl bg-white shadow-sm hover:shadow-lg transition-all duration-300 group-hover:scale-[1.01] border border-slate-200 relative">
                {/* 썸네일 영역 */}
                <div className="relative w-full h-[220px] md:h-auto md:aspect-[16/9] overflow-hidden bg-slate-50">
                  {post.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={post.thumbnail_url} 
                      alt={post.title} 
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <span className="text-xs">썸네일 없음</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 콘텐츠 영역 */}
                <div className="p-5 md:p-5 px-6 py-6 space-y-4 min-h-[180px] md:min-h-[140px]">
                  {/* 작성자 프로필 + 날짜 (고정 높이) */}
                  <div className="flex items-center justify-between h-8">
                    <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                      <Avatar className="w-8 h-8">
                      <AvatarImage 
                        src={post.author?.avatar_url ? getAvatarUrl(post.author.avatar_url, post.author.updated_at) : undefined} 
                        alt={post.author?.username || post.author?.full_name || 'User'} 
                      />
                      <AvatarFallback className="bg-slate-200 text-slate-600 text-sm font-medium">
                        {post.author?.full_name ? 
                          post.author.full_name.slice(0,1).toUpperCase() : 
                          post.author?.username ? 
                            post.author.username.slice(0,1).toUpperCase() : 
                            '?'
                        }
                      </AvatarFallback>
                      </Avatar>
                      <div className="text-sm font-medium text-slate-700 truncate max-w-[52%]">
                        {post.author?.full_name || post.author?.username || 'Anonymous'}
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-500 truncate max-w-[40%] text-right ml-2">{formatDate(post.created_at)}</span>
                  </div>
                  
                  {/* 제목 */}
                  <h3 className="text-[17px] md:text-lg font-semibold text-slate-900 leading-snug line-clamp-2 group-hover:text-slate-700 transition-colors duration-200 min-h-[46px]">
                    {post.title}
                  </h3>
                  
                  {/* 통계 */}
                  <StatsRow counts={post.counts} createdAt={post.created_at} />
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

function StatsRow({ counts, createdAt }: { counts: { views: number; likes: number; comments: number }; createdAt: string }) {
  return (
    <div className="relative flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors duration-200">
          <svg className="w-3.5 h-3.5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          <span className="text-xs font-medium text-slate-700">{counts.views}</span>
        </div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-red-50 border border-red-100 hover:bg-red-100 transition-colors duration-200">
          <svg className="w-3.5 h-3.5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          <span className="text-xs font-medium text-red-700">{counts.likes}</span>
        </div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-blue-50 border border-blue-100 hover:bg-blue-100 transition-colors duration-200">
          <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/>
          </svg>
          <span className="text-xs font-medium text-blue-700">{counts.comments}</span>
        </div>
      </div>
    </div>
  )
}


