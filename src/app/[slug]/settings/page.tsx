"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { getCommunity } from "@/lib/communities"
import { SettingsTab } from "@/components/community-dashboard/SettingsTab"
import { useAuthData } from "@/components/auth/AuthProvider"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Info, Image as ImageIcon, FileText, Settings as SettingsIcon, ChevronRight } from "lucide-react"

export default function CommunitySettingsPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const { user } = useAuthData()
  const [communityId, setCommunityId] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(true)
  const [authorized, setAuthorized] = useState<boolean>(false)
  const [open, setOpen] = useState<null | 'basic' | 'images' | 'details' | 'advanced'>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (!slug) return
      
      setLoading(true)
      try {
        const community = await getCommunity(String(slug))
        if (!mounted) return
        setCommunityId(community.id)
        // 오너만 접근 허용 (전역 Context 사용)
        const uid = user?.id
        if (!uid) { router.replace(`/${String(slug)}`); return }
        const isOwner = uid === (community as any)?.owner_id
        setAuthorized(isOwner)
        if (!isOwner) { router.replace(`/${String(slug)}`); return }
      } catch (error) {
        console.error('Community load failed:', error)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [slug, user?.id])

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
    <main className="pt-10 md:pt-20 pb-6 px-[2%] md:px-[5%]">
      <section className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-center">커뮤니티 설정</h1>
        <p className="mt-1 mb-6 text-center text-sm text-slate-600">커뮤니티의 핵심 정보와 이미지, 상세페이지, 고급 옵션을 빠르게 관리하세요.</p>

        <div className="grid grid-cols-1 gap-4 place-items-center">
          <button
            onClick={() => setOpen('basic')}
            className="group relative w-[95%] sm:w-[520px] md:w-[600px] rounded-2xl border-2 border-black/20 hover:border-black/30 bg-white/90 text-slate-900 shadow-md hover:shadow-lg transition-all cursor-pointer ring-2 ring-transparent hover:ring-black/10 hover:-translate-y-0.5 overflow-hidden px-4 py-4"
          >
            <div className="w-full flex items-start gap-3">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-slate-700" />
                <span className="text-base font-semibold">기본 정보 관리</span>
              </div>
              <div className="ml-auto mt-0.5 opacity-70 group-hover:opacity-100">
                <ChevronRight className="w-5 h-5" />
              </div>
            </div>
            <p className="mt-1 text-xs text-slate-600 pl-7 text-left">이름, 카테고리, 소개, 미션 , 브랜드 컬러 설정</p>
          </button>
          <button
            onClick={() => setOpen('images')}
            className="group relative w-[95%] sm:w-[520px] md:w-[600px] rounded-2xl border-2 border-black/20 hover:border-black/30 bg-white/90 text-slate-900 shadow-md hover:shadow-lg transition-all cursor-pointer ring-2 ring-transparent hover:ring-black/10 hover:-translate-y-0.5 overflow-hidden px-4 py-4"
          >
            <div className="w-full flex items-start gap-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-slate-700" />
                <span className="text-base font-semibold">이미지 관리</span>
              </div>
              <div className="ml-auto mt-0.5 opacity-70 group-hover:opacity-100">
                <ChevronRight className="w-5 h-5" />
              </div>
            </div>
            <p className="mt-1 text-xs text-slate-600 pl-7 text-left">커뮤니티 아이콘, 이미지, 대시보드 배너 설정</p>
          </button>
          <button
            onClick={() => setOpen('details')}
            className="group relative w-[95%] sm:w-[520px] md:w-[600px] rounded-2xl border-2 border-black/20 hover:border-black/30 bg-white/90 text-slate-900 shadow-md hover:shadow-lg transition-all cursor-pointer ring-2 ring-transparent hover:ring-black/10 hover:-translate-y-0.5 overflow-hidden px-4 py-4"
          >
            <div className="w-full flex items-start gap-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-slate-700" />
                <span className="text-base font-semibold">상세페이지 관리</span>
              </div>
              <div className="ml-auto mt-0.5 opacity-70 group-hover:opacity-100">
                <ChevronRight className="w-5 h-5" />
              </div>
            </div>
            <p className="mt-1 text-xs text-slate-600 pl-7 text-left">커뮤니티 혜택 설정</p>
          </button>
          <button
            onClick={() => setOpen('advanced')}
            className="group relative w-[95%] sm:w-[520px] md:w-[600px] rounded-2xl border-2 border-black/20 hover:border-black/30 bg-white/90 text-slate-900 shadow-md hover:shadow-lg transition-all cursor-pointer ring-2 ring-transparent hover:ring-black/10 hover:-translate-y-0.5 overflow-hidden px-4 py-4"
          >
            <div className="w-full flex items-start gap-3">
              <div className="flex items-center gap-2 text-rose-600">
                <SettingsIcon className="w-5 h-5" />
                <span className="text-base font-semibold">고급 설정</span>
              </div>
              <div className="ml-auto mt-0.5 opacity-70 group-hover:opacity-100 text-rose-600">
                <ChevronRight className="w-5 h-5" />
              </div>
            </div>
            <p className="mt-1 text-xs text-slate-600 pl-7 text-left">공개 설정, 가입 형태, 커뮤니티 삭제</p>
          </button>
        </div>
      </section>

      <Dialog open={!!open} onOpenChange={(v) => { if (!v) setOpen(null) }}>
        {open && (
          <DialogContent className="sm:max-w-[1000px] max-w-[95vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {open === 'basic' && '기본 정보 관리'}
                {open === 'images' && '이미지 관리'}
                {open === 'details' && '상세페이지 관리'}
                {open === 'advanced' && '고급 설정'}
              </DialogTitle>
            </DialogHeader>
            <div className="pt-2">
              <SettingsTab
                communityId={communityId}
                mode={open}
              />
            </div>
          </DialogContent>
        )}
      </Dialog>
    </main>
  )
}
