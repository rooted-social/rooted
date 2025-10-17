"use client"
import FAQAccordion from "@/components/pricing/FAQAccordion"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useState } from "react"

export default function PricingPage() {
  const [open, setOpen] = useState(false)
  const tiers: { name: string; price: string; featured?: boolean; bullets: string[]; feeOriginal: string; feeDiscount: string; tagline: string }[] = [
    { name: 'Starter', price: 'Beta', bullets: ['커뮤니티 대시보드 (브랜드 컬러 적용)', '커뮤니티 상세페이지 운영', '최대 300명 멤버', '게시판 페이지 10개 생성', '클래스 운영 및 관리', '이벤트 및 일정 관리', '멤버 관리'], feeOriginal: '', feeDiscount: '5.5%', tagline: '소규모 커뮤니티 리더 및 스타터' },
    { name: 'Pro', price: 'Beta', featured: true, bullets: ['Starter 기능 포함', '최대 3,000명 멤버', '게시판 페이지 최대 100개'], feeOriginal: '4.6%', feeDiscount: '2.9%', tagline: '효과적인 커뮤니티 관리 및 운영이 필요한 리더' },
    { name: 'Pro Plus', price: 'Beta', bullets: ['Pro 기능 포함', '최대 30,000명 멤버', '게시판 페이지 무제한'], feeOriginal: '', feeDiscount: '3.9%', tagline: '규모있는 커뮤니티의 운영이 필요한 리더' },
  ]
  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="mx-auto max-w-6xl px-4 py-20">
        <h1 className="text-4xl font-extrabold tracking-tight text-center text-white">가격 안내</h1>
        <p className="mt-3 text-yellow-400 text-center">현재는 베타 서비스를 진행 중입니다.</p>

        {/* 월/연간 토글 (데모 UI) */}
        <div className="mt-8 flex justify-center">
          <div className="inline-flex items-center rounded-lg bg-neutral-900/70 ring-1 ring-white/10 overflow-hidden">
            <button className="px-6 py-2 text-sm font-medium bg-white text-black">월간</button>
            <button className="px-6 py-2 text-sm text-white/70 hover:text-white">연간(20% 할인)</button>
          </div>
        </div>

        {/* 카드들 */}
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={`${t.featured ? 'bg-neutral-900/70 ring-2 ring-yellow-400/60' : 'bg-neutral-900/60 ring-2 ring-white/30'} rounded-2xl p-6 shadow-xl backdrop-blur transition-transform hover:-translate-y-1`}
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center border-1 rounded-lg bg-white/10 px-3 py-1 text-md font-medium text-white">{t.name}</span>
                {t.featured && (
                  <span className="rounded-lg bg-yellow-400/10 px-2 py-1 text-[15px] font-semibold text-yellow-300 ring-1 ring-yellow-400/60">추천</span>
                )}
              </div>

              <div className="mt-4 text-3xl font-extrabold text-white">{t.price}</div>
              <p className="mt-1 text-sm text-neutral-300">{t.tagline}</p>

              <div className="mt-4">
                <button onClick={() => setOpen(true)} className={`${t.featured ? 'bg-white border-1 border-white text-black hover:bg-neutral-200' : 'bg-neutral-800 border-1 border-white text-white hover:bg-neutral-700'} w-full h-11 rounded-lg transition-colors cursor-pointer active:scale-[0.99]`}>시작하기</button>
              </div>

              <ul className="mt-6 space-y-3 text-sm text-neutral-300">
                {t.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-4 w-4 text-yellow-400"><polyline points="20 6 9 17 4 12" /></svg>
                    <span>{b}</span>
                  </li>
                ))}
                {t.feeOriginal && t.feeOriginal !== t.feeDiscount ? (
                  <li className="flex items-start gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-4 w-4 text-yellow-400"><polyline points="20 6 9 17 4 12" /></svg>
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-neutral-500 line-through">수수료 {t.feeOriginal}</span>
                      <span className="text-yellow-300 font-semibold">수수료 {t.feeDiscount}</span>
                      <span className="rounded-md bg-yellow-400/10 px-1.5 py-0.5 text-[11px] font-semibold text-yellow-300 ring-1 ring-yellow-400/30">최초 30명 한정</span>
                    </div>
                  </li>
                ) : (
                  <li className="flex items-start gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-4 w-4 text-yellow-400"><polyline points="20 6 9 17 4 12" /></svg>
                    <span>수수료 {t.feeDiscount}</span>
                  </li>
                )}
              </ul>

              
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-neutral-300 text-center">*판매 수수료는 유료 멤버십을 운영하는 커뮤니티에만 해당됩니다.</p>

        <FAQAccordion
          className="mt-24"
          items={[
            { question: '루티드가 뭔가요?', answer: '루티드는 커뮤니티 플랫폼으로써, 커뮤니티(루트)를 운영하고 관리하는 데 필요한 멤버십, 콘텐츠, 일정 관리, 멤버 관리 기능을 제공합니다.' },
            { question: '멤버십은 어떻게 운영하나요?', answer: '커뮤니티 생성 후, 멤버십 생성 후 멤버에게 커뮤니티 접근 권한을 승인할 수 있습니다. 또한, 멤버십 가격은 자유롭게 설정할 수 있습니다.' },
            { question: '결제는 언제부터 시작되나요?', answer: '현재는 베타 기간으로 과금되지 않습니다. 정식 출시 시점과 가격 정책은 사전 고지 후 적용됩니다.' },
            { question: '수수료는 어떻게 정산되나요?', answer: '각 커뮤니티 리더가 구독 중인 플랜에 명시된 서비스 수수료가 차감되며, 커뮤니티 리더에게 정해진 요율에 따라 정해진 일자에 정산이 진행됩니다. (부가가치세 10%및 결제대행 PG사 수수료 3.4% 별도)' },
            { question: '플랜은 자유롭게 변경할 수 있나요?', answer: '플랜 변경은 즉시 적용되며, 상향/하향 모두 가능하도록 설계됩니다. 팀 규모와 사용량에 맞춰 쉽게 조정하세요.' },
          ]}
        />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="bg-neutral-950 text-white border-2 border-white/10">
            <DialogHeader>
              <DialogTitle className="text-lg text-center">알림</DialogTitle>
            </DialogHeader>
            <p className="text-md text-neutral-300 text-center">현재는 베타 서비스 진행 중입니다.</p>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}


