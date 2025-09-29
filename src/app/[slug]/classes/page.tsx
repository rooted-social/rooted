"use client"

import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { getCommunity } from "@/lib/communities"
import ClassesPage from "@/components/community-dashboard/pages/ClassesPage"

export default function CommunityClassesPage() {
  const { slug } = useParams<{ slug: string }>()
  const [communityId, setCommunityId] = useState<string>("")
  const [ownerId, setOwnerId] = useState<string>("")
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
        // 오너 아이디도 함께 보관하여 오너 전용 UI 노출
        setOwnerId((community as any)?.owner_id || "")
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
      <main className="pt-14 md:pt-6 pb-3 px-[2%]">
        <div className="py-12 flex items-center justify-center">
          <div className="flex items-center gap-2 rounded-2xl bg-black/5 border border-black/10 px-3 py-2 shadow-sm">
            <svg className="w-5 h-5 animate-spin text-slate-800" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            </svg>
            <span className="text-sm font-medium text-slate-800">불러오는 중...</span>
          </div>
        </div>
      </main>
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
      <ClassesPage communityId={communityId} ownerId={ownerId} />
    </main>
  )
}
