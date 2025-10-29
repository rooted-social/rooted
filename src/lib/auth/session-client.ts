'use client'

// 클라이언트 전용 로그아웃 유틸
// - Supabase 클라이언트 세션 정리
// - 서버 쿠키(sb-*, is-super-admin, ssa) 정리 API 호출
// - 필요 시 클라이언트 리다이렉트 수행
export async function logoutClient(nextRedirect?: string) {
  try {
    const mod = await import('@/lib/supabase')
    try { await mod.supabase.auth.signOut() } catch {}
    try { await fetch('/api/auth/clear', { method: 'POST' }) } catch {}
  } finally {
    if (nextRedirect) {
      try { window.location.assign(nextRedirect) } catch { try { (window as any).location.href = nextRedirect } catch {} }
    }
  }
}


