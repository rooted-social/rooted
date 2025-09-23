import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase-server'

function decodeJwtSub(token: string | undefined | null): string | null {
  if (!token) return null
  try {
    const [, payloadB64] = token.split('.')
    if (!payloadB64) return null
    const json = Buffer.from(payloadB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    const payload = JSON.parse(json)
    return typeof payload?.sub === 'string' ? payload.sub : null
  } catch {
    return null
  }
}

// 서버 컴포넌트/라우트 핸들러에서 호출하여 슈퍼 어드민만 통과시키는 가드
export async function assertSuperAdminOrNotFound() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const superId = process.env.SUPER_ADMIN_USER_ID
  // Next 15에서 cookies()가 Promise로 노출되는 환경을 대비 (양쪽 호환)
  const cookieMaybePromise = cookies() as any
  const cookieStore = (typeof cookieMaybePromise?.get === 'function') ? cookieMaybePromise : await cookieMaybePromise
  const sbToken = cookieStore?.get?.('sb-access-token')?.value
  const cookieSub = decodeJwtSub(sbToken)
  const authUserId = user?.id || cookieSub
  const isSuper = !!authUserId && !!superId && authUserId === superId
  if (!isSuper) notFound()
  return { userId: authUserId! }
}

// API 라우트에서 사용할 404 JSON 가드
export async function requireSuperAdminOr404JSON() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const superId = process.env.SUPER_ADMIN_USER_ID
  // Next 15에서 cookies()가 Promise로 노출되는 환경을 대비 (양쪽 호환)
  const cookieMaybePromise = cookies() as any
  const cookieStore = (typeof cookieMaybePromise?.get === 'function') ? cookieMaybePromise : await cookieMaybePromise
  const sbToken = cookieStore?.get?.('sb-access-token')?.value
  const cookieSub = decodeJwtSub(sbToken)
  const authUserId = user?.id || cookieSub
  const isSuper = !!authUserId && !!superId && authUserId === superId
  if (!isSuper) {
    return { ok: false as const, response: new Response(JSON.stringify({ error: 'not found' }), { status: 404 }) }
  }
  return { ok: true as const, userId: authUserId! }
}


