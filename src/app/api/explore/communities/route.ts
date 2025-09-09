import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search')
  const category = searchParams.get('category')

  const supabase = createServerClient()

  try {
    let q = supabase.from('communities').select('*').order('created_at', { ascending: false })
    if (category && category !== '전체') q = q.eq('category', category)
    if (search) q = q.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    const { data, error } = await q
    if (error) throw error

    return new Response(JSON.stringify(data || []), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'Cache-Control': 'public, max-age=60, s-maxage=60',
      },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'failed to load communities' }), { status: 500 })
  }
}


