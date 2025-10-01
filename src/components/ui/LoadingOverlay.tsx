'use client'

import { useEffect, useState } from 'react'

interface LoadingOverlayProps {
  show: boolean
  text?: string
}

export default function LoadingOverlay({ show, text = '커뮤니티 입장 중..' }: LoadingOverlayProps) {
  const [visible, setVisible] = useState(show)
  const [animateIn, setAnimateIn] = useState(false)

  useEffect(() => {
    if (show) {
      setVisible(true)
      const id = requestAnimationFrame(() => setAnimateIn(true))
      return () => cancelAnimationFrame(id)
    } else if (visible) {
      setAnimateIn(false)
      const timer = setTimeout(() => setVisible(false), 200)
      return () => clearTimeout(timer)
    }
  }, [show, visible])

  if (!visible) return null

  return (
    <div className={`fixed inset-0 z-[100] ${animateIn ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200`} aria-live="polite" aria-busy={show}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" />
      <div className="relative h-full w-full grid place-items-center select-none">
        <div className={`rounded-2xl border border-white/10 bg-white/10 backdrop-blur-md px-6 py-5 shadow-2xl ${animateIn ? 'scale-100' : 'scale-95'} transition-transform duration-200`}>
          <div className="flex items-center gap-3">
            <Spinner />
            <span className="text-white/95 text-sm font-medium tracking-wide">{text}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <div className="relative h-5 w-5" role="status" aria-label="loading">
      <div className="absolute inset-0 rounded-full border-2 border-white/20" />
      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-white animate-spin [animation-duration:900ms]" />
    </div>
  )
}


