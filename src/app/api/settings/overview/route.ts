import { NextRequest } from 'next/server'
import { createServerClientWithAuth } from '@/lib/supabase-server'

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
    // 인증 및 오너 확인
    const { data: { user } } = await supabase.auth.getUser()
    const authUserId = user?.id
    if (!authUserId) return new Response(JSON.stringify({}), { status: 401 })

    const { data: basicsRow, error: basicsErr } = await supabase
      .from('communities')
      .select('id, owner_id, name, slug, description, category, image_url, icon_url, is_public, join_policy')
      .eq('id', communityId)
      .single()
    if (basicsErr) throw basicsErr

    const isOwner = (basicsRow as any)?.owner_id === authUserId
    if (!isOwner) return new Response(JSON.stringify({}), { status: 403 })

    const [settingsRes, noticesRes, servicesRes] = await Promise.all([
      supabase.from('community_settings').select('mission, brand_color, banner_url').eq('community_id', communityId).maybeSingle(),
      // 공지 섹션은 제거되었지만, 호환을 위해 데이터는 반환
      supabase.from('notices').select('id,title,content,created_at').eq('community_id', communityId).order('created_at', { ascending: false }),
      supabase.from('community_services').select('id,label').eq('community_id', communityId).order('created_at', { ascending: true }),
    ])

    const payload = {
      basics: {
        name: (basicsRow as any)?.name || '',
        slug: (basicsRow as any)?.slug || '',
        description: (basicsRow as any)?.description || '',
        category: (basicsRow as any)?.category || '',
        image_url: (basicsRow as any)?.image_url || null,
        icon_url: (basicsRow as any)?.icon_url || null,
        is_public: (basicsRow as any)?.is_public ?? true,
        join_policy: (basicsRow as any)?.join_policy || 'free',
      },
      settings: settingsRes.data || null,
      notices: Array.isArray(noticesRes.data) ? noticesRes.data : [],
      services: Array.isArray(servicesRes.data) ? servicesRes.data : [],
    }

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'Cache-Control': 'private, max-age=30, s-maxage=30',
      }
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'failed to load settings overview' }), { status: 500 })
  }
}


