import { NextRequest } from 'next/server'
import { requireSuperAdminOr404JSON } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  const guard = await requireSuperAdminOr404JSON()
  if (!guard.ok) return guard.response
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('featured_communities')
    .select('id, position, community_id')
    .order('position', { ascending: true, nullsFirst: true })
    .order('created_at', { ascending: true })
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  return new Response(JSON.stringify(data || []), { status: 200, headers: { 'content-type': 'application/json', 'Cache-Control': 'no-store' } })
}

export async function POST(req: NextRequest) {
  const guard = await requireSuperAdminOr404JSON()
  if (!guard.ok) return guard.response
  const { communityId, communitySlug, position } = await req.json().catch(() => ({}))
  if (!communityId && !communitySlug) return new Response(JSON.stringify({ error: 'communityId or communitySlug required' }), { status: 400 })
  const supabase = createAdminClient()
  let id = communityId
  if (!id && communitySlug) {
    const { data } = await supabase.from('communities').select('id').eq('slug', communitySlug).maybeSingle()
    id = (data as any)?.id
    if (!id) return new Response(JSON.stringify({ error: 'community not found' }), { status: 404 })
  }
  const { error } = await supabase.from('featured_communities').insert({ community_id: id, position: position ?? null })
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  return new Response(JSON.stringify({ success: true }), { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const guard = await requireSuperAdminOr404JSON()
  if (!guard.ok) return guard.response
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 })
  const supabase = createAdminClient()
  const { error } = await supabase.from('featured_communities').delete().eq('id', id)
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  return new Response(JSON.stringify({ success: true }), { status: 200 })
}


