import Link from "next/link"
import Image from "next/image"

// 푸터 컴포넌트: 메인 페이지 톤앤매너(화이트 베이스, 슬레이트 계열, 섬세한 보더/그라데이션)와 일관되게 구성
export default function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="relative bg-gradient-to-b from-black to-[#0b0b0b] text-slate-200">
      {/* 상단 그라데이션 보더 */}
      <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* 상단 간격 축소 */}
        <div className="py-4" />

        {/* 로고 + 문구 + 네비게이션 (구분선 안으로) */}
        <div className="grid grid-cols-1 md:grid-cols-3 items-start gap-4 border-t border-slate-200/80 pt-5 pb-5">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <Link href="/" className="inline-flex items-center gap-2 rounded-md border px-1.5 py-1 h-8 border-white/20 bg-white ring-1 ring-white/30 shadow-sm hover:bg-white/95 transition-colors">
                <Image src="/logos/logo_icon.png" alt="Rooted 아이콘" width={22} height={22} className="w-4.5 h-4.5" priority />
                <span className="relative" style={{ width: 54, height: 16 }}>
                  <Image src="/logos/logo_main.png" alt="Rooted" fill sizes="100px" className="object-contain" priority />
                </span>
              </Link>
              <p className="text-sm sm:text-[15px] text-slate-300">All in one 커뮤니티 플랫폼.</p>
            </div>
            <div className="mt-1 space-y-1 text-xs text-slate-400">
              <p>대표: 송규석</p>
              <p>주소: 서울특별시 서초구 서초동 1327-23, 11층</p>
              <p>사업자등록번호: 149-27-01015</p>
              <p>
                이메일: <a className="hover:text-slate-700 underline underline-offset-2" href="mailto:hello@rooted.app">info@rooted.kr</a>
              </p>
            </div>
          </div>

          {/* 네비게이션 그룹 (리소스 제거) */}
          <div>
            <h3 className="text-sm font-semibold text-white">제품</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              <li><Link className="hover:text-white" href="/features">서비스 소개</Link></li>
              <li><Link className="hover:text-white" href="/pricing">가격 안내</Link></li>
              <li><Link className="hover:text-white" href="/explore">루트 둘러보기</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">정책</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              <li><Link className="hover:text-white" href="/privacy">개인정보 처리방침</Link></li>
              <li><Link className="hover:text-white" href="/terms">이용약관</Link></li>
            </ul>
          </div>
        </div>

        {/* 하단 카피라이트 */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-t border-white/10 py-3 text-xs text-slate-400">
          <p>© {year} Rooted. All rights reserved.</p>
          <p className="text-slate-400">Built for communities.</p>
        </div>
      </div>
    </footer>
  )
}


