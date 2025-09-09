"use client"

import AnimatedBackground from "@/components/AnimatedBackground"
import { Card, CardContent } from "@/components/ui/card"
import { Shield } from "lucide-react"

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
            <p className="text-slate-600">루티드는 이용자의 개인정보를 소중히 여기며 관련 법령을 준수합니다.</p>
          </div>

          <Card className="backdrop-blur-sm bg-white/80 border-slate-200/60 rounded-3xl shadow-xl">
            <CardContent className="p-6 md:p-8">
              <article className="prose prose-slate max-w-none">
                <h2>1. 수집하는 개인정보의 항목 및 방법</h2>
                <ul>
                  <li>필수: 이메일, 비밀번호(해시), 사용자명</li>
                  <li>로그 데이터: 접속 기록, 기기/브라우저 정보(서비스 품질 개선 목적)</li>
                </ul>

                <h2>2. 개인정보의 이용 목적</h2>
                <ul>
                  <li>회원 식별, 로그인 및 계정 관리</li>
                  <li>서비스 제공, 운영 및 품질 개선</li>
                  <li>고객 문의 응대, 공지/알림 전달, 보안 모니터링</li>
                </ul>

                <h2>3. 보관 기간 및 파기 절차</h2>
                <ul>
                  <li>관련 법령 또는 내부 정책에 따른 보관 기간을 준수합니다.</li>
                  <li>목적 달성 시 지체 없이 안전한 방법으로 파기합니다(전자적 파일: 복구 불가 조치, 인쇄물: 분쇄).</li>
                </ul>

                <h2>4. 제3자 제공 및 처리 위탁</h2>
                <ul>
                  <li>법령 근거 또는 이용자 동의가 있는 경우에 한하여 제공/위탁합니다.</li>
                  <li>위탁 시 수탁자, 위탁 업무 범위, 보관 기간 등을 고지합니다.</li>
                </ul>

                <h2>5. 이용자의 권리와 행사 방법</h2>
                <ul>
                  <li>이용자는 개인정보 열람, 정정/삭제, 처리정지 등을 요청할 수 있습니다.</li>
                  <li>권리 행사는 고객센터 또는 계정 설정 페이지를 통해 가능합니다.</li>
                </ul>

                <h2>6. 쿠키 및 유사 기술의 사용</h2>
                <p>서비스 개선과 사용자 경험 향상을 위해 쿠키가 사용될 수 있으며, 브라우저 설정을 통해 거부할 수 있습니다.</p>

                <h2>7. 개인정보 안전성 확보 조치</h2>
                <ul>
                  <li>접근 권한 최소화, 암호화 저장(비밀번호 해시), 전송 구간 TLS 적용</li>
                  <li>정기적 보안 점검 및 이상 징후 모니터링</li>
                </ul>

                <h2>8. 문의처</h2>
                <p>개인정보 관련 문의는 서비스 내 문의 채널 또는 지원 메일로 연락해 주세요.</p>

                <p className="text-sm text-slate-500">최종 업데이트: 2025-09-08</p>
              </article>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}


