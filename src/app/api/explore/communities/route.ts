import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { buildPublicR2UrlForBucket, COMMUNITY_IMAGE_BUCKET } from '@/lib/r2'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search')
  const category = searchParams.get('category')
  const limitParam = searchParams.get('limit')
  const sort = searchParams.get('sort') // 'popular' | 'newest'

  const supabase = createServerClient()

  try {
    let q = supabase.from('communities').select('*').eq('is_disabled', false)
    // 정렬: 인기순(member_count desc) 또는 최신순(created_at desc)
    if (sort === 'popular') {
      // member_count 내림차순, null은 뒤로
      q = q.order('member_count', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false })
    } else {
      q = q.order('created_at', { ascending: false })
    }
    if (category && category !== '전체') q = q.eq('category', category)
    if (search) q = q.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    if (limitParam) {
      const l = Math.max(1, Math.min(100, Number(limitParam) || 0))
      if (l) q = q.limit(l)
    }
    const { data, error } = await q
    if (error) throw error

    // 대표 이미지(썸네일) 매핑 구성: is_main=true 우선, 없으면 position/created_at 기준 첫 항목
    let enriched = data || []
    try {
      const slugs = (enriched || []).map((c: any) => c.slug).filter(Boolean)
      if (slugs.length > 0) {
        const { data: rows } = await supabase
          .from('community_images')
          .select('slug, key, url, is_main, position, created_at')
          .in('slug', slugs)
          .order('is_main', { ascending: false })
          .order('position', { ascending: true, nullsFirst: true })
          .order('created_at', { ascending: true })
        const firstBySlug: Record<string, any> = {}
        for (const r of rows || []) {
          const s = (r as any).slug as string
          if (!firstBySlug[s]) firstBySlug[s] = r
        }
        const thumbMap: Record<string, string> = {}
        Object.entries(firstBySlug).forEach(([s, r]: any) => {
          const key = r.key as string
          thumbMap[s] = buildPublicR2UrlForBucket(COMMUNITY_IMAGE_BUCKET, key)
        })
        enriched = enriched.map((c: any) => ({
          ...c,
          thumb_url: thumbMap[c.slug] || c.image_url || c.icon_url || null,
        }))
      }
    } catch {}

    return new Response(JSON.stringify(enriched || []), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        // CDN 캐시 강화: 인기 섹션은 60초간 캐시, ISR 유사 효과
        'Cache-Control': 'public, max-age=60, s-maxage=120',
      },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'failed to load communities' }), { status: 500 })
  }
}


