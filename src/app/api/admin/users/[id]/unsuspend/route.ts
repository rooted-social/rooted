import { NextRequest } from 'next/server'
import { requireSuperAdminOr404JSON } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, context: any) {
  const { params } = context || {}
  const guard = await requireSuperAdminOr404JSON()
  if (!guard.ok) return guard.response
  const { id } = params as { id: string }
  const supabase = createAdminClient()
  const { error } = await supabase.from('profiles').update({ is_suspended: false, suspended_reason: null, suspended_until: null }).eq('id', id)
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  await supabase.from('audit_logs').insert({ actor_id: guard.userId, action: 'user.unsuspend', entity_type: 'user', entity_id: id })
  return new Response(JSON.stringify({ success: true }), { status: 200 })
}


