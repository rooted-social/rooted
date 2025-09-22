import { NextRequest } from 'next/server'
import { requireSuperAdminOr404JSON } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireSuperAdminOr404JSON()
  if (!guard.ok) return guard.response
  const { id } = params
  const body = await req.json().catch(() => ({})) as { reason?: string; until?: string | null }
  if (!body.reason) return new Response(JSON.stringify({ error: 'reason is required' }), { status: 400 })

  const supabase = createAdminClient()
  const { error } = await supabase.from('profiles').update({ is_suspended: true, suspended_reason: body.reason, suspended_until: body.until || null }).eq('id', id)
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })

  // 감사 로그
  await supabase.from('audit_logs').insert({ actor_id: guard.userId, action: 'user.suspend', entity_type: 'user', entity_id: id, reason: body.reason })
  return new Response(JSON.stringify({ success: true }), { status: 200 })
}


