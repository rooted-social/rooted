"use client"

import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import BlogPage from "@/components/community-dashboard/pages/BlogPage"
import { getCommunityPageById } from "@/lib/communities"

export default function CommunityBlogListPage() {
  const { slug } = useParams<{ slug: string }>()
  const search = useSearchParams()
  const pageId = search?.get('pageId') || ''
  const [meta, setMeta] = useState<{ title: string; banner_url: string | null; description: string | null; community_id: string } | null>(null)

  useEffect(() => { (async () => {
    if (!pageId) return
    const page = await getCommunityPageById(pageId)
    if (page) setMeta({ title: page.title, banner_url: (page as any).banner_url || null, description: (page as any).description || null, community_id: page.community_id })
  })() }, [pageId])

  if (!pageId || !meta) return <div className="min-h-[30vh]" />
  return <BlogPage title={meta.title} bannerUrl={meta.banner_url} description={meta.description} pageId={pageId} communityId={meta.community_id} />
}


