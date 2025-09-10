// 간단한 컬러 유틸리티: HEX 색상에 대해 대비되는 텍스트 색상(검정/흰색) 계산
// 입력은 "#RRGGBB" 또는 "RRGGBB" 형태를 가정

export function normalizeHex(hex: string): string {
  const h = hex?.trim() || ""
  if (!h) return "#000000"
  return h.startsWith("#") ? h : `#${h}`
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const n = normalizeHex(hex).slice(1)
  const r = parseInt(n.slice(0, 2), 16)
  const g = parseInt(n.slice(2, 4), 16)
  const b = parseInt(n.slice(4, 6), 16)
  return { r, g, b }
}

// WCAG 대비 기준에 근접한 상대 휘도 기반 간이 판단
export function getReadableTextColor(hexBg: string): "#000000" | "#ffffff" {
  try {
    const { r, g, b } = hexToRgb(hexBg)
    // perceived luminance
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
    return luminance > 0.6 ? "#000000" : "#ffffff"
  } catch {
    return "#ffffff"
  }
}

export const BRAND_COLOR_PALETTE: string[] = [
  "#111827", // slate-900
  "#1f2937", // gray-800
  "#0ea5e9", // sky-500
  "#3b82f6", // blue-500
  "#6366f1", // indigo-500
  "#8b5cf6", // violet-500
  "#a855f7", // purple-500
  "#d946ef", // fuchsia-500
  "#ec4899", // pink-500
  "#ef4444", // red-500
  "#f97316", // orange-500
  "#f59e0b", // amber-500
  "#84cc16", // lime-500
  "#22c55e", // green-500
  "#10b981", // emerald-500
  "#14b8a6", // teal-500
  "#06b6d4", // cyan-500
  "#eab308", // yellow-500
  "#64748b", // slate-500
  "#0f766e"  // teal-700
]

// HEX + alpha 적용 (0~1)
export function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex)
  const a = Math.max(0, Math.min(1, alpha))
  return `rgba(${r}, ${g}, ${b}, ${a})`
}


