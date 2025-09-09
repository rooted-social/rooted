"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { getCommunity } from "@/lib/communities"
import { SettingsTab } from "@/components/community-dashboard/SettingsTab"
import { getUserId } from "@/lib/supabase"

export default function CommunitySettingsPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const [communityId, setCommunityId] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(true)
  const [authorized, setAuthorized] = useState<boolean>(false)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (!slug) return
      
      setLoading(true)
      try {
        const community = await getCommunity(String(slug))
        if (!mounted) return
        setCommunityId(community.id)
        // 오너만 접근 허용
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
    <main className="py-3 md:py-6 px-[2%]">
      <SettingsTab communityId={communityId} />
    </main>
  )
}
