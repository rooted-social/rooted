import { NextRequest } from 'next/server'
import { requireSuperAdminOr404JSON } from '@/lib/auth/admin'
import { createServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, context: any) {
  const { params } = context || {}
  const guard = await requireSuperAdminOr404JSON()
  if (!guard.ok) return guard.response
  const { id } = params as { id: string }
  const body = await req.json().catch(() => ({})) as { reason?: string }
  if (!body.reason) return new Response(JSON.stringify({ error: 'reason is required' }), { status: 400 })
  const supabase = createServerClient()
  const { error } = await supabase.from('communities').update({ is_disabled: true, disabled_reason: body.reason }).eq('id', id)
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  await supabase.from('audit_logs').insert({ actor_id: guard.userId, action: 'community.disable', entity_type: 'community', entity_id: id, reason: body.reason })
  return new Response(JSON.stringify({ success: true }), { status: 200 })
}


