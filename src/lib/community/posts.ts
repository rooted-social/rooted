import { supabase, getUserId } from '@/lib/supabase'
import { getProfilesCached } from '@/lib/community-utils'
import { Post, Comment } from '@/types/community'

// 게시글 목록
export async function getPosts(communityId: string, opts?: { pageId?: string | null }) {
  try {
    const buildQuery = (withPageFilter: boolean) => {
      let q = supabase
        .from('posts')
        .select('*')
        .eq('community_id', communityId)
        .order('created_at', { ascending: false })
      if (withPageFilter && opts?.pageId !== undefined) {
        if (opts.pageId === null) q = q.is('page_id', null)
        else q = q.eq('page_id', opts.pageId)
      }
      return q
    }

    let posts: any[] | null = null
    let { data, error } = await buildQuery(true)

    if (error) {
      const msg = (error as any)?.message?.toLowerCase?.() || ''
      const details = (error as any)?.details?.toLowerCase?.() || ''
      const causedByPageId = msg.includes('page_id') || details.includes('page_id')
      if (causedByPageId) {
        const retryRes = await buildQuery(false)
        if (retryRes.error) throw retryRes.error
        posts = retryRes.data as any[]
      } else {
        throw error
      }
    } else {
      posts = data as any[]
    }

    const userIds = Array.from(new Set((posts || []).map(p => p.user_id)))
    const profileMap = userIds.length > 0 ? await getProfilesCached(userIds) : {}

    return (posts || []).map((p: any) => ({ ...p, author: profileMap[p.user_id] })) as Post[]
  } catch (error) {
    return []
  }
}

export async function incrementPostViews(postId: string) {
  try {
    const { data, error } = await supabase.rpc('increment_post_views', { pid: postId })
    if (error) throw error
    return data as number | null
  } catch {
    try {
      const { data, error } = await supabase
        .from('posts')
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
}

export async function createPost(payload: Omit<Post, 'id' | 'created_at' | 'updated_at' | 'comment_count' | 'author' | 'user_id'>) {
  const uid = await getUserId()
  if (!uid) throw new Error('로그인이 필요합니다.')
  try {
    const { data, error } = await supabase
      .from('posts')
      .insert({ ...payload, user_id: uid })
      .select()
      .single()
    if (error) throw error
    return data as Post
  } catch (err: any) {
    const { page_id, ...rest } = (payload as any) || {}
    const { data, error } = await supabase
      .from('posts')
      .insert({ ...rest, user_id: uid })
      .select()
      .single()
    if (error) throw err || error
    return data as Post
  }
}

export async function updatePost(id: string, updates: Partial<Post>) {
  const { data, error } = await supabase
    .from('posts')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Post
}

export async function deletePost(id: string) {
  const { error } = await supabase.from('posts').delete().eq('id', id)
  if (error) throw error
  return true
}

// 댓글
export async function getComments(postId: string) {
  try {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
    if (error) throw error
    const comments = (data || []) as any[]
    const userIds = Array.from(new Set(comments.map(c => c.user_id)))
    let profileMap: Record<string, any> = {}
    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .in('id', userIds)
      profileMap = Object.fromEntries((profs || []).map((p: any) => [p.id, p]))
    }
    return comments.map((c: any) => ({
      id: c.id,
      post_id: c.post_id,
      user_id: c.user_id,
      content: c.content,
      created_at: c.created_at,
      updated_at: c.updated_at,
      author: profileMap[c.user_id],
    })) as Comment[]
  } catch {
    return []
  }
}

export async function createComment(payload: Omit<Comment, 'id' | 'created_at' | 'updated_at' | 'author' | 'user_id'>) {
  const uid = await getUserId()
  if (!uid) throw new Error('로그인이 필요합니다.')
  const { data, error } = await supabase
    .from('comments')
    .insert({ ...payload, user_id: uid })
    .select()
    .single()
  if (error) throw error
  return data as Comment
}

export async function updateComment(id: string, updates: Partial<Comment>) {
  const { data, error } = await supabase
    .from('comments')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Comment
}

export async function deleteComment(id: string) {
  const { error } = await supabase.from('comments').delete().eq('id', id)
  if (error) throw error
  return true
}


