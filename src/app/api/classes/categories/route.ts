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
    // 카테고리 추가/삭제가 즉시 반영되도록 캐시 비활성화
    return new Response(JSON.stringify(data || []), { status: 200, headers: { 'content-type': 'application/json', 'Cache-Control': 'no-store' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'failed to load class categories' }), { status: 500 })
  }
}


