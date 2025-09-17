"use client"

import { useEffect, useState } from "react"
import { fetchDashboardStats } from "@/lib/dashboard"
import { withAlpha } from "@/utils/color"
import { Users2, FileText, MessageCircle, BookOpen, Newspaper, CalendarClock, TrendingUp } from "lucide-react"

interface StatsTabProps { communityId: string; brandColor?: string | null }

export function StatsTab({ communityId, brandColor }: StatsTabProps) {
  const [loading, setLoading] = useState<boolean>(true)
  const [stats, setStats] = useState<{ memberCount: number; postCount: number; commentCount: number; classCount?: number; blogCount?: number; upcomingEventCount?: number }>({ memberCount: 0, postCount: 0, commentCount: 0 })

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        setLoading(true)
        const data = await fetchDashboardStats(communityId)
        if (!mounted) return
        setStats(data)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [communityId])

  const c = brandColor || '#0f172a'

  if (loading) {
    return (
      <div className="rounded-3xl shadow-sm bg-white/60 backdrop-blur-md border p-6" style={{ borderColor: withAlpha(c, 0.18) }}>
        <div className="h-8 w-40 bg-slate-100 rounded mb-6 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <section className="space-y-6">
      <div className="rounded-3xl shadow-sm bg-white/60 backdrop-blur-md border mx-[2%] md:mx-[3%]" style={{ borderColor: withAlpha(c, 0.18) }}>
        <div className="p-6 md:p-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm" style={{ backgroundColor: withAlpha(c, 0.08), borderColor: withAlpha(c, 0.25) }}>
              <TrendingUp className="w-5 h-5" style={{ color: c }} />
            </div>
            <h3 className="text-xl font-semibold text-slate-900">커뮤니티 현황</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            <StatCard label="멤버" value={stats.memberCount} icon={<Users2 className="w-3.5 h-3.5 text-blue-600/90" />} from="from-blue-50/30" border="border-blue-200/40" />
            <StatCard label="피드" value={stats.postCount} icon={<FileText className="w-3.5 h-3.5 text-green-600/90" />} from="from-green-50/30" border="border-green-200/40" />
            <StatCard label="피드 댓글" value={stats.commentCount} icon={<MessageCircle className="w-3.5 h-3.5 text-purple-600/90" />} from="from-purple-50/30" border="border-purple-200/40" />
            <StatCard label="클래스" value={stats.classCount ?? 0} icon={<BookOpen className="w-3.5 h-3.5 text-orange-600/90" />} from="from-orange-50/30" border="border-orange-200/40" />
            <StatCard label="블로그" value={stats.blogCount ?? 0} icon={<Newspaper className="w-3.5 h-3.5 text-pink-600/90" />} from="from-pink-50/30" border="border-pink-200/40" />
            <StatCard label="이벤트" value={stats.upcomingEventCount ?? 0} icon={<CalendarClock className="w-3.5 h-3.5 text-cyan-600/90" />} from="from-cyan-50/30" border="border-cyan-200/40" />
          </div>
        </div>
      </div>
    </section>
  )
}

function StatCard({ label, value, icon, from, border }: { label: string; value: number; icon: React.ReactNode; from: string; border: string }) {
  return (
    <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${from} to-slate-100 border ${border} flex items-center justify-center`}>
            {icon}
          </div>
          <span className="text-sm font-medium text-slate-600">{label}</span>
        </div>
        <div className="text-xl font-bold text-slate-900">{value}</div>
      </div>
    </div>
  )
}


