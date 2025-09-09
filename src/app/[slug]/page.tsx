import ClientCommunityPage from './ClientPage'
import { Suspense } from 'react'

interface Params { params: { slug: string } }

export default async function CommunityDetailPage({ params }: Params) {
  const slug = params.slug
  let initial: any = null
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/community/detail?slug=${encodeURIComponent(slug)}`, { next: { revalidate: 60 } })
    if (res.ok) initial = await res.json()
  } catch {}
  return (
    <Suspense>
      <ClientCommunityPage initial={initial || undefined} />
    </Suspense>
  )
}


