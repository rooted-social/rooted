import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

async function assertOwner(req: NextRequest, slug: string) {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
  const { data: { user } } = await sb.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { data: comm } = await sb.from('communities').select('id, owner_id').eq('slug', slug).maybeSingle()
  const ownerId = (comm as any)?.owner_id || null
  if (!ownerId || ownerId !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  return { userId: user.id as string, communityId: (comm as any)?.id as string | null }
}

export async function POST(req: NextRequest, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params
    const owner = await assertOwner(req, slug)
    if (owner instanceof NextResponse) return owner as any
    const { keys } = await req.json()
    if (!Array.isArray(keys) || keys.length === 0) return new Response(JSON.stringify({ error: 'invalid body' }), { status: 400 })
    const supa = createServerClient()
    // position을 키 순서대로 0..n 으로 업데이트
    for (let i = 0; i < keys.length; i++) {
      await supa.from('community_images').update({ position: i }).eq('slug', slug).eq('key', keys[i])
    }
    return new Response(JSON.stringify({ ok: true }))
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'failed' }), { status: 500 })
  }
}


