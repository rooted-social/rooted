import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

// OAuth/Email 링크 콜백: 서버에서 세션을 교환하고 쿠키를 설정
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') || '/'
  const redirectUrl = new URL(next, req.url)

  const supabase = createServerClient()

  try {
    if (code) {
      const { error } = await (supabase as any).auth.exchangeCodeForSession(code)
      if (error) {
        return NextResponse.redirect(redirectUrl, { status: 303 })
      }
    }
  } catch {}

  return NextResponse.redirect(redirectUrl, { status: 303 })
}


