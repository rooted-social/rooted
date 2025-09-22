import { NextRequest } from 'next/server'
import { createServerClientWithAuth } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const eventId = searchParams.get('eventId')
  if (!eventId) return new Response(JSON.stringify({ error: 'eventId is required' }), { status: 400 })

  const authHeader = req.headers.get('authorization') || ''
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined
  const supabase = createServerClientWithAuth(bearer)

  try {
    // 이벤트 소속 커뮤니티 확인 및 권한 체크 (멤버만 열람)
    const { data: ev } = await supabase
      .from('community_events')
      .select('id, community_id')
      .eq('id', eventId)
      .maybeSingle()
    if (!ev) return new Response(JSON.stringify([]), { status: 200 })

    const { data: { user } } = await supabase.auth.getUser()
    const uid = user?.id
    if (!uid) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })

    const { data: membership } = await supabase
      .from('community_members')
      .select('id, role')
      .eq('community_id', (ev as any).community_id)
      .eq('user_id', uid)
      .maybeSingle()
    const role = (membership as any)?.role
    if (!role || role === 'pending') {
      return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 })
    }

    // 참여자 목록: event_attendees(event_id, user_id) 조인 profiles
    const { data: rows } = await supabase
      .from('event_attendees')
      .select('user_id, profiles(avatar_url, full_name, username)')
      .eq('event_id', eventId)

    const attendees = (rows || []).map((r: any) => ({
      id: r.user_id,
      avatar_url: r.profiles?.avatar_url || null,
      name: r.profiles?.full_name || r.profiles?.username || null,
    }))
    return new Response(JSON.stringify(attendees), { status: 200, headers: { 'content-type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify([]), { status: 200 })
  }
}


