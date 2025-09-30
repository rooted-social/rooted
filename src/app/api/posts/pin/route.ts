import { NextRequest } from 'next/server'
import { createServerClientWithAuth } from '@/lib/supabase-server'

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const postId = body?.postId as string | undefined
    const pinned = !!body?.pinned
    if (!postId) return new Response(JSON.stringify({ error: 'postId is required' }), { status: 400 })

    const authHeader = req.headers.get('authorization') || ''
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined
    const supabase = await createServerClientWithAuth(bearer)

    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id
    if (!userId) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })

    const { data: post } = await supabase.from('posts').select('id, community_id').eq('id', postId).maybeSingle()
    if (!post) return new Response(JSON.stringify({ error: 'not found' }), { status: 404 })

    const { data: community } = await supabase.from('communities').select('owner_id').eq('id', (post as any).community_id).single()
    const isOwner = (community as any)?.owner_id === userId
    if (!isOwner) return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 })

    const { data: updated, error } = await supabase
      .from('posts')
      .update({ pinned })
      .eq('id', postId)
      .select('id, pinned')
      .single()
    if (error) throw error

    return new Response(JSON.stringify(updated), { status: 200, headers: { 'content-type': 'application/json' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'failed to toggle pin' }), { status: 500 })
  }
}


