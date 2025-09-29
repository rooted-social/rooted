import type { Metadata } from 'next'
import { createServerClient } from '@/lib/supabase-server'

export default function BlogDetailLayout({ children }: { children: React.ReactNode }) {
  return children as any
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string; id: string }> }): Promise<Metadata> {
  const { slug, id } = await params
  const site = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  try {
    const supabase = await createServerClient()
    const { data: post } = await supabase
      .from('community_page_blog_posts')
      .select('title,thumbnail_url,page_id,created_at')
      .eq('id', id)
      .maybeSingle()

    const title = (post as any)?.title || '블로그 포스트'
    const description = (post as any)?.title || undefined
    const image = (post as any)?.thumbnail_url || '/logos/thumbnail.png'
    const url = `${site}/${slug}/blog/${id}`

    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: {
        type: 'article',
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
    const url = `${site}/${slug}/blog/${id}`
    return { title: '블로그 포스트', alternates: { canonical: url }, openGraph: { url } }
  }
}


