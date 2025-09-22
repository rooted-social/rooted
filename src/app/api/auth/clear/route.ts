import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST() {
  const res = NextResponse.json({ ok: true })
  const isProd = process.env.NODE_ENV === 'production'
  res.cookies.set('sb-access-token', '', { httpOnly: true, secure: isProd, sameSite: 'lax', path: '/', maxAge: 0 })
  res.cookies.set('sb-refresh-token', '', { httpOnly: true, secure: isProd, sameSite: 'lax', path: '/', maxAge: 0 })
  return res
}


