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
    // Community
    const { data: community, error: commErr } = await supabase
      .from('communities')
      .select('*')
      .eq('slug', slug)
      .single()
    if (commErr || !community) {
      return new Response(JSON.stringify({ error: 'not found' }), { status: 404 })
    }

    // Owner profile
    let ownerProfile: any = null
    try {
      const { data: prof } = await supabase
        .from('profiles')
        .select('id, username, full_name, bio, avatar_url')
        .eq('id', (community as any).owner_id)
        .single()
      ownerProfile = prof || null
    } catch {}

    // Services
    let services: any[] = []
    try {
      const { data } = await supabase
        .from('community_services')
        .select('id,label')
        .eq('community_id', (community as any).id)
        .order('created_at', { ascending: true })
      services = (data || []).map((d: any) => ({ id: d.id, label: d.label }))
    } catch {}

    // Images (table first, fallback R2)
    let images: { key: string; url: string }[] = []
    try {
      const { data: rows } = await supabase
        .from('community_images')
        .select('key, url, is_main, position, created_at')
        .eq('slug', slug)
        .order('is_main', { ascending: false })
        .order('position', { ascending: true, nullsFirst: true })
        .order('created_at', { ascending: true })
        .limit(6)
      if (rows && rows.length > 0) {
        images = rows.map((r: any) => ({ key: r.key as string, url: buildPublicR2UrlForBucket(COMMUNITY_IMAGE_BUCKET, r.key as string) }))
      }
    } catch {}
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
      community: { ...community, profiles: ownerProfile },
      services,
      images,
    }

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'Cache-Control': 'public, max-age=60, s-maxage=60',
      },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'failed to load' }), { status: 500 })
  }
}



