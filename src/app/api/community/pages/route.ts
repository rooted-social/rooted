import { NextRequest } from 'next/server'
import { createServerClient, createServerClientWithAuth } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { resolveUserId } from '@/lib/auth/user'
import { getCommunityAccess } from '@/lib/community/access'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const communityId = searchParams.get('communityId')
  if (!communityId) {
    return new Response(JSON.stringify({ error: 'communityId is required' }), { status: 400 })
  }

  const authHeader = req.headers.get('authorization') || ''
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined
  const supabase = await createServerClientWithAuth(bearer)

  try {
    // 중앙화 사용자 식별 및 권한 확인
    const authUserId = await resolveUserId(req)
    if (!authUserId) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
    const superId = process.env.SUPER_ADMIN_USER_ID
    const isSuper = !!superId && superId === authUserId
    const access = await getCommunityAccess(supabase, communityId, authUserId, { superAdmin: isSuper })
    if (!access.isOwner && !access.isMember) {
      return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 })
    }

    const canUseAdmin = !!process.env.SUPABASE_SERVICE_ROLE_KEY
    const db = isSuper && canUseAdmin ? createAdminClient() : supabase
    const { data, error } = await db
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
  const supabase = await createServerClient()
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


