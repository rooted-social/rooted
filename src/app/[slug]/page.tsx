import ClientCommunityPage from './ClientPage'
import { Suspense } from 'react'
import { createServerClient } from '@/lib/supabase-server'

export default async function CommunityDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  let initial: any = null
  try {
    const supabase = createServerClient()
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


