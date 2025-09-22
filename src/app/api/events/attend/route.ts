import { NextRequest } from 'next/server'
import { createServerClientWithAuth } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const eventId = body?.eventId as string | undefined
  const attend = !!body?.attend
  if (!eventId) return new Response(JSON.stringify({ error: 'eventId is required' }), { status: 400 })

  const authHeader = req.headers.get('authorization') || ''
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined
  const supabase = createServerClientWithAuth(bearer)

  const { data: { user } } = await supabase.auth.getUser()
  const uid = user?.id
  if (!uid) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })

  try {
    // 이벤트 커뮤니티 멤버만 참석 토글 가능
    const { data: ev } = await supabase
      .from('community_events')
      .select('community_id')
      .eq('id', eventId)
      .maybeSingle()
    if (!ev) return new Response(JSON.stringify({ ok: false }), { status: 404 })

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

    if (attend) {
      await supabase.from('event_attendees').upsert({ event_id: eventId, user_id: uid }, { onConflict: 'event_id,user_id' })
    } else {
      await supabase.from('event_attendees').delete().eq('event_id', eventId).eq('user_id', uid)
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (e) {
    return new Response(JSON.stringify({ ok: false }), { status: 200 })
  }
}


