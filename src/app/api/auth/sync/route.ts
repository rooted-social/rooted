import { NextRequest, NextResponse } from 'next/server'

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
    return res
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'invalid payload' }), { status: 400 })
  }
}


