import { NextRequest } from 'next/server'
import { requireSuperAdminOr404JSON } from '@/lib/auth/admin'
import { createServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const guard = await requireSuperAdminOr404JSON()
  if (!guard.ok) return guard.response
  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') || '').trim()
  const status = searchParams.get('status') || 'all'
  const page = Number(searchParams.get('page') || '1')
  const pageSize = Math.min(Number(searchParams.get('pageSize') || '20'), 100)
  const offset = (page - 1) * pageSize

  const supabase = createServerClient()
  let query = supabase.from('profiles').select('id, username, full_name, email, is_suspended, suspended_until, created_at', { count: 'exact' })
  if (q) query = query.or(`email.ilike.%${q}%,username.ilike.%${q}%,full_name.ilike.%${q}%`)
  if (status === 'active') query = query.eq('is_suspended', false)
  if (status === 'suspended') query = query.eq('is_suspended', true)
  const { data: rows, count, error } = await query.order('created_at', { ascending: false }).range(offset, offset + pageSize - 1)
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })

  return new Response(JSON.stringify({ items: rows || [], page, pageSize, total: count || 0 }), { status: 200, headers: { 'content-type': 'application/json', 'Cache-Control': 'no-store' } })
}


