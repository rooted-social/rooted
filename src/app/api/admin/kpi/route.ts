import { requireSuperAdminOr404JSON } from '@/lib/auth/admin'
import { createServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const guard = await requireSuperAdminOr404JSON()
  if (!guard.ok) return guard.response
  const supabase = await createServerClient()
  const { data, error } = await supabase.from('admin_kpis').select('*').maybeSingle()
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
  return new Response(JSON.stringify(data || { users_total: 0, communities_total: 0, reports_pending: 0 }), { status: 200, headers: { 'content-type': 'application/json', 'Cache-Control': 'no-store' } })
}


