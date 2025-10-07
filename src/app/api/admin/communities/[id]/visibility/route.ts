import { NextRequest } from 'next/server'
import { requireSuperAdminOr404JSON } from '@/lib/auth/admin'
import { createServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, context: any) {
  const { params } = context || {}
  const guard = await requireSuperAdminOr404JSON()
  if (!guard.ok) return guard.response
  const { id } = params as { id: string }
  const body = await req.json().catch(() => ({})) as { is_public?: boolean }
  if (typeof body.is_public !== 'boolean') {
    return new Response(JSON.stringify({ error: 'is_public(boolean) is required' }), { status: 400 })
  }
  const supabase = await createServerClient()
  const { error } = await supabase.from('communities').update({ is_public: body.is_public }).eq('id', id)
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  await supabase.from('audit_logs').insert({ actor_id: guard.userId, action: 'community.visibility', entity_type: 'community', entity_id: id, meta: { is_public: body.is_public } as any })
  return new Response(JSON.stringify({ success: true }), { status: 200 })
}


