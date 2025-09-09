"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import AnimatedBackground from "@/components/AnimatedBackground"
import { Mail, Lock } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        toast.error(error.message)
      } else {
        toast.success("로그인 성공!")
        router.push("/")
      }
    } catch {
      toast.error("로그인 중 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  const handleKakaoLogin = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "kakao",
        options: {
          // 프로덕션/프리뷰/로컬 모두 동작하도록 콜백 전용 경로로 통일
          redirectTo: typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined,
          // 이메일 수집 활성화됨: 이메일 포함 범위로 요청
          scopes: "account_email profile_nickname profile_image",
          queryParams: {
            // 카카오는 PKCE를 권장. supabase-js v2는 기본으로 PKCE 사용
            // 여기서는 명시적 state를 추가해 CSRF 보호(선택)
            state: Math.random().toString(36).slice(2),
          },
        },
      })
      if (error) {
        toast.error(error.message)
        setLoading(false)
      }
      // 성공 시 카카오 인증 페이지로 이동하며, 복귀 후 세션이 설정됩니다.
    } catch (err) {
      toast.error("카카오 로그인 중 오류가 발생했습니다.")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <AnimatedBackground />
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">
      <div className="mb-2 flex flex-col items-center">
        <img
          src="/logos/logo_icon.png"
          alt="Rooted icon"
          className="h-10 w-10 object-contain mb-1"
        />
        <Link href="/" className="block transform transition-transform duration-300 ease-out hover:scale-105">
          <img 
            src="/logos/logo_main.png" 
            alt="Rooted" 
            className="h-10 object-contain mx-auto cursor-pointer"
          />
        </Link>
      </div>
      <p className="text-xs text-slate-600 mb-6">커뮤니티의 시작과 성장, 루티드!</p>

      <Card className="w-full max-w-md bg-white/90 backdrop-blur-sm shadow-lg border border-slate-200">
        <CardHeader className="text-center pb-5 pt-5">
          <CardTitle className="text-xl font-bold">로그인</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 pb-4">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 pr-10 focus:border-slate-900 focus-visible:ring-2 focus-visible:ring-slate-300"
                />
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <div className="relative">
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 pr-10 focus:border-slate-900 focus-visible:ring-2 focus-visible:ring-slate-300"
                />
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>
            </div>
            <Button type="submit" className="w-full h-11 cursor-pointer transform transition-transform duration-300 ease-out hover:scale-105 active:scale-[0.98]" disabled={loading}>
              {loading ? "로그인 중..." : "로그인"}
            </Button>
          </form>

          {/* Kakao OAuth */}
          <div className="mt-3">
            <Button
              type="button"
              onClick={handleKakaoLogin}
              className="w-full h-11 bg-[#FEE500] text-black hover:bg-[#FADA0A] cursor-pointer transform transition-transform duration-300 ease-out hover:scale-105 active:scale-[0.98]"
              disabled={loading}
            >
              카카오로 로그인
            </Button>
          </div>
          
          <div className="mt-4 text-center">
            <p className="text-sm text-slate-600">
              계정이 없으신가요?{" "}
              <Link href="/signup" className="text-slate-900 hover:underline font-medium">
                회원가입
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 text-xs text-slate-600">
        <Link href="/terms" className="hover:underline">이용약관</Link>
        <span className="px-2">|</span>
        <Link href="/privacy" className="hover:underline">개인정보처리방침</Link>
      </div>
      </div>
    </div>
  )
} 