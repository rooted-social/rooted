// 커뮤니티 공통 카테고리 상수
// 둘러보기/생성/설정 탭에서 동일 옵션을 사용

export const COMMUNITY_CATEGORIES: readonly string[] = [
  '전체',
  '테크 & IT',
  '디자인',
  '비즈니스',
  '투자 & 금융',
  '교육 & 커리어',
  '라이프스타일',
  '건강 & 웰니스',
  '자기계발 & 취미',
] as const

// 기본 선택값 (페이지에 따라 '전체' 또는 첫 실 카테고리를 사용할 수 있음)
export const DEFAULT_EXPLORE_CATEGORY = '전체'


// 커뮤니티 카테고리별 색상 (명확히 구분되는 팔레트)
// Tailwind 배경색 유틸 클래스를 사용
export const COMMUNITY_CATEGORY_COLOR: Record<string, string> = {
  '테크 & IT': 'bg-sky-500',
  '디자인': 'bg-fuchsia-500',
  '비즈니스': 'bg-emerald-500',
  '투자 & 금융': 'bg-amber-500',
  '교육 & 커리어': 'bg-indigo-500',
  '라이프스타일': 'bg-teal-500',
  '건강 & 웰니스': 'bg-rose-500',
  '자기계발 & 취미': 'bg-violet-500',
}


// Plan configuration (Beta)
export const PLAN_CONFIG = {
  starter: { label: 'Starter', memberLimit: 300, pageLimit: 10, fee: '5.5%' },
  pro: { label: 'Pro', memberLimit: 3000, pageLimit: 100, fee: '2.9%' },
  pro_plus: { label: 'Pro Plus', memberLimit: null as number | null, pageLimit: null as number | null, fee: '3.9%' },
} as const

export type PlanKey = keyof typeof PLAN_CONFIG

