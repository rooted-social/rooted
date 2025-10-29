import { NextRequest } from 'next/server'
import { createServerClientWithAuth } from '@/lib/supabase-server'
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
    // 인증 및 오너 확인(중앙화)
    const authUserId = await resolveUserId(req)
    if (!authUserId) return new Response(JSON.stringify({}), { status: 401 })
    const superId = process.env.SUPER_ADMIN_USER_ID
    const isSuper = !!superId && superId === authUserId
    const access = await getCommunityAccess(supabase, communityId, authUserId, { superAdmin: isSuper })
    if (!access.isOwner) return new Response(JSON.stringify({}), { status: 403 })

    const { data: basicsRow, error: basicsErr } = await supabase
      .from('communities')
      .select('id, owner_id, name, slug, description, category, image_url, icon_url, is_public, join_policy, plan, member_limit, page_limit')
      .eq('id', communityId)
      .single()
    if (basicsErr) throw basicsErr

    const [settingsRes, servicesRes, pagesCountRes, membersCountRes] = await Promise.all([
      supabase.from('community_settings').select('mission, brand_color, banner_url').eq('community_id', communityId).maybeSingle(),
      supabase.from('community_services').select('id,label').eq('community_id', communityId).order('created_at', { ascending: true }),
      supabase.from('community_pages').select('*', { count: 'exact', head: true }).eq('community_id', communityId),
      supabase.from('community_members').select('*', { count: 'exact', head: true }).eq('community_id', communityId).or('role.is.null,role.neq.pending'),
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
      services: Array.isArray(servicesRes.data) ? servicesRes.data : [],
      plan: {
        key: (basicsRow as any)?.plan || 'starter',
        member_limit: (basicsRow as any)?.member_limit ?? null,
        page_limit: (basicsRow as any)?.page_limit ?? null,
        members_used: (membersCountRes?.count || 0),
        pages_used: (pagesCountRes?.count || 0),
        next_billing_at: null, // Beta: 결제 없음
      },
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


