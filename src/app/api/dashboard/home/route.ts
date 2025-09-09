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
    const [settingsRes, noticesRes] = await Promise.all([
      supabase.from('community_settings').select('*').eq('community_id', communityId).maybeSingle(),
      supabase.from('notices').select('*').eq('community_id', communityId).order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(10),
    ])

    const payload = {
      settings: settingsRes.data || null,
      notices: Array.isArray(noticesRes.data) ? noticesRes.data : [],
    }
    return new Response(JSON.stringify(payload), { 
      status: 200, 
      headers: { 
        'content-type': 'application/json',
        // 60초 캐시 (브라우저/에지)
        'Cache-Control': 'public, max-age=60, s-maxage=60',
      } 
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'failed to load home data' }), { status: 500 })
  }
}



