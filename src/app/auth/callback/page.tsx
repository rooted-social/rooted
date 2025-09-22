"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const run = async () => {
      try {
        // Supabase SDK가 URL의 해시/쿼리 토큰을 처리하여 세션을 설정하도록 트리거
        await supabase.auth.getSession()
      } catch {}
      // next 파라미터가 있으면 해당 경로로, 없으면 홈으로 이동
      const next = searchParams?.get('next')
      router.replace(next || "/")
    }
    run()
  }, [router, searchParams])

  return null
}


