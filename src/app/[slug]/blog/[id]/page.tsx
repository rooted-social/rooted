"use client"

import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { getCommunity } from "@/lib/communities"
import { getBlogPostById, incrementBlogViews, toggleBlogLike, hasLikedBlog, getBlogCounts, addBlogComment, listBlogComments, updateBlogComment, deleteBlogComment } from "@/lib/blog"
import { Input } from "@/components/ui/input"
import { Button as UIButton } from "@/components/ui/button"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getAvatarUrl } from "@/lib/profiles"
import { CalendarDays, Heart, MessageCircle, Eye, ArrowLeft } from "lucide-react"

export default function BlogDetailPage() {
  const params = useParams<{ slug: string; id: string }>()
  const search = useSearchParams()
  const { slug, id } = params
  const pageId = search?.get('pageId') || ''
  const [post, setPost] = useState<any>(null)
  const [counts, setCounts] = useState<{ views: number; likes: number; comments: number }>({ views: 0, likes: 0, comments: 0 })
  const [liked, setLiked] = useState(false)
  const [commentText, setCommentText] = useState("")
  const [comments, setComments] = useState<any[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState<string>("")
  const [myAvatar, setMyAvatar] = useState<string | null>(null)
  useEffect(() => {
    let mounted = true
    ;(async () => {
      const p = await getBlogPostById(String(id))
      if (!mounted) return
      setPost(p)
      await incrementBlogViews(String(id))
      const [likedInit, cnt, cmts, me] = await Promise.all([
        hasLikedBlog(String(id)),
        getBlogCounts(String(id)),
        listBlogComments(String(id)),
        (async () => {
          try {
            const { getUserId, supabase } = await import('@/lib/supabase')
            const uid = await getUserId()
            if (!uid) return null
            const { data } = await supabase.from('profiles').select('avatar_url').eq('id', uid).maybeSingle()
            return (data as any)?.avatar_url || null
          } catch { return null }
        })()
      ])
      setLiked(likedInit)
      setCounts(cnt)
      setComments(cmts as any[])
      setMyAvatar(me)
    })()
    return () => { mounted = false }
  }, [slug, id])

  if (!post) return <div className="min-h-[40vh]" />

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 헤더 - PC만 표시 */}
      <div className="hidden md:block max-w-4xl mx-auto px-4 py-4">
        <Button 
          asChild 
          variant="ghost" 
          className="cursor-pointer hover:bg-slate-100 rounded-xl transition-colors duration-200"
        >
          <Link href={`/${slug}/dashboard?tab=home${pageId ? `&pageId=${pageId}` : ''}`} className="inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            커뮤니티로 돌아가기
          </Link>
        </Button>
      </div>

      {/* 모바일 헤더 */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-30">
        <div className="flex items-center h-full px-4">
          <Button 
            asChild 
            variant="ghost" 
            size="sm"
            className="cursor-pointer hover:bg-slate-50 rounded-lg transition-colors"
          >
            <Link href={`/${slug}/dashboard?tab=home${pageId ? `&pageId=${pageId}` : ''}`} className="inline-flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">뒤로</span>
            </Link>
          </Button>
          <div className="flex-1 text-center">
            <span className="text-sm font-semibold text-slate-900">블로그</span>
          </div>
          <div className="w-16" /> {/* 우측 공간 확보 */}
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-4xl mx-auto px-4 py-10 pt-5 md:pt-12">
        {/* 커버/타이틀 섹션 */}
        <div className="bg-slate-50 p-0 md:p-0 relative">
          {/* 통계 (우측 상단) */}
          <div className="absolute -top-10 right-0 md:top-0 md:right-0 md:translate-y-0 flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-50 border border-slate-100">
              <Eye className="w-3 h-3 text-slate-600" />
              <span className="text-xs font-medium text-slate-700">{counts.views}</span>
            </div>
            <button 
              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full border transition-all duration-200 ${
                liked 
                  ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100' 
                  : 'bg-slate-50 border-slate-100 text-slate-700 hover:bg-slate-100'
              }`}
              onClick={async ()=>{ 
                try { 
                  const t = await toggleBlogLike(String(id)); 
                  setLiked(t.liked); 
                  const c = await getBlogCounts(String(id)); 
                  setCounts(c) 
                } catch (e) { 
                  console.error(e) 
                } 
              }}
            >
              <Heart className={`w-3 h-3 ${liked ? 'fill-current' : ''}`} />
              <span className="text-xs font-medium">{counts.likes}</span>
            </button>
          </div>

          {/* 작성자 정보 */}
          <div className="flex items-center gap-4 mb-6 pr-24">
            <Avatar className="w-12 h-12 ring-2 ring-slate-100 shadow-sm">
              <AvatarImage 
                src={post.author?.avatar_url ? getAvatarUrl(post.author.avatar_url, post.author.updated_at) : undefined} 
                alt={post.author?.username || post.author?.full_name || 'Author'} 
              />
              <AvatarFallback className="bg-gradient-to-br from-slate-200 to-slate-300 text-slate-700 font-semibold">
                {post.author?.full_name ? 
                  post.author.full_name.slice(0,1).toUpperCase() : 
                  post.author?.username ? 
                    post.author.username.slice(0,1).toUpperCase() : 
                    '?'
                }
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-semibold text-slate-900">
                {post.author?.full_name || post.author?.username || 'Anonymous'}
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <CalendarDays className="w-4 h-4" />
                {new Date(post.created_at).toLocaleDateString('ko-KR', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
            </div>
          </div>

          {/* 제목 */}
          <h1 className="text-[28px] md:text-[40px] font-extrabold tracking-[-0.02em] text-slate-900 leading-tight">
            {post.title}
          </h1>
        </div>

        {/* 구분선 */}
        <div className="my-8 border-t border-black/80" />

        {/* 본문 */}
        <div className="bg-slate-50 p-0 mb-8">
          <article className="prose prose-slate max-w-none prose-headings:text-slate-900 prose-p:text-slate-800 prose-li:text-slate-800">
            <div
              className="prose-img:rounded-2xl prose-img:shadow-md"
              style={{ wordBreak: 'break-word' }}
              dangerouslySetInnerHTML={{ __html: (post.content || '').replace(/<img /g, '<img style=\"max-width:100%;height:auto;\" ') }}
            />
          </article>
        </div>

        {/* 구분선 */}
        <div className="my-8 border-t border-black/80" />

        {/* 댓글 섹션 */}
        <div className="bg-slate-50 p-0">
          <h2 className="text-[18px] font-semibold text-slate-900 mb-6 flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            댓글 {comments.length}개
          </h2>
          
          {/* 댓글 입력 */}
          <div className="flex items-start gap-4 mb-8 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <Avatar className="w-10 h-10 shrink-0">
              <AvatarImage src={myAvatar || undefined} alt="My avatar" />
              <AvatarFallback className="bg-slate-200 text-slate-600">
                {myAvatar ? '나' : '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 flex gap-3">
              <Input 
                placeholder="댓글을 입력하세요..." 
                value={commentText} 
                onChange={(e)=>setCommentText(e.target.value)}
                className="flex-1 rounded-lg border-slate-300 focus:border-slate-900 focus:ring-slate-900" 
              />
              <UIButton 
                className="cursor-pointer px-6 rounded-lg bg-slate-900 hover:bg-black transition-colors duration-200 text-white" 
                onClick={async ()=>{
                  try {
                    if(!commentText.trim()) return
                    await addBlogComment(String(id), commentText.trim())
                    setCommentText("")
                    const [cnt, cmts] = await Promise.all([getBlogCounts(String(id)), listBlogComments(String(id))])
                    setCounts(cnt)
                    setComments(cmts as any[])
                  } catch (e) {
                    console.error(e)
                  }
                }}
              >
                등록
              </UIButton>
            </div>
          </div>
          
          {/* 댓글 목록 */}
          <div className="space-y-4">
            {comments.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">첫 댓글을 남겨보세요.</p>
              </div>
            ) : comments.map((c) => (
              <div key={c.id} className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-start gap-4">
                  <Avatar className="w-10 h-10 shrink-0 ring-2 ring-white shadow-sm">
                    <AvatarImage src={c.author?.avatar_url || undefined} alt={c.author?.username||'user'} />
                    <AvatarFallback className="bg-slate-200 text-slate-600">
                      {c.author?.username?.slice(0,1).toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-slate-900">
                        {c.author?.full_name || c.author?.username || 'Anonymous'}
                      </span>
                      <span className="text-sm text-slate-500">
                        {new Date(c.created_at).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                    
                    {editingId === c.id ? (
                      <div className="space-y-3">
                        <Input 
                          value={editingText} 
                          onChange={(e)=>setEditingText(e.target.value)}
                          className="rounded-lg border-slate-300 focus:border-slate-900 focus:ring-slate-900"
                        />
                        <div className="flex items-center gap-2">
                          <UIButton 
                            size="sm" 
                            className="cursor-pointer rounded-lg bg-slate-900 hover:bg-black text-white" 
                            onClick={async ()=>{ 
                              try { 
                                if(!editingText.trim()) return; 
                                const resId = await updateBlogComment(c.id, editingText.trim()); 
                                if(!resId) throw new Error('update failed'); 
                                const cmts = await listBlogComments(String(id)); 
                                setComments(cmts as any[]); 
                                setEditingId(null); 
                                setEditingText("") 
                              } catch (e) { 
                                console.error(e) 
                              } 
                            }}
                          >
                            저장
                          </UIButton>
                          <UIButton 
                            size="sm" 
                            variant="outline" 
                            className="cursor-pointer rounded-lg border-slate-300 hover:bg-slate-100" 
                            onClick={()=>{ setEditingId(null); setEditingText("") }}
                          >
                            취소
                          </UIButton>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-slate-800 whitespace-pre-wrap break-words mb-3 leading-relaxed">
                          {c.content}
                        </p>
                        <div className="flex items-center gap-3">
                          <button 
                            className="text-sm text-slate-500 hover:text-slate-900 transition-colors duration-200 cursor-pointer" 
                            onClick={()=>{ setEditingId(c.id); setEditingText(c.content) }}
                          >
                            수정
                          </button>
                          <button 
                            className="text-sm text-slate-500 hover:text-red-600 transition-colors duration-200 cursor-pointer" 
                            onClick={async ()=>{ 
                              try { 
                                if(!confirm('댓글을 삭제할까요?')) return; 
                                const ok = await deleteBlogComment(c.id); 
                                if(!ok) throw new Error('delete failed'); 
                                const [cnt, cmts] = await Promise.all([getBlogCounts(String(id)), listBlogComments(String(id))]); 
                                setCounts(cnt); 
                                setComments(cmts as any[]) 
                              } catch (e) { 
                                console.error(e) 
                              } 
                            }}
                          >
                            삭제
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                {/* 각 댓글 하단 구분선 */}
                <div className="mt-6 mb-2 border-b border-black/80" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}


