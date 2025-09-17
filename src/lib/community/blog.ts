import { supabase } from '@/lib/supabase'

export interface BlogPostPayload {
  page_id: string
  title: string
  content: string
  thumbnail_url?: string | null
}

export async function createBlogPost(payload: BlogPostPayload) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인이 필요합니다.')
  try {
    const { data, error } = await supabase
      .from('community_page_blog_posts')
      .insert({ ...payload, user_id: user.id })
      .select('id')
      .single()
    if (error) throw error
    return (data as any)?.id as string
  } catch (err) {
    throw err
  }
}

export async function listBlogPosts(pageId: string) {
  try {
    const { data, error } = await supabase
      .from('community_page_blog_posts')
      .select('id,title,content,thumbnail_url,created_at')
      .eq('page_id', pageId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data || []) as { id: string; title: string; content: string; thumbnail_url: string | null; created_at: string }[]
  } catch {
    return []
  }
}

export async function getBlogPostById(id: string) {
  try {
    const { data, error } = await supabase
      .from('community_page_blog_posts')
      .select('id,title,content,thumbnail_url,created_at')
      .eq('id', id)
      .single()
    if (error) throw error
    return data as { id: string; title: string; content: string; thumbnail_url: string | null; created_at: string }
  } catch (err) {
    return null
  }
}


