export function parseYouTubeId(url?: string | null): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtu.be')) {
      return u.pathname.split('/').filter(Boolean)[0] || null
    }
    if (u.searchParams.get('v')) return u.searchParams.get('v')
    // /shorts/<id> or /embed/<id>
    const parts = u.pathname.split('/').filter(Boolean)
    if (parts[0] === 'shorts' || parts[0] === 'embed') return parts[1] || null
    return null
  } catch {
    return null
  }
}

export function getYouTubeEmbedUrl(url?: string | null): string | null {
  const id = parseYouTubeId(url)
  if (!id) return null
  const params = new URLSearchParams({
    // 관련 동영상 표시 안함
    rel: '0',
    // 유튜브 브랜딩 최소화
    modestbranding: '1',
    // 주석 표시 안함
    iv_load_policy: '3',
    // 모바일에서 인라인 재생
    playsinline: '1',
    // 전체화면 버튼 숨김
    fs: '0',
    // 진행바 색상
    color: 'white',
    // 제목과 공유 버튼 숨김 (deprecated이지만 일부 브라우저에서 동작)
    showinfo: '0',
    // 컨트롤바 자동 숨김 설정 (2초 후 숨김)
    autohide: '1',
    // 키보드 단축키 비활성화
    disablekb: '1',
    // 유튜브 로고 클릭 비활성화
    cc_load_policy: '0'
  })
  return `https://www.youtube.com/embed/${id}?${params.toString()}`
}

export function getYouTubeThumbnail(url?: string | null): string | null {
  const id = parseYouTubeId(url)
  if (!id) return null
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
}


