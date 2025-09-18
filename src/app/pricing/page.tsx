import AnimatedBackground from "@/components/AnimatedBackground"

export default function PricingPage() {
  const tiers: { name: string; price: string; featured?: boolean; bullets: string[] }[] = [
    { name: 'Starter', price: 'Beta', bullets: ['기본 커뮤니티 기능', '최대 100명 멤버', '기본 통계'] },
    { name: 'Pro', price: 'Beta', featured: true, bullets: ['Starter 포함', '확장 기능', '콘텐츠/이벤트 고급 옵션'] },
    { name: 'Pro Plus', price: 'Beta', bullets: ['Pro 포함', '상세 분석', '우선 지원'] },
    { name: 'Custom', price: 'Beta', bullets: ['요구사항 맞춤', '상담 후 설계', '확장/통합 옵션'] },
  ]
  return (
    <div className="min-h-screen relative bg-white">
      <AnimatedBackground zIndexClass="-z-0" />

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-16">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 text-center fade-in-down" style={{ animationDelay: '40ms' }}>서비스 요금</h1>
        <p className="mt-3 text-slate-600 text-center fade-in-down" style={{ animationDelay: '110ms' }}>현재는 베타 서비스를 진행 중입니다.</p>

        {/* 월/연간 토글 (UI만) */}
        <div className="mt-8 flex justify-center">
          <div className="inline-flex items-center rounded-full bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden">
            <button className="px-6 py-2 text-sm font-medium bg-amber-100 text-slate-900">월간</button>
            <button className="px-6 py-2 text-sm text-slate-600 hover:text-slate-900">연간(20% 할인)</button>
          </div>
        </div>

        {/* 카드들 */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {tiers.map((t, i) => (
            <div key={t.name} className={`rounded-3xl p-6 backdrop-blur-sm ${t.featured ? 'bg-white shadow-xl ring-2 ring-amber-300' : 'bg-white/90 shadow-md ring-1 ring-slate-200'} transition-all hover:-translate-y-0.5 fade-in-down`} style={{ animationDelay: `${i * 90 + 60}ms` }}>
              <div className="text-xs inline-flex px-3 py-1 rounded-full bg-slate-900 text-white mb-3">{t.name}</div>
              <div className="text-3xl font-extrabold text-slate-900">{t.price}</div>
              <ul className="mt-4 space-y-2 text-sm text-slate-700">
                {t.bullets.map((b) => (
                  <li key={b} className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    {b}
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <button className={`w-full h-10 rounded-xl ${t.featured ? 'bg-amber-500 text-black hover:bg-amber-600' : 'bg-slate-900 text-white hover:bg-slate-800'} transition-colors`}>시작하기</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}


