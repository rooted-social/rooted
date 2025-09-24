"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { createCommunity } from "@/lib/communities"
import { checkSlugAvailable } from "@/lib/community-utils"
import { useRouter } from "next/navigation"
import AnimatedBackground from "@/components/AnimatedBackground"
import { COMMUNITY_CATEGORIES } from '@/lib/constants'
import { Sparkles, FlaskConical, Sprout } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function CreatePage() {
  const router = useRouter()
  const [isCreating, setIsCreating] = useState(false)
  const [slugCheckLoading, setSlugCheckLoading] = useState(false)
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    slug: "",
    category: COMMUNITY_CATEGORIES.find(c => c !== '전체') || '테크 & IT',
  })

  // 베타 게이트
  const [betaOpen, setBetaOpen] = useState(false)
  const [betaCode, setBetaCode] = useState("")
  const [betaError, setBetaError] = useState<string | null>(null)

  // 베타 테스터 신청 폼
  const [applicantName, setApplicantName] = useState("")
  const [applicantEmail, setApplicantEmail] = useState("")
  const [applying, setApplying] = useState(false)

  // 생성 완료 모달
  const [successOpen, setSuccessOpen] = useState(false)
  const [createdSlug, setCreatedSlug] = useState<string | null>(null)

  const categories = COMMUNITY_CATEGORIES.filter(c => c !== '전체')

  const updateFormData = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (field === 'slug') setSlugAvailable(null)
  }

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")

  const performCreate = async () => {
    if (!formData.name.trim() || !formData.description.trim() || !formData.slug.trim()) return
    if (slugAvailable === false) return
    try {
      setIsCreating(true)
      const created = await createCommunity(formData)
      setCreatedSlug((created as any)?.slug || formData.slug)
      setSuccessOpen(true)
      toast.success('루트가 생성되었습니다!')
    } finally {
      setIsCreating(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const s = formData.slug
    if (!s || s.length < 3 || s.length > 32) { toast.error('URL은 3~32자 사이여야 합니다.'); return }
    setBetaOpen(true)
  }

  return (
    <div className="min-h-screen relative">
      <AnimatedBackground />
      <main className="relative px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 pt-10 pb-24 z-10">
        <div className="w-full max-w-3xl mx-auto">
          <div className="mb-6 text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shadow-lg ring-2 ring-white/60">
                <Sprout className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">새 루트 만들기</h1>
            </div>
            <p className="text-slate-600 mt-1">진정한 커뮤니티로 연결과 성장을 시작하세요!</p>
          </div>

          <Card className="backdrop-blur-sm bg-white/80 border-2 border-slate-500 shadow-xl rounded-3xl">
            <CardContent className="p-6 md:p-10">
              <form onSubmit={handleSubmit} className="grid gap-5 md:gap-6 md:grid-cols-2">
            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="name">루트 이름</Label>
              <Input
                id="name"
                type="text"
                placeholder="루트 이름을 입력하세요"
                value={formData.name}
                onChange={(e) => {
                  updateFormData("name", e.target.value)
                  if (e.target.value) updateFormData("slug", generateSlug(e.target.value))
                }}
                required
                disabled={isCreating}
              />
            </div>
            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="slug">루트 URL</Label>
              <div className="flex items-center gap-2">
                <span className="px-2 py-2 text-sm text-slate-500 bg-slate-50 rounded border border-slate-200">rooted.kr/</span>
                <Input
                  id="slug"
                  type="text"
                  placeholder="ex) rooted"
                  value={formData.slug}
                  onChange={(e) => updateFormData("slug", generateSlug(e.target.value))}
                  pattern="[a-z0-9-]+"
                  minLength={3}
                  maxLength={32}
                  required
                  disabled={isCreating}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={async ()=>{ setSlugCheckLoading(true); const ok = await checkSlugAvailable(formData.slug); setSlugAvailable(ok); setSlugCheckLoading(false) }}
                  disabled={isCreating || !formData.slug.trim()}
                  className="cursor-pointer"
                >
                  {slugCheckLoading ? '확인 중...' : '중복 확인'}
                </Button>
              </div>
              <p className={`text-xs mt-1 ${slugAvailable === false ? 'text-red-600' : slugAvailable === true ? 'text-sky-600' : 'text-slate-500'}`}>
                (영문 혹은 숫자 입력) URL은 추후 변경이 불가능하니 신중하게 선택하세요!
                {slugAvailable !== null && (
                  <span className="ml-2 font-medium">{slugAvailable ? '사용 가능한 URL입니다.' : '이미 사용 중인 URL입니다.'}</span>
                )}
              </p>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">루트 소개</Label>
              <Textarea
                id="description"
                placeholder="루트에 대해 간단히 소개해주세요"
                value={formData.description}
                onChange={(e) => updateFormData("description", e.target.value)}
                rows={5}
                required
                disabled={isCreating}
              />
            </div>
            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="category">카테고리</Label>
              <Select value={formData.category} onValueChange={(v)=>updateFormData("category", v)}>
                <SelectTrigger id="category" className="h-11 rounded-2xl bg-white/90 border border-slate-200 ring-1 ring-slate-200/80 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 cursor-pointer">
                  <SelectValue placeholder="카테고리를 선택하세요" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border border-slate-200 shadow-lg bg-white/95 backdrop-blur-sm">
                  {categories.map((category) => (
                    <SelectItem key={category} value={category} className="cursor-pointer">
                      <span className="inline-flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${
                          category.includes('테크') ? 'bg-sky-300' :
                          category.includes('디자인') ? 'bg-fuchsia-300' :
                          category.includes('마케팅') ? 'bg-amber-300' :
                          category.includes('라이프') ? 'bg-teal-300' :
                          category.includes('교육') ? 'bg-indigo-300' :
                          category.includes('비즈니스') ? 'bg-emerald-300' :
                          'bg-slate-300'
                        }`} />
                        {category}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-1 flex items-end justify-end">
              <Button
                type="submit"
                disabled={isCreating}
                className="h-11 px-6 bg-amber-500 hover:bg-amber-600 text-black border border-black rounded-xl shadow-md hover:shadow-xl transition-all duration-200 ease-out hover:-translate-y-0.5 cursor-pointer"
              >
                {isCreating ? "생성 중..." : "루트 생성"}
              </Button>
            </div>
              </form>
            </CardContent>
          </Card>

          {/* 안내 문구 + 베타 신청 섹션 */}
          <div className="mt-6 space-y-4">
            <Card className="bg-white/70 bg-gradient-to-br from-amber-50/50 via-white/70 to-orange-50/50 border-amber-200/60 rounded-3xl shadow-sm">
              <CardContent className="p-6 md:p-8">
                <div className="flex items-center justify-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center shadow-sm">
                    <Sparkles className="w-4.5 h-4.5 text-amber-700" />
                  </div>
                  <p className="text-sm md:text-[15px] text-slate-800 leading-relaxed text-center">
                    현재는 사전에 안내된 분들과 베타 테스트를 진행 중이며, 빠른 시일 내 정식 서비스를 론칭할 예정입니다 :)
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-50/40 via-white to-slate-50 border-amber-200/60 rounded-3xl shadow-md">
              <CardContent className="p-6 md:p-8">
                <div className="flex items-center justify-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center shadow-sm">
                    <FlaskConical className="w-4.5 h-4.5 text-amber-700" />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900">베타 테스터 신청하기</h2>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="beta-name">이름</Label>
                    <Input id="beta-name" value={applicantName} onChange={(e)=>setApplicantName(e.target.value)} placeholder="홍길동" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="beta-email">이메일 주소</Label>
                    <Input id="beta-email" type="email" value={applicantEmail} onChange={(e)=>setApplicantEmail(e.target.value)} placeholder="you@example.com" />
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <Button
                    onClick={async ()=>{
                      const name = applicantName.trim()
                      const email = applicantEmail.trim()
                      if (!name || !email) { toast.error('이름과 이메일을 입력해주세요.'); return }
                      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast.error('이메일 형식이 올바르지 않습니다.'); return }
                      setApplying(true)
                      try {
                        const { error } = await supabase.from('beta_applicants').insert({ name, email })
                        if (error) {
                          const msg = (error as any)?.message || '신청 접수 중 오류가 발생했습니다.'
                          toast.error(msg.includes('duplicate') || msg.includes('unique') ? '이미 신청된 이메일입니다.' : msg)
                          return
                        }
                        toast.success('신청이 접수되었습니다. 감사합니다!')
                        setApplicantName("")
                        setApplicantEmail("")
                      } finally { setApplying(false) }
                    }}
                    disabled={applying}
                    className="h-10 px-6 bg-amber-500 hover:bg-amber-600 text-black border border-black rounded-xl shadow-md hover:shadow-lg transition-all duration-200 ease-out hover:-translate-y-0.5 cursor-pointer"
                  >
                    {applying ? '접수 중...' : '신청하기'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
          {/* 베타 코드 입력 다이얼로그 */}
          <Dialog open={betaOpen} onOpenChange={setBetaOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>베타 테스터 코드 확인</DialogTitle>
                <DialogDescription>베타 테스트 기간 동안에는 코드 입력이 필요합니다.</DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="beta-code">코드</Label>
                <Input id="beta-code" value={betaCode} onChange={(e)=>{ setBetaCode(e.target.value); setBetaError(null) }} placeholder="테스트 코드를 입력하세요" />
                {betaError && <p className="text-xs text-red-600">{betaError}</p>}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={()=>setBetaOpen(false)}>취소</Button>
                <Button
                  onClick={async ()=>{
                    if (betaCode.trim().toLowerCase() !== 'beta1') { setBetaError('코드가 올바르지 않습니다.'); return }
                    setBetaOpen(false)
                    setBetaCode("")
                    await performCreate()
                  }}
                >
                  확인 후 생성
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </main>
      {/* 생성 성공 모달 */}
      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>🎉 루트 생성이 완료되었습니다!</DialogTitle>
            <DialogDescription>
              루트 설정 페이지에서 남은 설정을 완료해보세요!
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm text-slate-700">
            <p>프로필 이미지, 소개, 배너 이미지 등을 설정하면 더 멋진 첫인상을 줄 수 있어요.</p>
          </div>
          <DialogFooter>
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-black border border-black rounded-xl cursor-pointer"
              onClick={()=>{
                if (createdSlug) router.push(`/${createdSlug}/dashboard?onboarding=1`)
                else router.push('/dashboard?onboarding=1')
              }}
            >
              내 루트로 이동
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

