import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json().catch(() => ({})) as { id?: string }
    if (!id) return new Response(JSON.stringify({ error: 'id is required' }), { status: 400 })

    const admin = createAdminClient()
    const { data: row } = await admin
      .from('community_page_blog_posts')
      .select('views')
      .eq('id', id)
      .maybeSingle()
    if (!row) return new Response(JSON.stringify({ error: 'not found' }), { status: 404 })

    const next = (row as any)?.views ? Number((row as any).views) + 1 : 1
    const { data, error } = await admin
      .from('community_page_blog_posts')
      .update({ views: next })
      .eq('id', id)
      .select('views')
      .single()
    if (error) throw error

    return new Response(JSON.stringify({ views: (data as any)?.views ?? next }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'failed' }), { status: 500 })
  }
}


