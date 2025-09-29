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


