import { NextRequest, NextResponse } from 'next/server'
import { setAssertionCookie } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { access_token, refresh_token } = await req.json()
    if (!access_token || !refresh_token) {
      return new Response(JSON.stringify({ error: 'access_token and refresh_token are required' }), { status: 400 })
    }
    const res = NextResponse.json({ ok: true })
    const isProd = process.env.NODE_ENV === 'production'
    res.cookies.set('sb-access-token', access_token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60, // 1h
    })
    res.cookies.set('sb-refresh-token', refresh_token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 60, // 60d
    })
    // SSA: access_token의 sub를 추출해 서버 서명 쿠키 발급
    try {
      const [, payloadB64] = access_token.split('.')
      const json = Buffer.from(payloadB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
      const payload = JSON.parse(json)
      const userId = typeof payload?.sub === 'string' ? payload.sub : null
      if (userId) {
        // 30분 기본 TTL (클라이언트 세션과는 별개, 빠른 재검증용)
        await setAssertionCookie(userId, 60 * 30)
      }
    } catch {}
    return res
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'invalid payload' }), { status: 400 })
  }
}


