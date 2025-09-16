import AnimatedBackground from "@/components/AnimatedBackground"
import { Users, FileText, Megaphone, CalendarDays, GraduationCap, BarChart3, Check } from "lucide-react"

export default function FeaturesPage() {
  return (
    <div className="min-h-screen relative bg-white text-slate-900 overflow-hidden">
      {/* 라인 배경 효과가 컨텐츠 뒤에 보이도록 z-0로 올림 */}
      <AnimatedBackground zIndexClass="z-0" />

      <div className="relative z-20 mx-auto max-w-6xl px-4 py-16 text-center">
        {/* Intro heading outside of the card */}
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">루티드가 뭔가요?</h1>
        {/* Intro section */}
        <div className="mx-auto max-w-3xl rounded-3xl bg-white/80 backdrop-blur-md border border-slate-200 shadow-md p-6 md:p-8 mt-4">
          <div className="text-slate-700 leading-relaxed text-[15px] md:text-base text-left md:text-center">
            <p>루티드는 커뮤니티 플랫폼이며, 루트는 하나의 커뮤니티입니다.</p>
            <p className="mt-2"><span className="font-semibold">루트(Root)</span>는 뿌리라는 뜻으로, 생명의 근본이 됩니다. </p>
            <p className="mt-2">하나의 커뮤니티인 당신만의 루트에서 전문성과 노하우를 공유하고 커뮤니티의 힘을 키워가세요!</p>
          </div>
        </div>

        {/* Title */}
        <h1 className="mt-20 text-4xl font-extrabold tracking-tight">플랫폼 기능 소개</h1>
        <p className="mt-3 text-slate-600">루티드가 제공하는 핵심 기능을 한 눈에 살펴보세요.</p>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 카드 컴포넌트 템플릿 */}
          <div className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 grid place-items-center shadow">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-xs text-amber-300 font-semibold">Membership</div>
                <h2 className="text-lg font-bold">멤버십ㆍ수익화</h2>
              </div>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-400" /> 멤버 등급/권한 관리</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-400" /> 결제/구독 기반 수익화</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-400" /> 초대/가입 승인 흐름</li>
            </ul>
          </div>

          <div className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-green-500 grid place-items-center shadow">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-xs text-emerald-300 font-semibold">Content</div>
                <h2 className="text-lg font-bold">콘텐츠</h2>
              </div>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-300" /> 피드/포스트/댓글</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-300" /> 파일/이미지 업로드</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-300" /> 태그/검색/알림</li>
            </ul>
          </div>

          <div className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-400 to-fuchsia-500 grid place-items-center shadow">
                <Megaphone className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-xs text-pink-300 font-semibold">Communication</div>
                <h2 className="text-lg font-bold">공지ㆍ소통</h2>
              </div>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-pink-300" /> 공지/이메일/푸시 알림</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-pink-300" /> 멤버 멘션/DM</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-pink-300" /> 커뮤니티 가이드라인</li>
            </ul>
          </div>

          <div className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 grid place-items-center shadow">
                <CalendarDays className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-xs text-blue-300 font-semibold">Events</div>
                <h2 className="text-lg font-bold">이벤트</h2>
              </div>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-blue-300" /> 일정/참가 신청/체크인</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-blue-300" /> 오프라인/온라인 지원</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-blue-300" /> 리마인더/후기</li>
            </ul>
          </div>

          <div className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-teal-500 grid place-items-center shadow">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-xs text-cyan-300 font-semibold">Classes</div>
                <h2 className="text-lg font-bold">온라인 클래스 운영</h2>
              </div>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-cyan-300" /> 강의/자료/퀴즈</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-cyan-300" /> 진행상황/수료증</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-cyan-300" /> 결제/쿠폰</li>
            </ul>
          </div>

          <div className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-400 to-pink-500 grid place-items-center shadow">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-xs text-rose-300 font-semibold">Dashboard</div>
                <h2 className="text-lg font-bold">통합 대시보드</h2>
              </div>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-rose-300" /> 활동/참여/매출 분석</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-rose-300" /> 성장 지표/리텐션</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-rose-300" /> 대시보드 커스터마이즈</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}


