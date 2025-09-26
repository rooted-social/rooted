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

export default function SignUpPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [passwordConfirm, setPasswordConfirm] = useState("")
  const [fullName, setFullName] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (password !== passwordConfirm) {
        toast.error("비밀번호가 일치하지 않습니다.")
        setLoading(false)
        return
      }
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          }
        }
      })

      if (error) {
        toast.error(error.message)
      } else {
        toast.success("회원가입이 완료되었습니다! 이메일을 확인해주세요.")
        // 회원가입 후 로그인 페이지로 이동하되, 돌아갈 경로(next)를 유지
        let next: string | null = null
        if (typeof window !== 'undefined') {
          try { next = localStorage.getItem('rooted:return_to') } catch {}
        }
        router.push(next ? `/login?next=${encodeURIComponent(next)}` : "/login")
      }
    } catch {
      toast.error("회원가입 중 오류가 발생했습니다.")
    } finally {
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
        <CardHeader className="text-center pb-5 pt-4">
          <CardTitle className="text-xl font-bold">회원가입</CardTitle>
        </CardHeader>
        <CardContent className="pt-5 pb-5">
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">이름</Label>
              <Input
                id="full_name"
                type="text"
                placeholder="이름(닉네임)을 입력하세요"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                placeholder="이메일을 입력하세요"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                placeholder="최소 6자 이상"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="passwordConfirm">비밀번호 확인</Label>
              <Input
                id="passwordConfirm"
                type="password"
                placeholder="비밀번호를 다시 입력하세요"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                required
                minLength={6}
                className="h-11"
              />
            </div>
            <Button type="submit" className="w-full h-11 cursor-pointer transform transition-transform duration-300 ease-out hover:scale-105 active:scale-[0.98]" disabled={loading}>
              {loading ? "회원가입 중..." : "회원가입"}
            </Button>
          </form>
          
          <div className="mt-4 text-center">
            <p className="text-sm text-slate-600">
              이미 계정이 있으신가요?{" "}
              <Link href="/login" className="text-slate-900 hover:underline font-medium">
                로그인
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