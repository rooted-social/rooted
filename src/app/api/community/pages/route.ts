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

    const { data, error } = await supabase
      .from('community_pages')
      .select('*')
      .eq('community_id', communityId)
      .order('group_id', { ascending: true, nullsFirst: true })
      .order('position', { ascending: true })
    if (error) throw error

    return new Response(JSON.stringify(data || []), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'Cache-Control': 'public, max-age=120, s-maxage=120',
      },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'failed to load community pages' }), { status: 500 })
  }
}

// 일괄 정렬 저장 (브라우저 → 서버 1회 요청)
export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  try {
    const body = await req.json().catch(() => null)
    const communityId: string | undefined = body?.communityId
    const orderedIds: string[] | undefined = body?.orderedIds
    if (!communityId || !Array.isArray(orderedIds)) {
      return new Response(JSON.stringify({ error: 'communityId and orderedIds are required' }), { status: 400 })
    }

    if (orderedIds.length === 0) {
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    }

    // 다수 업데이트를 병렬 실행 (단일 HTTP 요청 내에서 처리)
    const updates = orderedIds.map((id: string, index: number) =>
      supabase
        .from('community_pages')
        .update({ position: index })
        .eq('id', id)
        .eq('community_id', communityId)
    )
    const results = await Promise.all(updates)
    const firstError = results.find(r => (r as any).error)?.error
    if (firstError) throw firstError

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'failed to save order' }), { status: 500 })
  }
}


