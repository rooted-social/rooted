"use client"

import AnimatedBackground from "@/components/AnimatedBackground"
import { Card, CardContent } from "@/components/ui/card"
import { FileText } from "lucide-react"

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
              <article className="prose prose-slate max-w-none">
                <h2>제1조 (목적)</h2>
                <p>본 약관은 루티드(이하 "회사")가 제공하는 서비스의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항을 정함을 목적으로 합니다.</p>

                <h2>제2조 (정의)</h2>
                <ul>
                  <li>"서비스"란 회사가 제공하는 웹/모바일 기반의 커뮤니티 플랫폼 일체를 의미합니다.</li>
                  <li>"이용자"란 본 약관에 따라 서비스를 이용하는 회원 및 비회원을 말합니다.</li>
                  <li>"회원"이란 서비스에 가입하여 지속적으로 이용하는 자를 의미합니다.</li>
                </ul>

                <h2>제3조 (약관의 게시 및 변경)</h2>
                <ul>
                  <li>회사는 본 약관을 서비스 내 화면에 게시합니다.</li>
                  <li>관련 법령을 위배하지 않는 범위에서 약관을 변경할 수 있으며, 변경 시 개정 내용을 서비스 내에 공지합니다.</li>
                  <li>이용자가 공지일로부터 7일 이내에 이의를 제기하지 않은 경우 변경 약관에 동의한 것으로 봅니다.</li>
                </ul>

                <h2>제4조 (계정 및 보안)</h2>
                <ul>
                  <li>회원은 본인의 책임 하에 계정 및 비밀번호를 관리하여야 합니다.</li>
                  <li>타인의 정보 도용, 공유 등 부정 사용이 확인될 경우 회사는 이용 정지 또는 해지할 수 있습니다.</li>
                </ul>

                <h2>제5조 (서비스의 제공, 변경 및 중단)</h2>
                <ul>
                  <li>회사는 안정적인 서비스 제공을 위해 최선을 다합니다.</li>
                  <li>운영상·기술상 필요 시 서비스 내용을 변경하거나 중단할 수 있으며, 사전 공지합니다. 긴급한 사유가 있는 경우 사후 공지할 수 있습니다.</li>
                </ul>

                <h2>제6조 (콘텐츠와 지식재산권)</h2>
                <ul>
                  <li>서비스 및 이에 포함된 콘텐츠에 대한 저작권과 모든 지식재산권은 회사 또는 해당 권리자에게 귀속됩니다.</li>
                  <li>이용자는 회사의 사전 동의 없이 서비스 내 자료를 복제, 배포, 전송, 2차적 저작물 작성 등 할 수 없습니다.</li>
                </ul>

                <h2>제7조 (금지행위)</h2>
                <ul>
                  <li>법령 또는 미풍양속에 위반되는 행위</li>
                  <li>타인의 권리(저작권, 상표권 등)를 침해하는 행위</li>
                  <li>서비스의 정상적인 운영을 방해하는 행위(스팸, 과도한 트래픽 유발 등)</li>
                </ul>

                <h2>제8조 (면책 및 책임의 제한)</h2>
                <ul>
                  <li>회사는 천재지변, 불가항력, 이용자 귀책 등으로 발생한 손해에 대해 책임을 지지 않습니다.</li>
                  <li>회사는 이용자 상호 간 또는 이용자와 제3자 간에 발생한 분쟁에 개입하지 않으며, 그에 따른 손해에 대해 책임을 지지 않습니다.</li>
                </ul>

                <h2>제9조 (손해배상)</h2>
                <p>이용자가 본 약관을 위반함으로써 회사에 손해가 발생한 경우, 해당 이용자는 회사가 입은 손해를 배상하여야 합니다.</p>

                <h2>제10조 (준거법 및 관할)</h2>
                <p>본 약관은 대한민국 법령에 따르며, 분쟁 발생 시 회사의 본점 소재지를 관할하는 법원을 전속 관할로 합니다.</p>

                <p className="text-sm text-slate-500">최종 업데이트: 2025-09-08</p>
              </article>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}


