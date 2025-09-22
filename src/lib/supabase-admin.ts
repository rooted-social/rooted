import { createClient } from '@supabase/supabase-js'

// 서버에서만 사용: Service Role Key를 이용해 RLS를 우회하는 관리자 클라이언트
export const createAdminClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, serviceRole, {
    auth: { persistSession: false, detectSessionInUrl: false },
  })
}


