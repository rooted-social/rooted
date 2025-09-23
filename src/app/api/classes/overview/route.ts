import { NextRequest } from 'next/server'
import { createServerClientWithAuth } from '@/lib/supabase-server'

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
    // 인증/멤버십 체크 단일 수행
    const { data: { user } } = await supabase.auth.getUser()
    const authUserId = user?.id
    if (!authUserId) {
      return new Response(JSON.stringify({ categories: [], classes: [] }), { status: 401 })
    }
    const [{ data: community }, { data: member }] = await Promise.all([
      supabase.from('communities').select('owner_id').eq('id', communityId).single(),
      supabase.from('community_members').select('role').eq('community_id', communityId).eq('user_id', authUserId).maybeSingle(),
    ])
    const isOwner = community && (community as any).owner_id === authUserId
    const isMember = member && (member as any).role && (member as any).role !== 'pending'
    if (!isOwner && !isMember) {
      return new Response(JSON.stringify({ categories: [], classes: [] }), { status: 403 })
    }

    // 카테고리 + 클래스 목록 병렬 조회
    const [catRes, classRes] = await Promise.all([
      supabase.from('class_categories').select('*').eq('community_id', communityId).order('created_at', { ascending: true }),
      (async () => {
        let q = supabase
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
        const { data: authors } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url, updated_at')
          .in('id', userIds as any)
        authorsMap = Object.fromEntries((authors || []).map((a: any) => [a.id, a]))
      }
    }

    let enrollMap: Record<string, boolean> = {}
    if (userId && list.length > 0) {
      const classIds = list.map(c => c.id)
      const { data: enrolls } = await supabase
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


