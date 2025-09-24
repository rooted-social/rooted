import { createServerClient as createSSRClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// 서버(라우트 핸들러/서버 컴포넌트) 전용 Supabase 클라이언트
// - 쿠키 기반 인증 처리 (로그인/리프레시 토큰 자동 관리)
export const createServerClient = async () => {
  // Next.js 최신 버전에서는 cookies()를 await 해야 함
  const maybeStore = (cookies() as unknown) as any
  const cookieStore = typeof maybeStore?.then === 'function' ? await maybeStore : maybeStore
  return createSSRClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get?.(name)?.value
        },
        set(name: string, value: string, options: any) {
          try { cookieStore.set?.(name, value, options) } catch {}
        },
        remove(name: string, options: any) {
          try { cookieStore.set?.(name, '', options) } catch {}
        },
      },
    },
  )
}

// Authorization 헤더(Bearer 토큰) 기반 서버 클라이언트
// - 쿠키 세션이 없는 환경에서도 RLS가 정상 동작하도록 토큰을 전파
export const createServerClientWithAuth = async (accessToken?: string) => {
  if (!accessToken) return await createServerClient()
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, detectSessionInUrl: false },
    }
  )
}

