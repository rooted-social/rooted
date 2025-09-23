import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { buildPublicR2UrlForBucket, COMMUNITY_IMAGE_BUCKET } from '@/lib/r2'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  const supabase = await createServerClient()
  try {
    const { data: rows, error } = await supabase
      .from('featured_communities')
      .select('id, position, community_id')
      .order('position', { ascending: true, nullsFirst: true })
      .order('created_at', { ascending: true })
      .limit(10)
    if (error) throw error
    const ids = Array.from(new Set((rows || []).map((r: any) => r.community_id).filter(Boolean)))
    if (ids.length === 0) return new Response(JSON.stringify([]), { status: 200, headers: { 'content-type': 'application/json', 'Cache-Control': 'public, max-age=60, s-maxage=120' } })

    const { data: communities } = await supabase
      .from('communities')
      .select('id, slug, name, description, icon_url, image_url, member_count, category, updated_at')
      .in('id', ids as any)
      .eq('is_disabled', false)

    const byId: Record<string, any> = Object.fromEntries((communities || []).map((c: any) => [c.id, c]))
    const ordered = (rows || [])
      .map((r: any) => byId[r.community_id])
      .filter(Boolean)

    // enrich thumbs
    let enriched = ordered
    try {
      const slugs = (enriched || []).map((c: any) => c.slug).filter(Boolean)
      if (slugs.length > 0) {
        const { data: imgs } = await supabase
          .from('community_images')
          .select('slug, key, is_main, position, created_at')
          .in('slug', slugs)
          .order('is_main', { ascending: false })
          .order('position', { ascending: true, nullsFirst: true })
          .order('created_at', { ascending: true })
        const firstBySlug: Record<string, any> = {}
        for (const r of imgs || []) { const s = (r as any).slug as string; if (!firstBySlug[s]) firstBySlug[s] = r }
        const thumbMap: Record<string, string> = {}
        Object.entries(firstBySlug).forEach(([s, r]: any) => { thumbMap[s] = buildPublicR2UrlForBucket(COMMUNITY_IMAGE_BUCKET, (r as any).key) })
        enriched = ordered.map((c: any) => ({ ...c, thumb_url: thumbMap[c.slug] || c.image_url || c.icon_url || null }))
      }
    } catch {}

    return new Response(JSON.stringify(enriched || []), { status: 200, headers: { 'content-type': 'application/json', 'Cache-Control': 'public, max-age=60, s-maxage=120' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'failed' }), { status: 500 })
  }
}


