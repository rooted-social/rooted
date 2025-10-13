import type { Metadata } from 'next'
import { createServerClient } from '@/lib/supabase-server'

export default function CalendarLayout({ children }: { children: React.ReactNode }) {
  return children
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  try {
    const supabase = await createServerClient()
    const { data } = await supabase.from('communities').select('name').eq('slug', slug).single()
    const base = (data as any)?.name || slug
    return { title: `${base} - 캘린더` }
  } catch {
    return { title: `${slug} - 캘린더` }
  }
}


