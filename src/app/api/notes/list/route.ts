import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const pageId = searchParams.get('pageId')
  if (!pageId) {
    return new Response(JSON.stringify({ error: 'pageId is required' }), { status: 400 })
  }

  const supabase = await createServerClient()

  try {
    // 노트 카테고리와 아이템을 한 번에 로드
    const [catRes, itemRes] = await Promise.all([
      supabase
        .from('community_page_note_categories')
        .select('id,title,position')
        .eq('page_id', pageId)
        .order('position', { ascending: true }),
      supabase
        .from('community_page_note_items')
        .select('id,category_id,title,content,created_at,user_id')
        .eq('page_id', pageId)
        .order('created_at', { ascending: false }),
    ])

    const categories = (catRes.data || []) as any[]
    const items = (itemRes.data || []) as any[]
    const userIds = Array.from(new Set(items.map(i => i.user_id).filter(Boolean)))

    // 작성자 프로필
    let profileMap: Record<string, any> = {}
    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, updated_at')
        .in('id', userIds)
      profileMap = Object.fromEntries((profs || []).map((p: any) => [p.id, p]))
    }

    const payload = {
      categories,
      items: items.map(i => ({ ...i, author: i.user_id ? profileMap[i.user_id] || null : null })),
    }

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'Cache-Control': 'public, max-age=60, s-maxage=60',
      },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'failed to load notes list' }), { status: 500 })
  }
}


