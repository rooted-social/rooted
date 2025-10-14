import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { r2Client, ListObjectsV2Command, buildPublicR2UrlForBucket, COMMUNITY_IMAGE_BUCKET } from '@/lib/r2'
import { createAdminClient } from '@/lib/supabase-admin'
import { resolveUserId } from '@/lib/auth/user'
import { getCommunityAccess } from '@/lib/community/access'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')
  if (!slug) {
    return new Response(JSON.stringify({ error: 'slug is required' }), { status: 400 })
  }

  const supabase = await createServerClient()

  try {
    // 1) 슬러그로 커뮤니티 조회 (단일 쿼리)
    const { data: community, error: commErr } = await supabase
      .from('communities')
      // 최초 접근 성능을 유지하되, 소개 및 가입정책은 초기 렌더에 필요하므로 포함
      .select('id, name, description, slug, category, image_url, icon_url, owner_id, join_policy, created_at, updated_at')
      .eq('slug', slug)
      .single()
    if (commErr || !community) {
      return new Response(JSON.stringify({ error: 'not found' }), { status: 404 })
    }

    // 2) 나머지 의존 쿼리들을 병렬 실행 (프로필/서비스/이미지/멤버십/통계)
    const [ownerProfileRes, servicesRes, imagesRows, membership, stats] = await Promise.all([
      (async () => {
        try {
          const { data } = await supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url')
            .eq('id', (community as any).owner_id)
            .single()
          return data || null
        } catch {
          return null
        }
      })(),
      (async () => {
        try {
          const { data } = await supabase
            .from('community_services')
            .select('id,label')
            .eq('community_id', (community as any).id)
            .order('created_at', { ascending: true })
          return (data || []).map((d: any) => ({ id: d.id, label: d.label }))
        } catch {
          return []
        }
      })(),
      (async () => {
        try {
          const { data: rows } = await supabase
            .from('community_images')
            .select('key, url, is_main, position, created_at')
            .eq('slug', slug)
            .order('is_main', { ascending: false })
            .order('position', { ascending: true, nullsFirst: true })
            .order('created_at', { ascending: true })
            .limit(6)
          return rows || []
        } catch {
          return []
        }
      })(),
      (async () => {
        try {
          let userId = await resolveUserId(req)
          let access: any = null
          if (userId) {
            access = await getCommunityAccess(supabase, (community as any).id, userId, { superAdmin: false })
          } else {
            // Fallback: 클라이언트가 x-user-id를 전달한 경우(쿠키 세션 동기화 전)
            const headerUid = req.headers.get('x-user-id') || undefined
            if (headerUid) {
              const admin = createAdminClient()
              access = await getCommunityAccess(admin as any, (community as any).id, headerUid, { superAdmin: false })
            }
          }
          const role = access?.role as string | undefined
          return role ? { role } : null
        } catch {
          return null
        }
      })(),
      (async () => {
        // 통계 경량화: 멤버 수만 계산 (게시글/클래스/댓글 카운트 제거)
        try {
          const communityId = (community as any).id
          const { count } = await supabase
            .from('community_members')
            .select('*', { count: 'exact', head: true })
            .eq('community_id', communityId)
            .or('role.is.null,role.neq.pending')
          return { memberCount: count || 0 }
        } catch {
          return { memberCount: 0 }
        }
      })(),
    ])

    let images = (imagesRows || []).map((r: any) => ({ key: r.key as string, url: buildPublicR2UrlForBucket(COMMUNITY_IMAGE_BUCKET, r.key as string) }))

    // 3) 이미지가 비어있으면 R2를 폴백으로 조회
    if (images.length === 0) {
      try {
        const prefix = `${slug}/`
        const list = await r2Client.send(new ListObjectsV2Command({ Bucket: COMMUNITY_IMAGE_BUCKET, Prefix: prefix, MaxKeys: 6 }))
        images = (list.Contents || [])
          .filter(obj => !!obj.Key && !obj.Key.endsWith('/'))
          .slice(0, 6)
          .map(obj => ({ key: obj.Key as string, url: buildPublicR2UrlForBucket(COMMUNITY_IMAGE_BUCKET, obj.Key as string) }))
      } catch {}
    }

    const payload = {
      community: { ...community, profiles: ownerProfileRes },
      services: servicesRes,
      images,
      membership,
      stats,
    }

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        // 캐시 정책 미세 조정: 에지 5분, 브라우저 60초, 변경 시 stale-while-revalidate
        'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
      },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'failed to load' }), { status: 500 })
  }
}



