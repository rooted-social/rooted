"use client"

import { useState, useMemo } from "react"
import { parseYouTubeId, getYouTubeThumbnail } from "@/lib/media"

interface LiteYouTubeProps {
  url?: string | null
  title?: string
  className?: string
}

// 유튜브 가벼운 임베드: 썸네일 + 플레이 버튼만 표시하고, 클릭 시 실제 iframe 로드
export default function LiteYouTube({ url, title = "YouTube video", className }: LiteYouTubeProps) {
  const [playing, setPlaying] = useState(false)
  const id = useMemo(() => parseYouTubeId(url), [url])
  const thumb = useMemo(() => getYouTubeThumbnail(url), [url])

  if (!id) {
    return <div className={`w-full aspect-video bg-slate-100 ${className || ""}`} />
  }

  if (playing) {
    const params = new URLSearchParams({
      autoplay: "1",
      rel: "0",
      modestbranding: "1",
      iv_load_policy: "3",
      playsinline: "1",
      fs: "0",
      color: "white",
      disablekb: "1",
      // 컨트롤을 최소화하여 상단 '나중에 시청/공유' UI가 나타나지 않도록 nocookie + 최소 브랜딩
      controls: "1",
    })
    const src = `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`
    return (
      <iframe
        className={`w-full aspect-video ${className || ""}`}
        src={src}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        frameBorder={0}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        style={{ border: 'none', outline: 'none' }}
      />
    )
  }

  return (
    <button
      type="button"
      aria-label="동영상 재생"
      onClick={() => setPlaying(true)}
      className={`group relative w-full aspect-video overflow-hidden cursor-pointer ${className || ""}`}
    >
      {/* 썸네일 (확대 방지: contain) */}
      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumb} alt={title} className="absolute inset-0 w-full h-full object-cover transform-gpu transition-transform duration-500 group-hover:scale-[1.01]" loading="lazy" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-300" />
      )}

      {/* 어둡게 + 그라데이션 */}
      <div className="absolute inset-0 bg-black/25 group-hover:bg-black/35 transition-colors duration-300" />

      {/* 외곽 글로우 */}
      <div className="pointer-events-none absolute -inset-1 rounded-xl bg-gradient-to-b from-white/5 to-white/0 blur-md opacity-60 group-hover:opacity-80 transition-opacity" />

      {/* 플레이 버튼 */}
      <div className="absolute inset-0 grid place-items-center">
        <span className="relative inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/95 text-slate-900 shadow-[0_12px_40px_rgba(0,0,0,0.25)] ring-1 ring-white/80 transition-transform duration-300 group-hover:scale-105 group-active:scale-100">
          {/* 내부 링 효과 */}
          <span className="absolute inset-0 rounded-full bg-gradient-to-b from-white to-slate-100 opacity-80" />
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" className="relative ml-0.5">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      </div>
    </button>
  )
}


