"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getCommunityPageById } from "@/lib/communities"
import { BoardTab } from "./BoardTab"
import BlogPage from "./pages/BlogPage"
import Image from "next/image"
import SectionTitle from "@/components/SectionTitle"

interface PageContentProps {
  pageId: string
}

export function PageContent({ pageId }: PageContentProps) {
  const [title, setTitle] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(true)
  const [communityId, setCommunityId] = useState<string | null>(null)
  const [type, setType] = useState<'feed' | 'blog' | null>(null)
  const [bannerUrl, setBannerUrl] = useState<string | null>(null)
  const [desc, setDesc] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        setLoading(true)
        const page = await getCommunityPageById(pageId)
        if (!mounted) return
        setTitle(page?.title || "페이지")
        const t = (page as any)?.type as any
        if (t === 'feed' || t === 'blog') {
          setType(t)
        } else {
          // 폴백: 타입 컬럼이 없거나 비어있을 때 테이블 존재로 추정
          try {
            const supa = (await import('@/lib/supabase')).supabase
            const { data: blogProbe } = await supa.from('community_page_blog_posts').select('id').eq('page_id', pageId).limit(1)
            if ((blogProbe as any)?.length > 0) setType('blog')
            else setType('feed')
          } catch {
            setType('feed')
          }
        }
        setCommunityId((page as any)?.community_id || null)
        setBannerUrl((page as any)?.banner_url || null)
        setDesc((page as any)?.description || null)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [pageId])

  if (loading) return <div className="h-24 bg-slate-100 rounded-xl animate-pulse" />

  if ((!type || type === 'feed') && communityId) {
    return (
      <div className="space-y-3">
        <div className="pt-4">
          <SectionTitle title={title} description={desc} />
        </div>
        <BoardTab communityId={communityId} pageId={pageId} variant="contentOnly" />
      </div>
    )
  }

  if (type === 'blog') {
    return <BlogPage title={title} bannerUrl={bannerUrl} description={desc} pageId={pageId} communityId={communityId as string} />
  }
  // 알 수 없는 타입: 피드로 폴백
  return (
    <div className="space-y-3">
      <div className="pt-4">
        <SectionTitle title={title} description={desc} />
      </div>
      {communityId && <BoardTab communityId={communityId} pageId={pageId} variant="contentOnly" />}
    </div>
  )
}



