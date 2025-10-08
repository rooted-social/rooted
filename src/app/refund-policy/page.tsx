"use client"

import AnimatedBackground from "@/components/AnimatedBackground"
import { Card, CardContent } from "@/components/ui/card"
import { Receipt } from "lucide-react"
import Image from "next/image"

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen relative">
      <AnimatedBackground />
      <main className="relative px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 pt-10 pb-24 z-10">
        <div className="w-full max-w-4xl mx-auto">
          <div className="mb-6 text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shadow-lg ring-2 ring-white/60">
                <Receipt className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">취소 및 환불 규정</h1>
            </div>
            <p className="text-slate-600">루티드(Rooted) 서비스의 유료 이용에 대한 취소/환불 기준을 안내합니다.</p>
          </div>

          <Card className="backdrop-blur-sm bg-white/80 border-slate-200/60 rounded-3xl shadow-xl">
            <CardContent className="p-6 md:p-8">
              <article className="max-w-none text-slate-800 leading-relaxed">
                <section className="space-y-3">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">제 1조 (목적 및 적용 대상)</h2>
                  <p>본 규정은 루티드(Rooted, 이하 "회사")가 제공하는 유료 서비스(커뮤니티 운영 플랜, 멤버십 등)의 취소 및 환불 기준과 절차를 정하며, 서비스 내 고지된 별도 정책이 있는 경우 우선 적용합니다.</p>
                </section>

                <section className="space-y-3 mt-8">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">제 2조 (정의)</h2>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>"정기결제"란 일정 주기마다 자동으로 결제되는 유료 서비스 이용 형태를 말합니다.</li>
                    <li>"디지털 콘텐츠/서비스 제공 개시"란 회원이 유료 서비스의 기능·혜택을 최초로 이용한 시점을 의미합니다.</li>
                    <li>"리더/판매자"란 커뮤니티를 운영하며 유상 서비스를 제공하는 주체를 말합니다.</li>
                  </ul>
                </section>

                <section className="space-y-3 mt-8">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">제 3조 (취소 및 환불 신청기간)</h2>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>정기결제: 다음 결제 예정일 최소 3영업일 전까지 해지 신청 시, 다음 주기부터 결제가 중단됩니다.</li>
                    <li>단건 결제(전자상거래법상 청약철회): 디지털 콘텐츠/서비스의 제공이 개시되기 전에는 결제일로부터 7일 이내 청약철회가 가능합니다.</li>
                    <li>제공 개시 후: 디지털 콘텐츠/서비스의 성질상 즉시 제공·복제가 가능한 경우 등 법령상 예외에 해당할 때에는 청약철회가 제한됩니다. 해당 예외 및 제한 사유는 서비스 내 고지를 따릅니다.</li>
                    <li>커뮤니티 멤버십: 멤버십 시작일로부터 3일 이내 환불 신청이 가능하며, 이후에는 멤버십의 특성상 환불이 불가합니다.</li>
                  </ul>
                  <p className="text-sm text-slate-600">[참고] 전자상거래 등에서의 소비자보호에 관한 법률 및 같은 법 시행령을 따릅니다.</p>
                </section>

                <section className="space-y-3 mt-8">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">제 4조 (취소 및 환불 절차)</h2>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>회원은 서비스 내 설정 또는 고객센터를 통해 취소/환불을 신청합니다.</li>
                    <li>회사는 접수 후 지체 없이 처리하며, 법령 및 내부 정책에 따라 필요한 확인 절차를 거칠 수 있습니다.</li>
                    <li>환불 승인 시 원결제 수단을 우선으로 하되, 불가한 경우 대체 수단으로 환급할 수 있습니다.</li>
                    <li>환불 승인 후 실제 결제 취소/환급 반영까지는 카드사 또는 결제대행사(PG) 정책에 따라 영업일 기준 3~7일이 소요될 수 있습니다. 계좌 환급의 경우 은행 영업일 및 내부 처리 절차에 따라 추가 시간이 소요될 수 있습니다.</li>
                  </ul>
                </section>

                <section className="space-y-3 mt-8">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">제 5조 (취소 및 환불 수수료)</h2>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>제공 개시 전 환불: 결제대행 수수료(PG), 플랫폼 이용료 등 실비가 공제될 수 있습니다.</li>
                    <li>제공 개시 후 환불 제한: 법령상 예외 사유(하자 등)가 없는 한 환불이 제한됩니다. 예외 적용 시에도 아래 공제 기준이 적용될 수 있습니다.</li>
                    <li>부분 이용 관련 공식 기준: 
                      <ul className="list-disc pl-5 space-y-1">
                        <li>커뮤니티 플랜 월 정기결제: 일할 계산을 적용하지 않으며, 해당 결제 주기의 남은 기간 환불은 불가합니다.</li>
                        <li>커뮤니티 플랜 연간 결제: 서비스 내 고지된 환불 정책에 따라 잔여 개월 수 기준의 환불 가능 여부 및 공제 기준을 사전에 안내합니다.</li>
                        <li>커뮤니티 멤버십: 멤버십 시작 후 3일 이내에는 환불이 가능하나, 이후에는 커뮤니티 멤버십의 특성상 환불이 불가합니다.</li>
                      </ul>
                    </li>
                    <li>공제 항목 예시: 이미 제공된 기간·혜택에 대한 사용액, 결제/정산 비용(PG 수수료 등), 부가가치세 정산 차액, 프로모션·쿠폰 차감액 등.</li>
                    <li>세무·원천징수 처리: 이미 세금계산서/현금영수증이 발행되었거나 정산이 완료된 건의 환불은 다음 기준에 따릅니다.
                      <ul className="list-disc pl-5 space-y-1">
                        <li>가능한 경우 계산서/영수증의 취소·수정 발행 및 세액 재계산을 진행합니다.</li>
                        <li>정산 완료된 금액은 차기 정산금에서 차감(상계)하거나, 판매자/리더에게 환수 청구할 수 있습니다.</li>
                      </ul>
                    </li>
                    <li>구체적 수수료, 공제 항목 및 요율은 서비스 내 고지된 환불정책을 따릅니다.</li>
                  </ul>
                </section>

                <section className="space-y-3 mt-8">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">제 6조 (판매자의 중도 취소 및 변경 시 환불)</h2>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>리더/판매자의 귀책으로 유료 서비스 제공이 취소·중단·현저히 변경되는 경우, 회사는 관련 사실을 확인하여 전부 또는 일부 환불을 지원합니다.</li>
                    <li>회사는 통신판매중개자로서 환불 절차를 중개·지원할 뿐이며, 판매자의 채무에 대하여 연대책임을 지지 않습니다. 다만, 법령상 회사가 부담하는 책임이 있는 경우 그 범위 내에서만 책임을 집니다.</li>
                    <li>이미 정산된 금액이 있는 경우 회사는 차기 정산에서 상계하거나, 판매자/리더에게 환수 청구할 수 있습니다.</li>
                    <li>환불 기준과 방식은 서비스 내 고지된 정책 및 전자상거래법 등 관계 법령에 따릅니다.</li>
                  </ul>
                </section>

                <section className="space-y-2 mt-8">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">부칙</h2>
                  <p>본 규정은 서비스 정책, 법령 또는 결제/정산 환경의 변경에 따라 개정될 수 있으며, 중요한 변경 사항은 서비스 내 공지사항을 통해 안내합니다.</p>
                  <div className="text-slate-700">
                    <p>공고일자: 2025-10-08</p>
                    <p>시행일자: 2025-10-08</p>
                  </div>
                </section>

                <p className="mt-10 text-sm text-slate-500">최종 업데이트: 2025-10-08</p>
              </article>
            </CardContent>
          </Card>

          <div className="mt-10 border-t border-slate-200" />

          {/* 하단 로고 + 카피라이트 */}
          <div className="mt-6 flex flex-col items-center gap-2 text-slate-700">
            <div className="flex items-center gap-2">
              <span className="relative" style={{ width: 22, height: 22 }}>
                <Image src="/logos/logo_icon.png" alt="Rooted 아이콘" fill sizes="32px" className="object-contain" />
              </span>
              <span className="relative" style={{ width: 96, height: 28 }}>
                <Image src="/logos/logo_main.png" alt="Rooted" fill sizes="120px" className="object-contain" />
              </span>
            </div>
            <p className="text-xs text-slate-400">© 2025 Rooted. All rights reserved.</p>
          </div>
        </div>
      </main>
    </div>
  )
}


