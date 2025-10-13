import { NextRequest } from 'next/server'
import { createServerClient, createServerClientWithAuth } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

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
    // 멤버십 체크: 쿠키 또는 Authorization 헤더 기반 사용자 확인
    const { data: { user } } = await supabase.auth.getUser()
    const authUserId = user?.id
    if (!authUserId) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
    }
    // 오너이거나 멤버이면 통과 (pending은 불가)
    const superId = process.env.SUPER_ADMIN_USER_ID
    const isSuper = !!superId && superId === authUserId
    if (!isSuper) {
      const [{ data: community }, { data: member }] = await Promise.all([
        supabase.from('communities').select('owner_id').eq('id', communityId).single(),
        supabase.from('community_members').select('role').eq('community_id', communityId).eq('user_id', authUserId).maybeSingle(),
      ])
      const isOwner = community && (community as any).owner_id === authUserId
      const isMember = member && (member as any).role && (member as any).role !== 'pending'
      if (!isOwner && !isMember) {
        return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 })
      }
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


