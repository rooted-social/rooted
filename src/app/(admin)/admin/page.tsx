import { assertSuperAdminOrNotFound } from '@/lib/auth/admin'
import { createServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export default async function AdminOverviewPage() {
  await assertSuperAdminOrNotFound()
  const supabase = createServerClient()
  const { data } = await supabase.from('admin_kpis').select('*').maybeSingle()
  const kpis = data || { users_total: 0, communities_total: 0, reports_pending: 0 }

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
      <div className="rounded-lg border p-4">
        <div className="text-sm text-gray-500">Reports Pending</div>
        <div className="mt-2 text-2xl font-semibold">{kpis.reports_pending}</div>
      </div>
    </div>
  )
}


