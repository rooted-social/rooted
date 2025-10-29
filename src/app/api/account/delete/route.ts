import { NextRequest, NextResponse } from 'next/server'
import { createServerClientWithAuth } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  try {
    const { confirm } = await req.json().catch(() => ({}))
    if (confirm !== '탈퇴하기') {
      return NextResponse.json({ error: "확인을 위해 '탈퇴하기'를 입력해 주세요." }, { status: 400 })
    }
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || ''
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined
    const supa = await createServerClientWithAuth(bearer)
    const { data: { user } } = await supa.auth.getUser()
    if (!user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    // 운영 중인 커뮤니티가 있는지 검사: 있으면 탈퇴 차단
    const { count, error: ownErr } = await admin
      .from('communities')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', user.id)
    if (ownErr) {
      // 소유 커뮤니티 확인 실패 시에도 안전하게 차단
      return NextResponse.json({ error: '운영 중인 루트 보유 여부 확인에 실패했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 500 })
    }
    const hasOwned = ((count as number | null) || 0) > 0
    if (hasOwned) {
      return NextResponse.json({ error: '운영 중인 루트가 있어 탈퇴할 수 없습니다. 소유한 루트를 삭제하거나 소유권을 이전해 주세요.' }, { status: 400 })
    }

    // 관련 레코드 정리 (필요 최소한): 커뮤니티 멤버십, 프로필
    try { await admin.from('community_members').delete().eq('user_id', user.id) } catch {}
    try { await admin.from('profiles').delete().eq('id', user.id) } catch {}

    // Auth 사용자 삭제 (Service Role 필요)
    try { await admin.auth.admin.deleteUser(user.id) } catch {}

    // 쿠키는 클라이언트에서 /api/auth/clear를 호출해 정리
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}


