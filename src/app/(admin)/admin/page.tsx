import { assertSuperAdminOrNotFound } from '@/lib/auth/admin'
import { createServerClient } from '@/lib/supabase-server'
import KPIChart from '@/components/admin/KPIChart'

export const dynamic = 'force-dynamic'

export default async function AdminOverviewPage() {
  await assertSuperAdminOrNotFound()
  const supabase = await createServerClient()
  const { data } = await supabase.from('admin_kpis').select('*').maybeSingle()
  const { count: feedbackCount } = await supabase.from('feedbacks').select('*', { count: 'exact', head: true })
  const { count: betaCount } = await supabase.from('beta_applicants').select('*', { count: 'exact', head: true })
  const kpis = data || { users_total: 0, communities_total: 0 }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <div className="rounded-lg border p-4">
        <div className="text-sm text-gray-500">Users</div>
        <div className="mt-2 text-2xl font-semibold">{kpis.users_total}</div>
      </div>
      <div className="rounded-lg border p-4">
        <div className="text-sm text-gray-500">Communities</div>
        <div className="mt-2 text-2xl font-semibold">{kpis.communities_total}</div>
      </div>
      {/* Reports Pending 카드 제거 */}
      <div className="rounded-lg border p-4">
        <div className="text-sm text-gray-500">Feedback</div>
        <div className="mt-2 text-2xl font-semibold">{feedbackCount || 0}</div>
      </div>
      <div className="rounded-lg border p-4">
        <div className="text-sm text-gray-500">Beta Testers</div>
        <div className="mt-2 text-2xl font-semibold">{betaCount || 0}</div>
      </div>
      {/* 그래프 카드 (클라이언트 차트) */}
      <div className="md:col-span-3">
        <KPIChart initialDays={90} />
      </div>
    </div>
  )
}


