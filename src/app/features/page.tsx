import AnimatedBackground from "@/components/AnimatedBackground"
import { Users, FileText, Megaphone, CalendarDays, GraduationCap, BarChart3, Check, HelpCircle } from "lucide-react"

export default function FeaturesPage() {
  return (
    <div className="min-h-screen relative bg-white text-slate-900 overflow-hidden">
      {/* 라인 배경 효과가 컨텐츠 뒤에 보이도록 z-0로 올림 */}
      <AnimatedBackground zIndexClass="z-0" />

      <div className="relative z-20 mx-auto max-w-6xl px-4 py-16 text-center">
        {/* Intro heading outside of the card */}
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">ㆍ루티드가 뭔가요?</h1>
        {/* Intro section */}
        <div className="mx-auto max-w-3xl rounded-3xl bg-white/80 backdrop-blur-md border border-slate-200 shadow-md p-6 md:p-8 mt-4">
          <div className="text-slate-700 leading-relaxed text-[15px] md:text-base text-left md:text-center">
            <p>루티드는 커뮤니티 플랫폼이며, 루트는 하나의 커뮤니티입니다.</p>
            <p className="mt-2"><span className="font-semibold">루트(Root)</span>는 뿌리라는 뜻으로, 생명의 근본이 됩니다. </p>
            <p className="mt-2">하나의 커뮤니티인 당신만의 루트에서 전문성과 노하우를 공유하고 커뮤니티의 힘을 키워가세요!</p>
          </div>
        </div>

        {/* Title */}
        <h1 className="mt-20 text-3xl font-extrabold tracking-tight">ㆍ어떤 기능을 제공하나요?</h1>
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
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-400" /> 멤버 관리</li>
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
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-300" /> 검색/알림/좋아요</li>
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
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-pink-300" /> 공지/알림</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-pink-300" /> 메세지 (추후 예정)</li>
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
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-blue-300" /> 일정 등록 및 공유</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-blue-300" /> 이벤트 참여 및 체크인</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-blue-300" /> 대시보드 이벤트 항목 추가</li>
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
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-cyan-300" /> 강의 및 자료 등록</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-cyan-300" /> 수강 여부 관리</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-cyan-300" /> 결제/쿠폰 (추후 예정)</li>
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
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-rose-300" /> 대시보드 커스터마이징</li>
            </ul>
          </div>
        </div>

        {/* 누구에게 적합한 서비스인가요? */}
        <div className="mt-20 text-left">
          <h2 className="text-3xl font-extrabold tracking-tight text-center">ㆍ누구에게 필요한가요?</h2>
          <p className="mt-3 text-slate-600 text-center">아래에 해당되는 사항이 있다면 루티드를 추천해요!</p>

          <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1) 타겟 페르소나 나열형 */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-md">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500 grid place-items-center shadow">
                  <Users className="w-4 h-4 text-white" />
                </span>
                이런 분들에게 적합해요!
              </h3>
              <ul className="mt-4 space-y-3 text-[15px] md:text-base lg:text-lg text-slate-800">
                <li className="flex items-start gap-3"><span className="mt-2 w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-slate-900 flex-shrink-0" /><span>자신만의 커뮤니티를 만들고 싶은 크리에이터</span></li>
                <li className="flex items-start gap-3"><span className="mt-2 w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-slate-900 flex-shrink-0" /><span>강의/클래스를 운영하며 수익화를 고민하는 전문가</span></li>
                <li className="flex items-start gap-3"><span className="mt-2 w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-slate-900 flex-shrink-0" /><span>단순한 오픈채팅보다 깊은 관계를 원하는 그룹 리더</span></li>
                <li className="flex items-start gap-3"><span className="mt-2 w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-slate-900 flex-shrink-0" /><span>팬들과의 연결을 강화하고 싶은 아티스트</span></li>
                <li className="flex items-start gap-3"><span className="mt-2 w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-slate-900 flex-shrink-0" /><span>회원을 모아 꾸준히 소통하고 싶은 모임의 리더</span></li>
                <li className="flex items-start gap-3"><span className="mt-2 w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-slate-900 flex-shrink-0" /><span>브랜드나 팀 문화를 함께 성장시키고 싶은 운영자</span></li>
              </ul>
            </div>

            {/* 2) 문제-해결 매칭형 */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-md">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-400 to-pink-500 grid place-items-center shadow">
                  <HelpCircle className="w-4 h-4 text-white" />
                </span>
                이런 고민을 하고 계신가요?
              </h3>
              <div className="mt-4 space-y-3 text-sm">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-slate-900">“N사의 카페는 너무 복잡하고, K사의 오픈챗은 관리가 힘들다”</div>
                  <div className="mt-1 text-slate-600">→ 루티드는 직관적이고 깔끔한 커뮤니티 공간을 제공합니다.</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-slate-900">“내 콘텐츠를 수익화하고 싶은데 방법을 모르겠다”</div>
                  <div className="mt-1 text-slate-600">→ 루티드에서는 멤버십ㆍ커뮤니티 관리 기능으로 쉽게 수익화를 할 수 있습니다.</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-slate-900">“나의 멤버들과 진짜 소속감을 키우고 공유하고 싶다”</div>
                  <div className="mt-1 text-slate-600">→ 루티드는 진정한 연결과 지속적인 성장 경험을 지원합니다.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


