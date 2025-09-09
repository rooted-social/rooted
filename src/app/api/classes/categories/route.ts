import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const communityId = searchParams.get('communityId')
  if (!communityId) {
    return new Response(JSON.stringify({ error: 'communityId is required' }), { status: 400 })
  }
  const supabase = createServerClient()
  try {
    const { data, error } = await supabase
      .from('class_categories')
      .select('*')
      .eq('community_id', communityId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return new Response(JSON.stringify(data || []), { status: 200, headers: { 'content-type': 'application/json', 'Cache-Control': 'public, max-age=120, s-maxage=120' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'failed to load class categories' }), { status: 500 })
  }
}


