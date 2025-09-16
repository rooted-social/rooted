"use client"

import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { getCommunity } from "@/lib/communities"
import { MembersTab } from "@/components/community-dashboard/MembersTab"

export default function CommunityMembersPage() {
  const { slug } = useParams<{ slug: string }>()
  const [communityId, setCommunityId] = useState<string>("")
  const [ownerId, setOwnerId] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (!slug) return
      
      setLoading(true)
      try {
        const community = await getCommunity(String(slug))
        if (!mounted) return
        setCommunityId(community.id)
        setOwnerId((community as any)?.owner_id || null)
      } catch (error) {
        console.error('Community load failed:', error)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [slug])

  if (loading) {
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
    <main className="pt-14 md:pt-6 pb-3 px-[2%]">
      <MembersTab communityId={communityId} ownerId={ownerId} />
    </main>
  )
}
