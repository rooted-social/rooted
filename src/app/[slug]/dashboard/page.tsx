import ClientDashboardPage from '@/components/dashboard/ClientDashboardPage'
import { createServerClient } from '@/lib/supabase-server'
import type { Metadata } from 'next'

export default async function CommunityDashboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  const base = process.env.NEXT_PUBLIC_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

  let community: any = null
  let pages: any[] = []
  let home: any = null
  try {
    // 커뮤니티 식별 (id, name 등 최소 필드)
    const { data: c } = await supabase.from('communities').select('id, name, slug, icon_url, image_url, owner_id, is_disabled, disabled_reason').eq('slug', slug).single()
    community = c || null
  } catch {}
  try {
    if (community?.id) {
      const headers = session?.access_token ? { authorization: `Bearer ${session.access_token}` } : undefined
      const homeRes = await fetch(`${base}/api/dashboard/home?communityId=${encodeURIComponent(community.id)}`, { headers, next: { revalidate: 60 } })
      if (homeRes.ok) {
        home = await homeRes.json()
        pages = Array.isArray(home?.pages) ? home.pages : []
      }
    }
  } catch {}

  const initial = { community, pages, home }
  return <ClientDashboardPage slug={slug} initial={initial} />
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  try {
    const supabase = await createServerClient()
    const { data } = await supabase.from('communities').select('name').eq('slug', slug).single()
    const title = (data as any)?.name || slug
    return { title }
  } catch {
    return { title: slug }
  }
}

