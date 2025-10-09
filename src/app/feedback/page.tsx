"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthData } from "@/components/auth/AuthProvider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { AnimatedBackground } from "@/components/AnimatedBackground"
import { getAuthToken } from "@/lib/supabase"

export default function FeedbackPage() {
  const { user } = useAuthData()
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState<"ops"|"feature"|"general"|"billing"|"">("")
  const [content, setContent] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!user) { router.push(`/login?next=${encodeURIComponent('/feedback')}`); return }
    if (!title.trim() || !category || !content.trim()) { toast.error("모든 항목을 입력해주세요."); return }
    setSubmitting(true)
    try {
      const token = await getAuthToken().catch(() => null)
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ title: title.trim(), category, content: content.trim() })
      })
      if (!res.ok) throw new Error('failed')
      setTitle(""); setCategory(""); setContent("")
      toast.success("피드백이 제출되었습니다. 감사합니다!")
      router.push('/')
    } catch {
      toast.error("제출에 실패했습니다. 잠시 후 다시 시도해주세요.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="relative min-h-screen pt-10 md:pt-28 pb-24 px-4 sm:px-6 lg:px-8">
      <AnimatedBackground zIndexClass="-z-10" />
      <div className="mx-auto max-w-4xl">
        <div className="rounded-3xl border-2 border-slate-200/80 bg-white/70 backdrop-blur-md shadow-[0_10px_30px_rgba(15,23,42,0.06)] p-6 sm:p-10">
          <div className="mb-8 text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Feedback</h1>
            <p className="mt-2 text-slate-600">더 나은 서비스 개선을 위해 의견을 남겨주세요.</p>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <Label htmlFor="fb-title">제목</Label>
              <Input id="fb-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="제목을 입력하세요" maxLength={100} className="h-11 rounded-xl border-slate-300 focus-visible:ring-2 focus-visible:ring-slate-300" />
            </div>
            <div className="space-y-2">
              <Label>카테고리</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as any)}>
                <SelectTrigger className="w-full h-11 rounded-xl border-slate-300 focus:ring-0 focus:outline-none"><SelectValue placeholder="선택하세요" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ops">운영 관련</SelectItem>
                  <SelectItem value="feature">기능 관련</SelectItem>
                  <SelectItem value="billing">정산 및 비용 관련</SelectItem>
                  <SelectItem value="general">일반 문의</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fb-content">내용</Label>
              <Textarea id="fb-content" value={content} onChange={(e) => setContent(e.target.value)} rows={10} placeholder="자세한 내용을 적어주세요" className="rounded-2xl border-slate-300 focus-visible:ring-2 focus-visible:ring-slate-300" />
              <div className="text-xs text-slate-500">최대한 구체적으로 작성해주시면 더 빨리 도와드릴 수 있어요.</div>
            </div>
            <div className="pt-1 flex justify-end">
              <Button className="cursor-pointer h-11 px-6 rounded-xl" onClick={handleSubmit} disabled={submitting}>{user ? '제출' : '로그인 후 제출'}</Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}


