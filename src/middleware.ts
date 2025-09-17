import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// 로그인 필수 경로를 SSR에서 가드
const protectedPaths = [
  '/dashboard',
  '/notifications',
]

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  // 고정 경로 또는 커뮤니티 대시보드(/:slug/dashboard) 보호
  const isCommunityDashboard = /^\/[^\/]+\/dashboard(\/|$)/.test(pathname)
  // 커뮤니티 내부 탭 전체 보호: classes, calendar, members, settings, stats, blog
  const isCommunityInternal = /^\/[^\/]+\/(dashboard|classes|calendar|members|settings|stats|blog)(\/|$)/.test(pathname)
  const isProtected = isCommunityDashboard || isCommunityInternal || protectedPaths.some(p => pathname.startsWith(p))
  if (!isProtected) return NextResponse.next()

  // 클라이언트 쿠키 기반 세션 토큰 확인 (supabase-js와 별개로, 간단 가드)
  // Supabase v2 기본 쿠키 키(sb-access-token/sb-refresh-token). 프로젝트 설정에 맞춰 필요 시 추가
  const hasSupabase = req.cookies.get('sb-access-token') || req.cookies.get('sb-refresh-token') || req.headers.get('authorization')
  // 주의: 현재 앱은 클라이언트 로컬 스토리지 기반 세션을 사용하므로
  // 쿠키가 없더라도 클라이언트에서 인증 상태일 수 있다.
  // 쿠키가 없을 때는 미들웨어에서 리다이렉트하지 않고 클라이언트 가드에 위임한다.
  if (!hasSupabase) return NextResponse.next()
  return NextResponse.next()
}

export const config = {
  // 커뮤니티 대시보드 및 내부 탭 전체 포함
  matcher: ['/dashboard', '/notifications', '/(.*)/(dashboard|classes|calendar|members|settings|stats|blog)'],
}

