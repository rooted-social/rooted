import { NextRequest } from 'next/server'
import { createServerClientWithAuth } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const communityId = searchParams.get('communityId')
  if (!communityId) return new Response(JSON.stringify({ error: 'communityId is required' }), { status: 400 })

  const authHeader = req.headers.get('authorization') || ''
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined
  const supabase = await createServerClientWithAuth(bearer)

  try {
    // 인증 및 멤버십 체크
    const { data: { user } } = await supabase.auth.getUser()
    const authUserId = user?.id
    if (!authUserId) return new Response(JSON.stringify({ members: [], pending: [], isOwner: false }), { status: 401 })

    const [{ data: comm }, { data: memberRow }] = await Promise.all([
      supabase.from('communities').select('owner_id').eq('id', communityId).single(),
      supabase.from('community_members').select('role').eq('community_id', communityId).eq('user_id', authUserId).maybeSingle(),
    ])
    const ownerId = (comm as any)?.owner_id || null
    const isOwner = !!ownerId && ownerId === authUserId
    const isMember = !!(memberRow as any)?.role && (memberRow as any).role !== 'pending'
    if (!isOwner && !isMember) return new Response(JSON.stringify({ members: [], pending: [], isOwner: false }), { status: 403 })

    // 멤버 목록 (pending 제외)
    const { data: memberRows } = await supabase
      .from('community_members')
      .select('user_id, role')
      .eq('community_id', communityId)
      .or('role.is.null,role.neq.pending')

    const userIds = Array.from(new Set((memberRows || []).map((r: any) => r.user_id)))
    const { data: profiles } = userIds.length > 0 ? await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url, updated_at, bio, email')
      .in('id', userIds as any) : { data: [] as any[] }
    const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.id, p]))

    const members = (memberRows || []).map((r: any) => ({
      user_id: r.user_id,
      role: r.role,
      is_owner: ownerId && r.user_id === ownerId,
      profile: profileMap[r.user_id] || null,
    }))

    // 오너일 때만 pending 목록 포함
    let pending: any[] = []
    if (isOwner) {
      const { data: pendingRows } = await supabase
        .from('community_members')
        .select('user_id')
        .eq('community_id', communityId)
        .eq('role', 'pending')
      const pIds = Array.from(new Set((pendingRows || []).map((r: any) => r.user_id)))
      const { data: pProfiles } = pIds.length > 0 ? await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url, updated_at, bio, email')
        .in('id', pIds as any) : { data: [] as any[] }
      const pMap = Object.fromEntries((pProfiles || []).map((p: any) => [p.id, p]))
      pending = (pendingRows || []).map((r: any) => ({ user_id: r.user_id, profile: pMap[r.user_id] || null }))
    }

    return new Response(JSON.stringify({ members, pending, isOwner }), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        // 멤버는 빈번히 변동 가능하므로 캐시 짧게
        'Cache-Control': 'public, max-age=30, s-maxage=30',
      },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'failed to load members' }), { status: 500 })
  }
}


