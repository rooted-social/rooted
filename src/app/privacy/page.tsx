"use client"

import AnimatedBackground from "@/components/AnimatedBackground"
import { Card, CardContent } from "@/components/ui/card"
import { Shield } from "lucide-react"
import Image from "next/image"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen relative">
      <AnimatedBackground />
      <main className="relative px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 pt-10 pb-24 z-10">
        <div className="w-full max-w-4xl mx-auto">
          <div className="mb-6 text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shadow-lg ring-2 ring-white/60">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">개인정보처리방침</h1>
            </div>
            <p className="text-slate-600">루티드(Rooted)는 이용자의 개인정보를 소중히 여기며, 개인정보 보호법 및 관련 법령을 준수합니다.</p>
          </div>

          <Card className="backdrop-blur-sm bg-white/80 border-slate-200/60 rounded-3xl shadow-xl">
            <CardContent className="p-6 md:p-8">
              <article className="max-w-none text-slate-800 leading-relaxed">
                <section className="space-y-3">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">1. 총칙</h2>
                  <p>루티드(Rooted, 이하 “회사”)는 이용자의 개인정보를 소중히 여기며, 개인정보 보호법, 정보통신망법 등 관련 법령을 준수합니다. 본 개인정보처리방침은 회사가 제공하는 웹/모바일 서비스 전반에 적용되며, 개인정보의 수집·이용·보관·파기에 관한 기준과 이용자의 권리 및 행사 방법을 명확히 안내합니다.</p>
                </section>

                <section className="space-y-3 mt-8">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">2. 개인정보의 수집 및 이용목적</h2>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>회원 식별 및 본인확인, 로그인 및 계정 관리</li>
                    <li>커뮤니티 생성/가입, 게시글·댓글 작성 등 핵심 기능 제공</li>
                    <li>활동 기반 포인트·레벨 산정, 통계/분석을 통한 서비스 품질 개선</li>
                    <li>고객 문의 응대, 공지/알림 전달, 부정 이용 방지 및 보안 모니터링</li>
                    <li>법령 준수, 분쟁 대응, 민원 처리 및 기록 보존</li>
                  </ul>
                </section>

                <section className="space-y-3 mt-8">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">3. 수집하는 개인정보 항목과 수집방법</h2>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-slate-900">[회원]</h3>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>필수: 이메일, 비밀번호(해시 처리), 사용자명/닉네임</li>
                      <li>선택: 프로필 이미지, 자기소개, 소속/관심사</li>
                      <li>로그/기기 정보: 접속 IP, 브라우저/OS, 접속 시간, 쿠키/세션 식별자</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-slate-900">[정기결제 회원]</h3>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>필수: 결제 식별 정보(토큰화된 결제수단 식별자), 결제 이력(승인/취소 여부 등)</li>
                      <li>청구/정산 목적의 최소 정보(전자영수증 이메일 등)</li>
                      <li className="text-slate-600">결제정보(카드 번호 등 민감 정보)는 결제대행사(PG)에서 직접 처리하며, 회사는 원문을 보관하지 않습니다.</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-slate-900">[비회원]</h3>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>고객 문의 시: 이메일, 이름(또는 닉네임), 문의 내용</li>
                      <li>이벤트/프로모션 참여 시: 필수 동의 범위 내 최소 정보</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-slate-900">[기타]</h3>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>이미지 업로드 시: 파일 메타데이터(파일명, 사이즈, MIME 등)</li>
                      <li>서비스 보안/운영 목적: 오류 로그, 비정상 접근에 대한 탐지 정보</li>
                    </ul>
                  </div>
                  <p className="text-slate-700">수집방법: 서비스 회원가입/이용 과정에서 이용자가 직접 입력, 서비스 이용 중 자동 생성(쿠키/세션/로그), 고객센터 문의, 이벤트 응모, 합법적 제휴사 제공 등.</p>
                </section>

                <section className="space-y-3 mt-8">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">4. 개인정보 제3자 제공</h2>
                  <p>회사는 원칙적으로 이용자의 개인정보를 사전 동의 없이 제3자에게 제공하지 않습니다. 다만 다음의 경우 예외로 합니다.</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>이용자가 사전에 제3자 제공에 명시적으로 동의한 경우</li>
                    <li>법령에 근거가 있거나 수사기관의 적법한 절차에 따른 요청이 있는 경우</li>
                    <li>서비스 제공을 위해 불가피한 범위에서 최소 정보만을 가명/익명 처리하여 제공하는 경우</li>
                  </ul>
                </section>

                <section className="space-y-3 mt-8">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">5. 개인정보 위탁 업무 및 수탁사 안내</h2>
                  <p>원활한 서비스 제공을 위해 일부 업무를 외부 전문업체에 위탁할 수 있으며, 위탁 시 관련 법령에 따라 안전하게 관리되도록 감독합니다.</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>인프라/호스팅: Vercel Inc. (서비스 서버/배포)</li>
                    <li>데이터베이스/인증/스토리지: Supabase (로그인, DB, 서버리스, 일부 스토리지)</li>
                    <li>이미지 스토리지: Cloudflare R2 (이미지 업로드/보관)</li>
                    <li>이메일/알림: 도입 시 본 방침 또는 공지사항을 통해 고지</li>
                    <li>결제/정기결제: 결제대행사(PG) 도입 시 수탁사, 위탁 업무, 보관 기간 등을 사전 고지</li>
                  </ul>
                </section>

                <section className="space-y-3 mt-8">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">6. 개인정보의 처리 및 보유기간</h2>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>원칙: 처리 목적 달성 후 또는 회원 탈퇴 시 지체 없이 파기합니다.</li>
                    <li>예외: 법령에 따라 일정 기간 보관해야 하는 경우 아래 기간 동안 보관 후 파기합니다.</li>
                  </ul>
                  <div className="mt-2">
                    <ul className="list-disc pl-5 space-y-1 text-slate-700">
                      <li>계약/청약철회 등에 관한 기록: 5년 (전자상거래 등에서의 소비자보호에 관한 법률)</li>
                      <li>대금결제 및 재화 등의 공급에 관한 기록: 5년 (전자상거래법)</li>
                      <li>소비자 불만 또는 분쟁처리에 관한 기록: 3년 (전자상거래법)</li>
                      <li>표시/광고에 관한 기록: 6개월 (전자상거래법)</li>
                      <li>전자금융거래에 관한 기록: 5년 (전자금융거래법)</li>
                      <li>접속 로그, 접속지 IP 등 서비스 방문 기록: 3개월 (통신비밀보호법)</li>
                      <li>세법 등 관계 법령에 따른 거래 관련 장부/증빙: 5년 이상 (국세기본법 등)</li>
                    </ul>
                  </div>
                </section>

                <section className="space-y-3 mt-8">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">7. 개인정보 파기절차 및 방법</h2>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>파기절차: 보관 기간 만료 또는 처리 목적 달성 시 내부 검토 후 지체 없이 파기</li>
                    <li>파기방법: 전자적 파일은 복구 불가능한 방식으로 영구 삭제, 출력물은 분쇄</li>
                    <li>일부 정보는 법령에 따른 보관 의무로 인해 별도 DB로 분리 보관 후 기한 경과 시 즉시 파기</li>
                  </ul>
                </section>

                <section className="space-y-3 mt-8">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">8. 이용자의 권리와 행사 방법</h2>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>이용자는 언제든지 본인의 개인정보에 대한 열람, 정정/삭제, 처리정지, 동의 철회를 요청할 수 있습니다.</li>
                    <li>권리 행사는 서비스 내 설정 페이지 또는 아래 문의처를 통해 가능합니다. 대리인을 통한 행사도 가능합니다.</li>
                    <li>요청 접수 시 회사는 지체 없이 처리하며, 법정 처리기한인 10일 이내 결과를 통지합니다. 불가피한 지연 시 지연 사유와 처리 계획을 안내합니다.</li>
                    <li>법령상 보관이 요구되는 정보는 삭제/처리정지가 제한될 수 있으며, 이 경우 사유를 안내합니다.</li>
                  </ul>
                </section>

                <section className="space-y-3 mt-8">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">12. 미성년자 이용자에 관한 사항</h2>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>만 14세 미만의 이용자는 법정대리인(보호자)의 동의가 필요한 경우가 있으며, 필요한 동의 절차를 별도로 안내합니다.</li>
                    <li>미성년자는 커뮤니티 멤버로서 서비스 이용은 가능하나, 수익 창출 활동을 수행하는 커뮤니티 리더(판매/정산의 주체)가 될 수 없습니다.</li>
                  </ul>
                </section>

                <section className="space-y-3 mt-8">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">13. 광고성 정보 발송(마케팅의 활용)</h2>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>회사는 이벤트, 혜택, 신규 기능 등의 정보를 제공하기 위해 광고성 정보를 발송할 수 있으며, 이는 사전 수신 동의를 받은 범위에서만 이루어집니다.</li>
                    <li>이용자는 설정 페이지, 이메일 하단의 수신거부 링크 등으로 언제든지 수신을 거부할 수 있습니다.</li>
                    <li>광고성 정보 수신 동의와 무관하게 서비스 운영에 필수적인 공지(보안/약관·정책 변경/중요 서비스 공지)는 발송될 수 있습니다.</li>
                  </ul>
                </section>

                <section className="space-y-3 mt-8">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">14. 책임 제한 및 유의사항</h2>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>회사는 이용자의 과실(계정 공유/관리 소홀, 악성코드 감염 등) 또는 회사의 관리 범위를 벗어난 외부 서비스/링크/수탁사의 시스템 장애로 인한 손해에 대하여 법령이 허용하는 범위 내에서 책임을 부담하지 않습니다.</li>
                    <li>가명/익명 처리된 통계·분석 자료는 개인 식별이 불가능한 형태로 활용되며, 해당 자료의 활용으로 특정 개인이 식별되는 경우를 제외하고 회사는 책임을 지지 않습니다.</li>
                  </ul>
                </section>

                <section className="space-y-3 mt-8">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">9. 개인정보 자동 수집 장치의 설치·운영 및 거부</h2>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>회사는 서비스 품질 개선과 사용자 경험 향상을 위해 쿠키, 로컬 스토리지, 세션, 토큰 등을 사용할 수 있습니다.</li>
                    <li>브라우저 설정에서 쿠키 저장을 거부하거나 삭제할 수 있으나, 일부 기능 이용에 제한이 있을 수 있습니다.</li>
                    <li>인증 토큰은 보안을 위해 전송 구간에 TLS를 적용하며, 필요 시 만료/재발급 정책을 운영합니다.</li>
                  </ul>
                </section>

                <section className="space-y-3 mt-8">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">10. 개인정보보호를 위한 기술적·관리적 조치</h2>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>접근통제: 최소 권한 원칙 적용, 역할 기반 접근 제어, 비정상 접근 탐지</li>
                    <li>암호화: 비밀번호 해시 처리, 전송 구간 TLS 적용, 저장 데이터의 암호화(수탁 인프라 정책 준수)</li>
                    <li>로그/감사: 중요 행위 로깅 및 이상 징후 모니터링</li>
                    <li>관리적 조치: 정기적 권한 점검, 내부 보안 교육, 위탁사 관리·감독</li>
                    <li>물리적 조치: 수탁 인프라 제공사의 데이터센터 보안 정책 준수</li>
                  </ul>
                </section>

                <section className="space-y-3 mt-8">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">11. 개인정보 보호책임자 안내</h2>
                  <div className="space-y-1">
                    <p>개인정보 보호책임자: 송규석</p>
                    <p>이메일: <a className="underline underline-offset-2 text-slate-800 hover:text-slate-900" href="mailto:info@rooted.kr">info@rooted.kr</a></p>
                    <p>주소: 서울특별시 서초구 서초동 1327-23</p>
                  </div>
                </section>

                <section className="space-y-2 mt-8">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">부칙</h2>
                  <p>본 개인정보처리방침은 서비스 정책, 법령 또는 보안 요구사항의 변경에 따라 개정될 수 있으며, 중요한 변경 사항은 서비스 내 공지사항을 통해 사전에 안내합니다.</p>
                  <div className="text-slate-700">
                    <p>공고일자: 2025-10-08</p>
                    <p>시행일자: 2025-10-08</p>
                  </div>
                </section>

                <p className="mt-10 text-sm text-slate-500">최종 업데이트: 2025-10-08</p>
              </article>
            </CardContent>
          </Card>

          {/* 하단 로고 + 슬로건 + 카피라이트 */}
          <div className="mt-10 flex flex-col items-center gap-2 text-slate-700">
            <div className="flex items-center gap-2">
              <span className="relative" style={{ width: 22, height: 22 }}>
                <Image src="/logos/logo_icon.png" alt="Rooted 아이콘" fill sizes="32px" className="object-contain" />
              </span>
              <span className="relative" style={{ width: 96, height: 28 }}>
                <Image src="/logos/logo_main.png" alt="Rooted" fill sizes="120px" className="object-contain" />
              </span>
            </div>
            <p className="text-sm text-slate-500">All in one 커뮤니티 플랫폼.</p>
            <p className="text-xs text-slate-400">© 2025 Rooted. All rights reserved.</p>
          </div>
        </div>
      </main>
    </div>
  )
}


