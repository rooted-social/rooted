"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { getCommunity, getCommunitySettings } from "@/lib/communities"
import { getUserId } from "@/lib/supabase"
import { StatsTab } from "@/components/community-dashboard/StatsTab"
import { BarChart3 } from "lucide-react"

export default function CommunityStatsPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const [communityId, setCommunityId] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(true)
  const [authorized, setAuthorized] = useState<boolean>(false)
  const [brandColor, setBrandColor] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (!slug) return
      setLoading(true)
      try {
        const community = await getCommunity(String(slug))
        if (!mounted) return
        setCommunityId(community.id)
        try {
          const uid = await getUserId()
          if (!uid) { router.replace(`/${String(slug)}`); return }
          const isOwner = uid === (community as any)?.owner_id
          setAuthorized(isOwner)
          if (!isOwner) {
            router.replace(`/${String(slug)}`)
            return
          }
        } catch {
          router.replace(`/${String(slug)}`)
          return
        }
        try {
          const s = await getCommunitySettings(community.id)
          setBrandColor((s as any)?.brand_color || null)
        } catch {}
      } catch (error) {
        console.error('Community load failed:', error)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [slug])

  if (loading || !authorized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-500">로딩 중...</div>
      </div>
    )
  }

  if (!communityId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-500">커뮤니티를 찾을 수 없습니다.</div>
      </div>
    )
  }

  return (
    <main className="pt-20 md:pt-6 pb-6 px-[2%]">
      {/* 페이지 타이틀 (중앙 정렬, 심플 스타일) */}
      <div className="mb-6 md:mb-8 flex items-center justify-center gap-2">
        <BarChart3 className="w-6 h-6 text-slate-900" />
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">커뮤니티 통계</h1>
      </div>

      <StatsTab communityId={communityId} brandColor={brandColor} />
    </main>
  )
}


