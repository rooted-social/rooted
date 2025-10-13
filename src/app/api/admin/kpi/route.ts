import { requireSuperAdminOr404JSON } from '@/lib/auth/admin'
import { createServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const guard = await requireSuperAdminOr404JSON()
  if (!guard.ok) return guard.response
  const supabase = await createServerClient()
  try {
    const { searchParams } = new URL(req.url)
    const days = Math.max(7, Math.min(365, Number(searchParams.get('days') || '90')))
    const gran = (searchParams.get('gran') || 'day').toLowerCase() as 'day'|'week'|'month'
    const cumulative = (searchParams.get('cum') || '0') === '1'
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    // 누적 KPI
    const { data: kpiRow } = await supabase.from('admin_kpis').select('*').maybeSingle()

    // 일별 증가량(가입/커뮤니티 생성)
    // created_at 컬럼이 각 테이블에 있다고 가정
    const [usersRes, commsRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('created_at')
        .gte('created_at', since.toISOString()),
      supabase
        .from('communities')
        .select('created_at')
        .gte('created_at', since.toISOString()),
    ])

    const formatKey = (d: Date) => {
      if (gran === 'month') return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
      if (gran === 'week') {
        // ISO week (rough): year-Www
        const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
        const dayNum = (tmp.getUTCDay() + 6) % 7
        tmp.setUTCDate(tmp.getUTCDate() - dayNum + 3)
        const firstThursday = new Date(Date.UTC(tmp.getUTCFullYear(),0,4))
        const week = 1 + Math.round(((tmp.getTime() - firstThursday.getTime()) / 86400000 - 3) / 7)
        return `${tmp.getUTCFullYear()}-W${String(week).padStart(2,'0')}`
      }
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    }

    const bucketCount = (rows?: any[]) => {
      const map: Record<string, number> = {}
      for (const r of (rows || [])) {
        const d = new Date((r as any).created_at)
        const key = formatKey(d)
        map[key] = (map[key] || 0) + 1
      }
      return map
    }

    const seqKeys: string[] = (() => {
      const keys: string[] = []
      if (gran === 'month') {
        const start = new Date(since.getFullYear(), since.getMonth(), 1)
        const end = new Date()
        const cursor = new Date(start)
        while (cursor <= end) { keys.push(formatKey(cursor)); cursor.setMonth(cursor.getMonth() + 1) }
      } else if (gran === 'week') {
        const start = new Date(since)
        for (let i = 0; i < days; i += 7) { keys.push(formatKey(new Date(start.getTime() + i * 86400000))) }
      } else {
        for (let i = 0; i < days; i++) { keys.push(formatKey(new Date(since.getTime() + i * 86400000))) }
      }
      return keys
    })()

    const usersMap = bucketCount(usersRes.data || [])
    const commsMap = bucketCount(commsRes.data || [])
    const series = seqKeys.map(k => ({ key: k, users: usersMap[k] || 0, communities: commsMap[k] || 0 }))

    if (cumulative) {
      let cu = 0, cc = 0
      for (const s of series) {
        cu += s.users || 0
        cc += s.communities || 0
        s.users = cu
        s.communities = cc
      }
    }

    const payload = { totals: kpiRow || { users_total: 0, communities_total: 0 }, series, rangeDays: days, granularity: gran, cumulative }

    return new Response(JSON.stringify(payload), { status: 200, headers: { 'content-type': 'application/json', 'Cache-Control': 'no-store' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'failed to load kpi' }), { status: 500 })
  }
}


