import { NextRequest } from 'next/server'
import { createServerClientWithAuth } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { resolveUserId } from '@/lib/auth/user'
import { getCommunityAccess } from '@/lib/community/access'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const communityId = searchParams.get('communityId')
  const categoryId = searchParams.get('categoryId')
  const userId = searchParams.get('userId')
  if (!communityId) {
    return new Response(JSON.stringify({ error: 'communityId is required' }), { status: 400 })
  }

  const authHeader = req.headers.get('authorization') || ''
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined
  const supabase = await createServerClientWithAuth(bearer)

  try {
    // 중앙화 사용자 식별
    const authUserId = await resolveUserId(req)
    if (!authUserId) {
      return new Response(JSON.stringify({ categories: [], classes: [] }), { status: 401 })
    }
    const superId = process.env.SUPER_ADMIN_USER_ID
    const isSuper = !!superId && superId === authUserId
    const access = await getCommunityAccess(supabase, communityId, authUserId, { superAdmin: isSuper })
    if (!isSuper && !access.isOwner && !access.isMember) {
      return new Response(JSON.stringify({ categories: [], classes: [] }), { status: 403 })
    }

    // RPC 우선: classes_overview
    try {
      const cursorCreatedAt = searchParams.get('cursorCreatedAt')
      const cursorId = searchParams.get('cursorId')
      const limit = Math.max(1, Math.min(50, Number(searchParams.get('limit') || '20')))
      const { data: rpc } = await supabase.rpc('classes_overview', {
        p_community_id: communityId,
        p_category_id: categoryId || null,
        p_user_id: userId || authUserId,
        p_cursor_created_at: cursorCreatedAt || null,
        p_cursor_id: cursorId || null,
        p_limit: limit,
      })
      if (rpc) {
        return new Response(JSON.stringify(rpc), { status: 200, headers: { 'content-type': 'application/json', 'Cache-Control': 'public, max-age=60, s-maxage=60' } })
      }
    } catch {}

    // 폴백: 기존 병렬 조회
    const canUseAdmin = !!process.env.SUPABASE_SERVICE_ROLE_KEY
    const db = isSuper && canUseAdmin ? createAdminClient() : supabase
    const [catRes, classRes] = await Promise.all([
      db.from('class_categories').select('*').eq('community_id', communityId).order('created_at', { ascending: true }),
      (async () => {
        let q = db
          .from('classes')
          .select('id, community_id, category_id, title, description, thumbnail_url, youtube_url, user_id, views, created_at')
          .eq('community_id', communityId)
          .order('created_at', { ascending: false })
        if (categoryId) (q as any).eq('category_id', categoryId)
        const { data } = await q
        return { data }
      })(),
    ])

    const categories = (catRes.data || []) as any[]
    const list = (classRes.data || []) as any[]

    // 작성자/수강상태 보강
    let authorsMap: Record<string, any> = {}
    if (list.length > 0) {
      const userIds = Array.from(new Set(list.map(c => c.user_id).filter(Boolean)))
      if (userIds.length > 0) {
        const { data: authors } = await db
          .from('profiles')
          .select('id, full_name, username, avatar_url, updated_at')
          .in('id', userIds as any)
        authorsMap = Object.fromEntries((authors || []).map((a: any) => [a.id, a]))
      }
    }

    let enrollMap: Record<string, boolean> = {}
    if (userId && list.length > 0) {
      const classIds = list.map(c => c.id)
      const { data: enrolls } = await db
        .from('class_enrollments')
        .select('class_id, completed')
        .eq('user_id', userId)
        .in('class_id', classIds as any)
      enrollMap = Object.fromEntries((enrolls || []).map((e: any) => [e.class_id, !!e.completed]))
    }

    const merged = list.map(c => ({ ...c, author: c.user_id ? authorsMap[c.user_id] || null : null, completed: enrollMap[c.id] || false }))

    return new Response(JSON.stringify({ categories, classes: merged }), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        // 목록은 캐시 60초, 카테고리는 관리에서 변경될 수 있어도 전체 60초는 허용
        'Cache-Control': 'public, max-age=60, s-maxage=60',
      },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'failed to load classes overview' }), { status: 500 })
  }
}


