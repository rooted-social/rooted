import { createClient } from '@supabase/supabase-js'

// 서버 전용 Supabase 클라이언트 팩토리
// 주의: 이 모듈은 서버 환경에서만 import 하세요.
export const createServerClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

