'use client'

import { useEffect, useRef } from 'react'

// 심플한 연결선/점 배경 효과 (흰색 계열), 블랙 배경 위 사용권장
export default function HeroConnections() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    const DPR = Math.min(window.devicePixelRatio || 1, 2)

    const resize = () => {
      canvas.width = Math.floor(window.innerWidth * DPR)
      canvas.height = Math.floor(window.innerHeight * DPR)
      canvas.style.width = '100%'
      canvas.style.height = '100%'
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    type Node = { x: number; y: number; vx: number; vy: number }
    const isMobile = window.matchMedia('(max-width: 768px)').matches
    const NODE_COUNT = isMobile ? 45 : 90
    const nodes: Node[] = Array.from({ length: NODE_COUNT }).map(() => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
    }))

    const draw = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      ctx.clearRect(0, 0, w, h)

      // 중심 좌표 (비네트에만 사용)
      const cx = w * 0.5
      const cy = h * 0.42

      // 중앙 행성/헤일로 레이어 제거

      if (!isMobile) {
        // 곡선 웨이브 레이어
        ctx.save()
        ctx.strokeStyle = 'rgba(255,255,255,0.18)'
        const WAVE_COUNT = isMobile ? 5 : 8
        for (let i = 0; i < WAVE_COUNT; i++) {
          const yBase = h * 0.30 + i * 40
          ctx.beginPath()
          for (let x = 0; x <= w; x += 6) {
            const y = yBase + Math.sin((x + performance.now() * 0.04 + i * 120) / (220 + i * 12)) * 40
            if (x === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
          ctx.stroke()
        }
        ctx.restore()
      }

      // 연결 점/선 레이어

      for (const n of nodes) {
        n.x += n.vx
        n.y += n.vy
        if (n.x < 0 || n.x > w) n.vx *= -1
        if (n.y < 0 || n.y > h) n.vy *= -1
      }

      const CONNECT_DIST = isMobile ? 110 : 150
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i]
          const b = nodes[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const dist = Math.hypot(dx, dy)
          if (dist < CONNECT_DIST) {
            const alpha = 1 - dist / CONNECT_DIST
            ctx.strokeStyle = `rgba(255,255,255,${0.45 * alpha})`
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
      }

      // 점 (조금 더 밝게 + 은은한 글로우)
      ctx.save()
      ctx.shadowColor = 'rgba(255,255,255,0.55)'
      ctx.shadowBlur = 6
      ctx.fillStyle = 'rgba(255,255,255,0.92)'
      const DOT_R = isMobile ? 1.4 : 1.6
      for (const n of nodes) {
        ctx.beginPath()
        ctx.arc(n.x, n.y, DOT_R, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()

      if (!isMobile) {
        // 비네트(가독성 강조를 위한 가장자리 어둡게)
        ctx.save()
        const vignette = ctx.createRadialGradient(cx, cy, Math.min(w, h) * 0.55, cx, cy, Math.hypot(w, h) * 0.65)
        vignette.addColorStop(0.0, 'rgba(0,0,0,0.0)')
        vignette.addColorStop(1.0, 'rgba(0,0,0,0.35)')
        ctx.fillStyle = vignette
        ctx.fillRect(0, 0, w, h)
        ctx.restore()
      }

      raf = requestAnimationFrame(draw)
    }

    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
}


