"use client"

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { getYouTubeEmbedUrl } from '@/lib/media'
import { getClassById, incrementClassViews, toggleClassCompletion, getClassCompletionStats } from '@/lib/classes'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getAvatarUrl } from '@/lib/profiles'
import { Calendar, Eye, Users, ArrowLeft, CheckCircle2, Circle } from 'lucide-react'

export default function ClassDetailPage() {
  const { id, slug } = useParams<{ id: string; slug: string }>()
  const router = useRouter()
  const [item, setItem] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<{ total: number; completed: number }>({ total: 0, completed: 0 })

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [classData, statsData] = await Promise.all([
          getClassById(String(id)),
          getClassCompletionStats(String(id))
        ])
        
        if (!alive) return
        
        if (classData) {
          setItem(classData)
          await incrementClassViews(String(id))
        }
        setStats(statsData)
      } catch (error) {
        console.error('Failed to load class:', error)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [id])

  const handleCompletionToggle = async (completed: boolean) => {
    try {
      await toggleClassCompletion(String(id), completed)
      setItem((prev: any) => ({ ...prev, completed }))
      
      // 통계 새로고침
      const newStats = await getClassCompletionStats(String(id))
      setStats(newStats)
    } catch (error) {
      console.error('Failed to toggle completion:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-12 bg-slate-200 rounded-xl w-48" />
            <div className="bg-white rounded-3xl p-8 space-y-6">
              <div className="h-8 bg-slate-200 rounded-xl w-3/4" />
              <div className="h-4 bg-slate-200 rounded-xl w-1/2" />
            </div>
            <div className="aspect-video bg-slate-200 rounded-3xl" />
          </div>
        </div>
      </div>
    )
  }
  
  if (!item) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-slate-900 mb-4">클래스를 찾을 수 없습니다</h1>
            <Button onClick={() => router.push(`/${String(slug)}/classes`)}>
              클래스 목록으로 돌아가기
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const embed = getYouTubeEmbedUrl(item.youtube_url)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* 헤더 - PC만 표시 */}
      <div className="hidden md:block max-w-4xl mx-auto px-4 py-4">
        <Button 
          variant="ghost" 
          className="cursor-pointer hover:bg-slate-100 rounded-xl transition-colors duration-200"
          onClick={() => router.push(`/${String(slug)}/classes`)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          클래스 목록으로 돌아가기
        </Button>
      </div>

      {/* 모바일 헤더 */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-30">
        <div className="flex items-center h-full px-4">
          <Button 
            variant="ghost" 
            size="sm"
            className="cursor-pointer hover:bg-slate-50 rounded-lg transition-colors"
            onClick={() => router.push(`/${String(slug)}/classes`)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span className="text-sm font-medium">뒤로</span>
          </Button>
          <div className="flex-1 text-center">
            <span className="text-sm font-semibold text-slate-900">클래스</span>
          </div>
          <div className="w-16" /> {/* 우측 공간 확보 */}
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-4xl mx-auto px-4 py-8 pt-20 md:pt-8">
        {/* 제목 및 정보 섹션 */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 mb-8 relative">
          {/* 조회수 (우측 상단) */}
          <div className="absolute top-6 right-6">
            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-50 border border-slate-100">
              <Eye className="w-3 h-3 text-slate-600" />
              <span className="text-xs font-medium text-slate-700">{item.views || 0}</span>
            </div>
          </div>

          {/* 작성자 정보 */}
          <div className="flex items-center gap-4 mb-4 pr-20">
            <Avatar className="w-12 h-12 ring-2 ring-slate-100 shadow-sm">
              <AvatarImage 
                src={item.author?.avatar_url ? getAvatarUrl(item.author.avatar_url, item.author.updated_at) : undefined} 
                alt={item.author?.username || item.author?.full_name || 'Author'} 
              />
              <AvatarFallback className="bg-gradient-to-br from-slate-200 to-slate-300 text-slate-700 font-semibold">
                {item.author?.full_name ? 
                  item.author.full_name.slice(0,1).toUpperCase() : 
                  item.author?.username ? 
                    item.author.username.slice(0,1).toUpperCase() : 
                    '?'
                }
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-semibold text-slate-900">
                {item.author?.full_name || item.author?.username || 'Anonymous'}
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Calendar className="w-4 h-4" />
                {new Date(item.created_at).toLocaleDateString('ko-KR', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
            </div>
          </div>

          {/* 제목과 수강 완료 버튼 */}
          <div className="flex items-start justify-between gap-6">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight flex-1">
              {item.title}
            </h1>
            
            {/* 수강 완료 버튼 */}
            <Button
              variant={item.completed ? "default" : "outline"}
              className={`cursor-pointer transition-all duration-200 shrink-0 ${
                item.completed 
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600' 
                  : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
              }`}
              onClick={() => handleCompletionToggle(!item.completed)}
            >
              {item.completed ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  수강 완료됨
                </>
              ) : (
                <>
                  <Circle className="w-4 h-4 mr-2" />
                  수강 완료하기
                </>
              )}
            </Button>
          </div>
        </div>

        {/* 비디오/썸네일 */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden mb-8">
          {embed ? (
            <div className="relative">
              <iframe 
                className="w-full aspect-video" 
                src={embed} 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                allowFullScreen
                title="Class Video"
                frameBorder="0"
                loading="lazy"
                style={{
                  pointerEvents: 'auto',
                  border: 'none',
                  outline: 'none'
                }}
              />
            </div>
          ) : (
            <div className="w-full aspect-video bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
              {item.thumbnail_url ? (
                <img src={item.thumbnail_url} alt={item.title} className="w-full h-full object-cover" />
              ) : (
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-slate-300 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span className="text-slate-500 font-medium">동영상 없음</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 설명 */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
          <h2 className="text-xl font-bold text-slate-900 mb-4">클래스 설명</h2>
          <div className="prose prose-slate max-w-none">
            <div className="whitespace-pre-wrap text-slate-700 leading-relaxed">
              {item.description || '설명이 없습니다.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


