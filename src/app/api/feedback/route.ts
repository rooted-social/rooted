import { NextRequest } from 'next/server'
import { createServerClientWithAuth } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || ''
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined
  const supabase = await createServerClientWithAuth(bearer)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })

  const body = await req.json().catch(() => ({})) as { title?: string; category?: 'ops'|'feature'|'general'|'billing'; content?: string }
  const title = (body.title || '').trim()
  const category = body.category
  const content = (body.content || '').trim()
  if (!title || !category || !content) return new Response(JSON.stringify({ error: 'invalid' }), { status: 400 })

  const { error } = await supabase.from('feedbacks').insert({
    title,
    category,
    content,
    user_id: user.id,
    user_email: user.email,
  } as any)
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  return new Response(JSON.stringify({ success: true }), { status: 200 })
}


