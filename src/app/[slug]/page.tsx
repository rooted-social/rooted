import ClientCommunityPage from './ClientPage'
import { Suspense } from 'react'

export default async function CommunityDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  let initial: any = null
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
    const res = await fetch(`${base}/api/community/detail?slug=${encodeURIComponent(slug)}`, { next: { revalidate: 60 } })
    if (res.ok) initial = await res.json()
  } catch {}
  return (
    <Suspense>
      <ClientCommunityPage initial={initial || undefined} />
    </Suspense>
  )
}


