"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const run = async () => {
      try {
        // Supabase SDK가 URL의 해시/쿼리 토큰을 처리하여 세션을 설정하도록 트리거
        await supabase.auth.getSession()
      } catch {}
      // 토큰을 URL에서 제거하고 홈으로 이동
      router.replace("/")
    }
    run()
  }, [router])

  return null
}


