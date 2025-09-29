import ClientCommunityPage from './ClientPage'
import { Suspense } from 'react'
import { createServerClient } from '@/lib/supabase-server'
import type { Metadata } from 'next'

export default async function CommunityDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  let initial: any = null
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    const base = process.env.NEXT_PUBLIC_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
    const res = await fetch(`${base}/api/community/detail?slug=${encodeURIComponent(slug)}`, {
      // 서버 렌더링 시 membership까지 함께 계산되도록 사용자 ID 전달
      headers: user?.id ? { 'x-user-id': user.id } : undefined,
      next: { revalidate: 120 },
    })
    if (res.ok) initial = await res.json()
  } catch {}
  return (
    <Suspense>
      <ClientCommunityPage initial={initial || undefined} />
    </Suspense>
  )
}


export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const site = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  try {
    const supabase = await createServerClient()
    const { data: community } = await supabase
      .from('communities')
      .select('id,name,icon_url,image_url')
      .eq('slug', slug)
      .maybeSingle()

    let title = (community as any)?.name || slug
    let description: string | undefined = undefined
    let image: string | undefined = (community as any)?.image_url || (community as any)?.icon_url || '/logos/thumbnail.png'

    if ((community as any)?.id) {
      try {
        const { data: settings } = await supabase
          .from('community_settings')
          .select('banner_url, mission')
          .eq('community_id', (community as any).id)
          .maybeSingle()
        if ((settings as any)?.mission) description = (settings as any).mission as string
        if ((settings as any)?.banner_url) image = (settings as any).banner_url as string
      } catch {}
    }

    const url = `${site}/${slug}`
    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: {
        type: 'website',
        url,
        title,
        description,
        images: image ? [{ url: image, width: 1200, height: 630 }] : undefined,
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: image ? [image] : undefined,
      },
    }
  } catch {
    const url = `${site}/${slug}`
    return { title: slug, alternates: { canonical: url }, openGraph: { url } }
  }
}

