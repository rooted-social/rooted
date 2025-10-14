import crypto from 'crypto'
import { cookies } from 'next/headers'

export type SessionAssertion = {
  userId: string
  exp: number // unix seconds
}

const COOKIE_NAME = 'ssa'

function getSecret(): string {
  const secret = process.env.SESSION_ASSERTION_SECRET
  if (!secret) throw new Error('SESSION_ASSERTION_SECRET is not set')
  return secret
}

export function signAssertion(payload: SessionAssertion): string {
  const secret = getSecret()
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url')
  return `${body}.${sig}`
}

export function verifyAssertion(token: string | undefined | null): SessionAssertion | null {
  if (!token) return null
  const secret = getSecret()
  const [body, sig] = token.split('.')
  if (!body || !sig) return null
  const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url')
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
  try {
    const json = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionAssertion
    if (!json?.userId || !json?.exp) return null
    const now = Math.floor(Date.now() / 1000)
    if (json.exp < now) return null
    return json
  } catch {
    return null
  }
}

export async function setAssertionCookie(userId: string, ttlSeconds: number = 60 * 30) {
  const cookieMaybePromise = cookies() as any
  const store = (typeof cookieMaybePromise?.get === 'function') ? cookieMaybePromise : await cookieMaybePromise
  const payload: SessionAssertion = { userId, exp: Math.floor(Date.now() / 1000) + ttlSeconds }
  const token = signAssertion(payload)
  const isProd = process.env.NODE_ENV === 'production'
  ;(store as any)?.set?.(COOKIE_NAME, token, { httpOnly: true, sameSite: 'lax', secure: isProd, path: '/', maxAge: ttlSeconds })
}

export async function readUserIdFromAssertion(): Promise<string | null> {
  const cookieMaybePromise = cookies() as any
  const store = (typeof cookieMaybePromise?.get === 'function') ? cookieMaybePromise : await cookieMaybePromise
  const token = store?.get?.(COOKIE_NAME)?.value as string | undefined
  const parsed = verifyAssertion(token)
  return parsed?.userId || null
}


