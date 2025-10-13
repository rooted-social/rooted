import type { Metadata } from 'next'
import { createServerClient } from '@/lib/supabase-server'

export default function MembersLayout({ children }: { children: React.ReactNode }) {
  return children
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  try {
    const supabase = await createServerClient()
    const { data } = await supabase.from('communities').select('name').eq('slug', slug).single()
    const base = (data as any)?.name || slug
    return { title: `${base} - 멤버` }
  } catch {
    return { title: `${slug} - 멤버` }
  }
}


