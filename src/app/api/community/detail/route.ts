import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { r2Client, ListObjectsV2Command, buildPublicR2UrlForBucket, COMMUNITY_IMAGE_BUCKET } from '@/lib/r2'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')
  if (!slug) {
    return new Response(JSON.stringify({ error: 'slug is required' }), { status: 400 })
  }

  const supabase = createServerClient()

  try {
    // 1) 슬러그로 커뮤니티 조회 (단일 쿼리)
    const { data: community, error: commErr } = await supabase
      .from('communities')
      .select('*')
      .eq('slug', slug)
      .single()
    if (commErr || !community) {
      return new Response(JSON.stringify({ error: 'not found' }), { status: 404 })
    }

    // 2) 나머지 의존 쿼리들을 병렬 실행
    const [ownerProfileRes, servicesRes, imagesRows, membership] = await Promise.all([
      (async () => {
        try {
          const { data } = await supabase
            .from('profiles')
            .select('id, username, full_name, bio, avatar_url')
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
          // 클라이언트 세션 없이도 멤버십을 판단할 수 있도록, 헤더에 user-id가 설정되어 있으면 사용
          const userId = req.headers.get('x-user-id')
          if (!userId) return null
          const { data } = await supabase
            .from('community_members')
            .select('role')
            .eq('community_id', (community as any).id)
            .eq('user_id', userId)
            .maybeSingle()
          return data || null
        } catch {
          return null
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
    }

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        // 60초 캐시 (브라우저/에지)
        'Cache-Control': 'public, max-age=60, s-maxage=60',
      },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'failed to load' }), { status: 500 })
  }
}



