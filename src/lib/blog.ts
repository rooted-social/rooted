import { supabase, getUserId } from '@/lib/supabase'

export type BlogListItem = { 
  id: string; 
  title: string; 
  content: string; 
  thumbnail_url: string | null; 
  created_at: string;
  user_id: string | null;
  author?: {
    id: string;
    full_name: string | null;
    username: string;
    avatar_url: string | null;
    updated_at: string | null;
  } | null;
}

export async function listBlogPosts(pageId: string): Promise<BlogListItem[]> {
  try {
    // 먼저 기본 블로그 포스트 정보 가져오기
    const { data: posts, error: postsError } = await supabase
      .from('community_page_blog_posts')
      .select('id,title,content,thumbnail_url,created_at,user_id')
      .eq('page_id', pageId)
      .order('created_at', { ascending: false })
    
    if (postsError) {
      console.error('Blog posts load error:', postsError)
      return []
    }

    if (!posts || posts.length === 0) {
      return []
    }

    // 작성자 ID들 수집 (중복 제거)
    const userIds = [...new Set(posts.map(post => post.user_id).filter(Boolean))]
    
    // 작성자 정보 별도로 가져오기
    let authorsMap: { [key: string]: any } = {}
    if (userIds.length > 0) {
      try {
        const { data: authors, error: authorsError } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url, updated_at')
          .in('id', userIds)
        
        if (authorsError) {
          console.warn('Authors load error:', authorsError)
        } else if (authors) {
          authors.forEach(author => {
            authorsMap[author.id] = author
          })
        }
      } catch (authorError) {
        console.warn('Failed to load authors:', authorError)
      }
    }

    // 블로그 포스트와 작성자 정보 결합
    return posts.map(post => ({
      ...post,
      author: post.user_id ? authorsMap[post.user_id] || null : null
    })) as BlogListItem[]
    
  } catch (error) {
    console.error('listBlogPosts error:', error)
    return []
  }
}

export async function getBlogPostById(id: string) {
  try {
    // 먼저 블로그 포스트 기본 정보 가져오기
    const { data: post, error: postError } = await supabase
      .from('community_page_blog_posts')
      .select('id,title,content,thumbnail_url,page_id,created_at,user_id')
      .eq('id', id)
      .single()
    
    if (postError) throw postError
    if (!post) return null

    // 작성자 정보 별도로 가져오기
    let author = null
    if (post.user_id) {
      try {
        const { data: authorData, error: authorError } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url, updated_at')
          .eq('id', post.user_id)
          .single()
        
        if (!authorError && authorData) {
          author = authorData
        }
      } catch (authorError) {
        console.warn('Failed to load author for blog post:', authorError)
      }
    }

    return {
      ...post,
      author
    } as { 
      id: string; 
      title: string; 
      content: string; 
      thumbnail_url: string | null; 
      page_id: string; 
      created_at: string;
      user_id: string | null;
      author?: {
        id: string;
        full_name: string | null;
        username: string;
        avatar_url: string | null;
        updated_at: string | null;
      } | null;
    }
  } catch (error) {
    console.error('getBlogPostById error:', error)
    return null
  }
}

export async function createBlogPost(payload: { page_id: string; title: string; content: string; thumbnail_url?: string | null }) {
  const uid = await getUserId()
  if (!uid) throw new Error('로그인이 필요합니다.')
  const { data, error } = await supabase
    .from('community_page_blog_posts')
    .insert({ ...payload, user_id: uid })
    .select('id')
    .single()
  if (error) throw error
  return (data as any)?.id as string
}

export async function getBlogCounts(postId: string): Promise<{ views: number; likes: number; comments: number }> {
  try {
    const [viewsRes, likesRes, commentsRes] = await Promise.all([
      supabase.from('community_page_blog_posts').select('views').eq('id', postId).single(),
      supabase.from('community_page_blog_likes').select('*', { count: 'exact', head: true }).eq('post_id', postId),
      supabase.from('community_page_blog_comments').select('*', { count: 'exact', head: true }).eq('post_id', postId),
    ])
    const views = (viewsRes.data as any)?.views || 0
    return { views, likes: likesRes.count || 0, comments: commentsRes.count || 0 }
  } catch {
    return { views: 0, likes: 0, comments: 0 }
  }
}

export async function incrementBlogViews(postId: string) {
  try {
    const { data, error } = await supabase
      .from('community_page_blog_posts')
      .update({ views: (null as any) })
      .eq('id', postId)
      .select('views')
      .single()
    if (error) throw error
    return (data as any)?.views ?? null
  } catch {
    return null
  }
}

export async function hasLikedBlog(postId: string) {
  const uid = await getUserId()
  if (!uid) return false
  const { data } = await supabase
    .from('community_page_blog_likes')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', uid)
    .maybeSingle()
  return !!data
}

export async function toggleBlogLike(postId: string) {
  const uid = await getUserId()
  if (!uid) throw new Error('로그인이 필요합니다.')
  const { data: existing } = await supabase
    .from('community_page_blog_likes')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', uid)
    .maybeSingle()
  if (existing) {
    await supabase.from('community_page_blog_likes').delete().eq('id', existing.id)
    return { liked: false }
  }
  await supabase.from('community_page_blog_likes').insert({ post_id: postId, user_id: uid })
  return { liked: true }
}

export async function listBlogComments(postId: string) {
  try {
    const { data, error } = await supabase
      .from('community_page_blog_comments')
      .select('id, post_id, user_id, content, created_at')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
    if (error) throw error
    const rows = (data || []) as any[]
    const userIds = Array.from(new Set(rows.map(r => r.user_id)))
    let profileMap: Record<string, any> = {}
    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .in('id', userIds)
      profileMap = Object.fromEntries((profs || []).map((p: any) => [p.id, p]))
    }
    return rows.map(r => ({ ...r, author: profileMap[r.user_id] }))
  } catch {
    return []
  }
}

export async function addBlogComment(postId: string, content: string) {
  const uid = await getUserId()
  if (!uid) throw new Error('로그인이 필요합니다.')
  const { data, error } = await supabase
    .from('community_page_blog_comments')
    .insert({ post_id: postId, user_id: uid, content })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateBlogComment(id: string, content: string) {
  const { data, error } = await supabase
    .from('community_page_blog_comments')
    .update({ content })
    .eq('id', id)
    .select('id')
    .single()
  if (error) throw error
  return (data as any)?.id as string
}

export async function deleteBlogComment(id: string) {
  const { error } = await supabase
    .from('community_page_blog_comments')
    .delete()
    .eq('id', id)
  if (error) throw error
  return true
}

export async function updateBlogPost(id: string, updates: { title?: string; content?: string; thumbnail_url?: string | null }) {
  try {
    const { data, error } = await supabase
      .from('community_page_blog_posts')
      .update(updates)
      .eq('id', id)
      .select('id')
      .single()
    if (error) throw error
    return (data as any)?.id as string
  } catch (err: any) {
    // 컬럼 유무가 다른 오래된 스키마 폴백: 썸네일 컬럼이 없을 수 있음
    const safe = { ...updates } as any
    if (err?.message?.toLowerCase?.().includes('thumbnail_url')) delete safe.thumbnail_url
    const { data, error } = await supabase
      .from('community_page_blog_posts')
      .update(safe)
      .eq('id', id)
      .select('id')
      .single()
    if (error) throw err || error
    return (data as any)?.id as string
  }
}

export async function deleteBlogPost(id: string) {
  const { error } = await supabase
    .from('community_page_blog_posts')
    .delete()
    .eq('id', id)
  if (error) throw error
  return true
}


