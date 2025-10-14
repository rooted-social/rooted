import { readUserIdFromAssertion } from '@/lib/auth/session'
import { createServerClient, createServerClientWithAuth } from '@/lib/supabase-server'

// 서버 공통 사용자 식별 유틸
// 우선순위: SSA 쿠키 → Authorization Bearer → Supabase cookies()
export async function resolveUserId(req?: Request): Promise<string | null> {
  const ssa = await readUserIdFromAssertion()
  if (ssa) return ssa

  // Authorization 헤더가 있으면 토큰에서 sub 추출 시도(네트워크 없이)
  try {
    const auth = (req as any)?.headers?.get?.('authorization') as string | undefined
    const bearer = auth && auth.startsWith('Bearer ') ? auth.slice(7) : undefined
    if (bearer) {
      const [, payloadB64] = bearer.split('.')
      if (payloadB64) {
        const json = Buffer.from(payloadB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
        const payload = JSON.parse(json)
        const sub = typeof payload?.sub === 'string' ? payload.sub : null
        if (sub) return sub
      }
      // sub가 없으면 Supabase 클라이언트로 폴백
      const sb = await createServerClientWithAuth(bearer)
      const { data: { user } } = await sb.auth.getUser()
      return user?.id || null
    }
  } catch {}

  // 최후 폴백: 서버 쿠키 기반 supabase
  try {
    const sb = await createServerClient()
    const { data: { user } } = await sb.auth.getUser()
    return user?.id || null
  } catch {
    return null
  }
}


