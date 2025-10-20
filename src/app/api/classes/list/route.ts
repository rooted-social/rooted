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
    // 중앙화 사용자 식별/권한
    const authUserId = await resolveUserId(req)
    if (!authUserId) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
    }
    const superId = process.env.SUPER_ADMIN_USER_ID
    const isSuper = !!superId && superId === authUserId
    const access = await getCommunityAccess(supabase, communityId, authUserId, { superAdmin: isSuper })
    if (!isSuper && !access.isOwner && !access.isMember) {
      return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 })
    }

    // 기본 클래스 목록
    const canUseAdmin = !!process.env.SUPABASE_SERVICE_ROLE_KEY
    const db = isSuper && canUseAdmin ? createAdminClient() : supabase
    let q = db
      .from('classes')
      .select('id, community_id, category_id, title, description, thumbnail_url, youtube_url, user_id, views, created_at')
      .eq('community_id', communityId)
      .order('created_at', { ascending: false })
    if (categoryId) q = q.eq('category_id', categoryId)
    const { data: classes } = await q
    const list = (classes || []) as any[]
    if (list.length === 0) {
      return new Response(JSON.stringify([]), { status: 200, headers: { 'content-type': 'application/json', 'Cache-Control': 'public, max-age=60, s-maxage=60' } })
    }

    // 작성자/수강상태
    const userIds = Array.from(new Set(list.map(c => c.user_id).filter(Boolean)))
    const classIds = list.map(c => c.id)
    let authorsMap: Record<string, any> = {}
    if (userIds.length > 0) {
      const { data: authors } = await db
        .from('profiles')
        .select('id, full_name, username, avatar_url, updated_at')
        .in('id', userIds as any)
      authorsMap = Object.fromEntries((authors || []).map((a: any) => [a.id, a]))
    }

    let enrollMap: Record<string, boolean> = {}
    if (userId) {
      const { data: enrolls } = await db
        .from('class_enrollments')
        .select('class_id, completed')
        .eq('user_id', userId)
        .in('class_id', classIds as any)
      enrollMap = Object.fromEntries((enrolls || []).map((e: any) => [e.class_id, !!e.completed]))
    }

    const merged = list.map(c => ({ ...c, author: c.user_id ? authorsMap[c.user_id] || null : null, completed: enrollMap[c.id] || false }))
    return new Response(JSON.stringify(merged), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'Cache-Control': 'public, max-age=60, s-maxage=60',
      },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'failed to load classes' }), { status: 500 })
  }
}


