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
    const { keys, mainKey } = await req.json()
    if (!Array.isArray(keys) || keys.length === 0) return new Response(JSON.stringify({ error: 'invalid body' }), { status: 400 })
    const supa = createServerClient()
    // position을 키 순서대로 0..n 으로 업데이트
    for (let i = 0; i < keys.length; i++) {
      await supa.from('community_images').update({ position: i }).eq('slug', slug).eq('key', keys[i])
    }
    // 대표 이미지 갱신: 우선 전달된 mainKey가 있으면 그것을, 없으면 첫 번째 키를 대표로 설정
    try {
      const targetMain = (typeof mainKey === 'string' && mainKey) ? mainKey : keys[0]
      if (targetMain) {
        // 모든 이미지를 is_main=false로 초기화 후 대상만 true로 설정
        await supa.from('community_images').update({ is_main: false as any }).eq('slug', slug)
        await supa.from('community_images').update({ is_main: true as any }).eq('slug', slug).eq('key', targetMain)
        // 커뮤니티 테이블의 대표 아이콘/이미지 URL도 동기화 (선택 사항: 첫 이미지 URL을 icon으로 쓰진 않지만, 대표 이미지 URL을 별도 컬럼이 없다면 image_url로 백업)
        try {
          const { data: row } = await supa.from('community_images').select('url').eq('slug', slug).eq('key', targetMain).maybeSingle()
          if (row?.url && owner.communityId) {
            await supa.from('communities').update({ image_url: row.url }).eq('id', owner.communityId)
          }
        } catch {}
      }
    } catch {}
    return new Response(JSON.stringify({ ok: true }))
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'failed' }), { status: 500 })
  }
}


