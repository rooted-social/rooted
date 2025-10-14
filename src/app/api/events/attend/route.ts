import { NextRequest } from 'next/server'
import { createServerClientWithAuth } from '@/lib/supabase-server'
import { resolveUserId } from '@/lib/auth/user'
import { getCommunityAccess } from '@/lib/community/access'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const eventId = body?.eventId as string | undefined
  const attend = !!body?.attend
  if (!eventId) return new Response(JSON.stringify({ error: 'eventId is required' }), { status: 400 })

  const authHeader = req.headers.get('authorization') || ''
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined
  const supabase = await createServerClientWithAuth(bearer)
  const uid = await resolveUserId(req)
  if (!uid) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })

  try {
    // 이벤트 커뮤니티 멤버만 참석 토글 가능
    const { data: ev } = await supabase
      .from('community_events')
      .select('community_id')
      .eq('id', eventId)
      .maybeSingle()
    if (!ev) return new Response(JSON.stringify({ ok: false }), { status: 404 })

    const access = await getCommunityAccess(supabase, (ev as any).community_id, uid, { superAdmin: false })
    if (!access.isMember) {
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


