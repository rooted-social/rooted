import { NextRequest } from 'next/server'
import { createServerClient, createServerClientWithAuth } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const communityId = searchParams.get('communityId')
  if (!communityId) {
    return new Response(JSON.stringify({ error: 'communityId is required' }), { status: 400 })
  }

  const authHeader = req.headers.get('authorization') || ''
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined
  const supabase = createServerClientWithAuth(bearer)

  try {
    // 멤버십 체크: 쿠키 또는 Authorization 헤더 기반 사용자
    const { data: { user } } = await supabase.auth.getUser()
    const authUserId = user?.id
    if (!authUserId) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
    const [{ data: community }, { data: member }] = await Promise.all([
      supabase.from('communities').select('owner_id').eq('id', communityId).single(),
      supabase.from('community_members').select('role').eq('community_id', communityId).eq('user_id', authUserId).maybeSingle(),
    ])
    const isOwner = community && (community as any).owner_id === authUserId
    const isMember = member && (member as any).role && (member as any).role !== 'pending'
    if (!isOwner && !isMember) {
      return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 })
    }

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



