import { NextRequest } from 'next/server'
import { requireSuperAdminOr404JSON } from '@/lib/auth/admin'
import { createServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireSuperAdminOr404JSON()
  if (!guard.ok) return guard.response
  const { id } = params
  const supabase = createServerClient()
  const { error } = await supabase.from('communities').update({ is_disabled: false, disabled_reason: null }).eq('id', id)
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  await supabase.from('audit_logs').insert({ actor_id: guard.userId, action: 'community.enable', entity_type: 'community', entity_id: id })
  return new Response(JSON.stringify({ success: true }), { status: 200 })
}


