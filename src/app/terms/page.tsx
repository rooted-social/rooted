"use client"

import AnimatedBackground from "@/components/AnimatedBackground"
import { Card, CardContent } from "@/components/ui/card"
import { FileText } from "lucide-react"
import Image from "next/image"

export default function TermsPage() {
  return (
    <div className="min-h-screen relative">
      <AnimatedBackground />
      <main className="relative px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 pt-10 pb-24 z-10">
        <div className="w-full max-w-4xl mx-auto">
          <div className="mb-6 text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shadow-lg ring-2 ring-white/60">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">이용약관</h1>
            </div>
            <p className="text-slate-600">루티드 서비스를 이용해 주셔서 감사합니다. 아래 약관은 서비스 이용에 적용됩니다.</p>
          </div>

          <Card className="backdrop-blur-sm bg-white/80 border-slate-200/60 rounded-3xl shadow-xl">
            <CardContent className="p-6 md:p-8">
              <article className="max-w-none text-slate-800 leading-relaxed">
                <section className="space-y-3">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">[제 1장] 총칙</h2>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900">제 1조 (목적)</h3>
                  <p>본 약관은 루티드(Rooted, 이하 “회사”)가 제공하는 웹/모바일 기반 커뮤니티 플랫폼(이하 “서비스”)의 이용과 관련하여 회사와 이용자 간 권리, 의무 및 책임사항, 서비스 이용절차 및 조건 등 제반 사항을 규정함을 목적으로 합니다.</p>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900">제 2조 (약관의 효력 및 변경)</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>본 약관은 서비스 화면에 게시함으로써 효력이 발생합니다.</li>
                    <li>회사는 관련 법령을 위배하지 않는 범위에서 약관을 변경할 수 있으며, 변경 시 사전 공지합니다.</li>
                    <li>이용자가 공지일로부터 7일(중대한 변경은 30일) 내 이의를 제기하지 않은 경우 변경 약관에 동의한 것으로 봅니다.</li>
                  </ul>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900">제 3조 (용어의 정의)</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>“이용자”: 본 약관에 따라 서비스를 이용하는 회원 및 비회원</li>
                    <li>“회원”: 서비스에 가입하여 지속적으로 이용하는 자</li>
                    <li>“커뮤니티”: 회원이 개설하거나 가입하여 활동하는 공간</li>
                    <li>“리더”: 커뮤니티 운영 권한을 가진 회원</li>
                    <li>“멤버”: 커뮤니티에 가입하여 활동하는 회원</li>
                  </ul>
                </section>

                <section className="space-y-3 mt-8">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">[제 2장] 서비스 이용계약</h2>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900">제 4조 (계약의 성립: 회원가입)</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>이용계약은 이용자가 약관에 동의하고 회원가입 양식을 제출하며, 회사가 이를 승낙함으로써 성립합니다.</li>
                    <li>만 14세 미만의 아동은 보호자의 동의가 확인된 경우에 한하여 회원가입이 가능하며, 필요한 절차를 별도로 안내합니다.</li>
                    <li>미성년자는 커뮤니티 멤버로서 서비스 이용은 가능하나, 수익 창출 활동을 수행하는 커뮤니티 리더(판매/정산의 주체)가 될 수 없습니다.</li>
                  </ul>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900">제 5조 (이용신청의 승낙과 제한)</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>회사는 서비스 제공에 지장이 없는 범위에서 신청을 원칙적으로 승낙합니다.</li>
                    <li>다만, 다음의 경우 승낙을 유보하거나 거절할 수 있습니다: 허위 정보 기재, 타인 정보 도용, 법령·약관 위반, 설비 여유 부족 등.</li>
                  </ul>
                </section>

                <section className="space-y-3 mt-8">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">[제 3장] 서비스 이용</h2>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900">제 6조 (서비스 내용)</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>커뮤니티 생성/가입, 게시글·댓글, 일정/수업 관리, 포인트·레벨 등 기능 제공</li>
                    <li>알림/공지, 마이페이지, 통계/분석, 이미지 업로드 등 부가 기능 제공</li>
                  </ul>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900">제 7조 (통신판매중개서비스의 이용)</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>회사는 통신판매중개자로서 거래 당사자가 아니며, 상품/서비스에 대한 책임은 판매자에게 있습니다.</li>
                    <li>회사는 중개 시스템 제공 및 결제 연동 등 플랫폼 기능을 제공합니다.</li>
                  </ul>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900">제 8조 (커뮤니티 서비스의 이용)</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>리더는 커뮤니티 운영 정책을 수립·고지할 수 있으며, 약관 및 법령을 준수해야 합니다.</li>
                    <li>멤버는 커뮤니티 규칙을 준수하여 활동해야 하며, 위반 시 제재될 수 있습니다.</li>
                  </ul>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900">제 9조 (서비스 이용조건)</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>이용자는 정상적인 인터넷 환경과 호환되는 기기를 보유해야 합니다.</li>
                    <li>일부 기능은 최신 브라우저/환경에서만 지원될 수 있습니다.</li>
                  </ul>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900">제 10조 (서비스의 변경 및 중단)</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>운영상·기술상 필요에 따라 서비스 내용이 변경되거나 중단될 수 있으며, 가능한 범위에서 사전 또는 사후 공지합니다.</li>
                    <li>천재지변, 장애, 보안 위협 등 부득이한 경우 사전 고지 없이 변경·중단될 수 있으며, 이로 인한 손해에 대해 회사는 고의 또는 중대한 과실이 없는 한 책임지지 않습니다.</li>
                  </ul>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900">제 11조 (회원정보의 변경)</h3>
                  <p>회원은 등록 정보가 변경된 경우 지체 없이 서비스 내 설정을 통해 수정하여야 합니다.</p>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900">제 12조 (고객의 아이디 및 비밀번호 관리)</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>계정과 비밀번호의 관리책임은 회원에게 있으며, 도용/유출이 발생한 경우 지체 없이 회사에 통지해야 합니다.</li>
                    <li>회사는 필요한 경우 안전한 인증수단 변경·재발급 정책을 시행할 수 있습니다.</li>
                  </ul>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900">제 13조 (정보 제공 및 마케팅의 활용)</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>회사는 서비스 관련 공지, 운영 알림을 제공할 수 있습니다.</li>
                    <li>광고성 정보는 사전 수신동의를 받은 범위에서 전송하며, 수신 거부가 가능합니다.</li>
                  </ul>
                </section>

                <section className="space-y-3 mt-8">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">[제 4장] 서비스 이용의 책임과 의무</h2>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900">제 14조 (회사의 의무)</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>회사는 관련 법령과 약관을 준수하며, 안정적인 서비스 제공을 위해 최선을 다합니다.</li>
                    <li>이용자 불만 처리 및 분쟁 해결을 위해 합리적으로 노력합니다.</li>
                  </ul>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900">제 15조 (회원의 의무) : 커뮤니티 리더, 커뮤니티 멤버</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>리더: 커뮤니티 운영·정산에 관한 책임과 의무를 지며, 법령·약관·정책을 준수합니다.</li>
                    <li>멤버: 커뮤니티 규칙과 공지사항을 준수하며, 타인의 권리를 침해하지 않습니다.</li>
                    <li>회원은 본인이 제공·판매·게시한 콘텐츠/상품/서비스와 관련하여 발생한 모든 법적 책임(저작권·상표권 침해, 세금·환불·분쟁 등)에 대해 회사를 면책하며, 회사가 대신 배상·환불·과징금 등을 부담한 경우 해당 금액 전부를 회사에 구상당할 수 있습니다.</li>
                  </ul>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900">제 16조 (수익의 지급 및 정산)</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>리더 또는 판매자에게 발생하는 수익은 회사가 정한 정산 주기·방법에 따라 지급되며, 부가가치세 및 PG사의 결제대행 수수료, 플랫폼 이용료 등을 공제 후 지급됩니다.</li>
                    <li>공제 항목 및 요율은 서비스 내 고지된 정책을 따르며, 정책 변경 시 적용 시점 및 범위를 사전에 안내합니다.</li>
                    <li>정산 기준과 절차는 서비스 내 또는 별도 정책으로 고지합니다.</li>
                  </ul>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900">제 17조 (커뮤니티 이용의 금지 행위)</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>불법·유해 정보 유포, 타인 비방/괴롭힘, 지식재산권 침해, 스팸/광고 행위</li>
                    <li>서비스 취약점 악용, 시스템 무단 접근, 자동화 도구로의 비정상 이용</li>
                    <li>회원의 불법 콘텐츠/행위로 인해 제3자·기관으로부터 발생하는 민형사·행정상 제재, 세금·환불 요구 등 일체의 책임은 회원에게 있으며, 회사는 연대 책임을 부담하지 않습니다.</li>
                  </ul>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900">제 18조 (회원에 대한 통지)</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>회사는 회원의 등록 이메일, 서비스 내 알림 등으로 통지할 수 있습니다.</li>
                    <li>불특정 다수에 대한 통지는 서비스 내 공지로 갈음할 수 있습니다.</li>
                  </ul>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900">제 19조 (개인정보의 수집과 보호 및 이용)</h3>
                  <p>개인정보의 수집, 이용, 보관, 파기 등은 회사의 개인정보처리방침에 따릅니다.</p>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900">제 20조 (게시물의 관리)</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>커뮤니티의 저작권은 원칙적으로 리더에게 귀속됩니다. 다만, 회사는 서비스 운영, 검색 노출 최적화, 서비스·커뮤니티 홍보 등을 위해 해당 게시물을 전 세계적으로 비독점적·무상으로 사용, 저장, 복제, 전시, 배포, 2차적 저작물 제작(썸네일/리사이즈/스크린샷 포함)할 수 있는 사용권을 가집니다. 회원은 필요한 범위의 이용권 부여에 동의합니다.</li>
                    <li>회사는 저작권을 가진 커뮤니티 리더의 유료 콘텐츠 및 지적 재산을 플랫폼 내 필요 서비스 외 수익을 위한 상업적으로 이용하지 않습니다.</li>
                    <li>회사는 약관·정책 위반, 권리침해, 법령 위반 소지가 있는 게시물에 대해 사전 통지 없이 삭제·이동·비공개 처리할 수 있습니다.</li>
                  </ul>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900">제 21조 (결제 대행 및 결제 대금 보호 서비스의 이용)</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>결제는 결제대행사(PG)를 통해 처리되며, 회사는 PG의 결제 절차를 연동 제공합니다.</li>
                    <li>PG사 정책 변경, 장애 등으로 결제가 제한될 수 있으며, 해당 경우 회사는 합리적으로 대응합니다.</li>
                  </ul>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900">제 22조 (권리의 귀속)</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>서비스와 관련된 지식재산권은 회사 또는 정당한 권리자에게 귀속됩니다.</li>
                    <li>회원이 서비스에 업로드하는 콘텐츠는 제20조에 따른 범위에서 회사가 이용할 수 있습니다.</li>
                    <li>이용자는 회사의 사전 서면 동의 없이 서비스 자료를 무단 이용할 수 없습니다.</li>
                  </ul>
                </section>

                <section className="space-y-3 mt-8">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">[제 5장] 유료 서비스 이용 및 결제</h2>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900">제 23조 (유료 서비스 이용 계약) : 커뮤니티 운영 Plan / 유저 멤버십 결제</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>회사 또는 리더가 제공하는 유료 플랜/멤버십에 대한 계약은 주문 완료 시 성립합니다.</li>
                    <li>제공 범위와 가격, 기간, 혜택은 서비스 내 안내에 따릅니다.</li>
                  </ul>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900">제 24조 (유료 서비스의 주문 및 결제)</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>결제 수단은 PG사를 통해 제공되며, 결제 승인 시점에 요금이 청구됩니다.</li>
                    <li>세금계산서/영수증 등 증빙은 정책에 따라 제공됩니다.</li>
                  </ul>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900">제 25조 (유료 서비스 청약해지 및 정기결제 중단)</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>정기결제는 서비스 내에서 해지 신청할 수 있으며, 다음 결제 주기부터 중단됩니다.</li>
                    <li>전자상거래법 등 관련 법령에 따라 청약철회가 제한될 수 있습니다. 특히 디지털 콘텐츠의 제공이 개시된 경우, 전부 또는 일부 이용이 이루어진 경우, 시간 경과로 재판매가 곤란한 경우 등에는 환불이 제한됩니다.</li>
                    <li>부분 이용이 있는 경우 잔여기간 환불은 제한될 수 있으며, 세부 기준은 환불정책 및 서비스 내 고지에 따릅니다.</li>
                    <li>커뮤니티 멤버십의 경우: 멤버십 시작일로부터 3일 이내에는 환불이 가능하나, 이후에는 커뮤니티 특성상 환불이 불가합니다. 구체 기준은 환불정책을 따릅니다.</li>
                  </ul>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900">제 26조 (유료 서비스 이용의 변경)</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>플랜 업그레이드/다운그레이드 시 차액 정산, 기간 변경 등은 서비스 정책에 따르며, 제공이 개시된 디지털 콘텐츠/서비스에 대해서는 환불이 제한될 수 있습니다.</li>
                    <li>혜택 또는 가격 변경 시 가능한 범위에서 사전 공지하며, 부득이한 경우 사후 공지할 수 있습니다.</li>
                  </ul>
                </section>

                <section className="space-y-3 mt-8">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">[제 6장] 이용계약 해지 등</h2>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900">제 27조 (서비스의 탈퇴 또는 이용제한)</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>회원은 언제든지 탈퇴할 수 있으며, 약관/정책 위반 시 회사는 이용 제한 또는 계약 해지할 수 있습니다.</li>
                    <li>부정 이용, 불법 행위, 타인 권리 침해 등에 대하여 서비스 이용이 제한될 수 있습니다.</li>
                  </ul>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900">제 28조 (손해배상 등)</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>이용자의 귀책사유로 회사에 손해가 발생한 경우, 해당 이용자는 그 손해를 배상하여야 합니다.</li>
                    <li>회원의 위법행위·약관/정책 위반으로 인해 회사가 제3자에게 배상·환불·과징금 등을 지급한 때에는, 회사는 해당 회원에게 그 전액 및 합리적 비용을 구상 청구할 수 있습니다.</li>
                  </ul>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900">제 29조 (면책조항)</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>천재지변, 불가항력, 제3자 귀책, 이용자 귀책 등으로 인한 손해에 대하여 회사는 책임을 지지 않습니다.</li>
                    <li>이용자 상호 간 또는 이용자와 제3자 간 분쟁에 대하여 회사는 개입하지 않으며 책임을 지지 않습니다.</li>
                  </ul>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900">제 30조 (분쟁해결)</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>분쟁은 관련 법령과 상관례에 따라 합리적으로 해결하기 위해 노력합니다.</li>
                    <li>본 약관은 대한민국 법령을 준거로 하며, 관할은 회사 본점 소재지 관할 법원으로 합니다.</li>
                  </ul>
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


