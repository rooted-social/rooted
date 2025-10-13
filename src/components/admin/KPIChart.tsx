"use client"

import { useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type Point = { key: string; users: number; communities: number }

export default function KPIChart({ initialDays = 90 }: { initialDays?: number }) {
  const [days, setDays] = useState(String(initialDays))
  const [gran, setGran] = useState<'day'|'week'|'month'>('day')
  const [cumulative, setCumulative] = useState<'0'|'1'>('0')
  const [series, setSeries] = useState<Point[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let aborted = false
    const load = async () => {
      setLoading(true); setError(null)
      try {
        const qs = new URLSearchParams({ days, gran, cum: cumulative })
        const res = await fetch(`/api/admin/kpi?${qs.toString()}`, { cache: 'no-store' })
        if (!res.ok) throw new Error('failed to load kpi')
        const data = await res.json()
        if (!aborted) setSeries((data?.series || []) as Point[])
      } catch (e: any) {
        if (!aborted) setError(e?.message || 'load failed')
      } finally { if (!aborted) setLoading(false) }
    }
    load()
    return () => { aborted = true }
  }, [days, gran, cumulative])

  const dims = { w: 960, h: 340, pad: 40 }
  const maxY = useMemo(() => Math.max(1, ...series.map(s => Math.max(s.users, s.communities))), [series])
  const x = (i: number) => {
    const maxX = Math.max(1, series.length - 1)
    return dims.pad + (i / maxX) * (dims.w - dims.pad * 2)
  }
  const y = (v: number) => dims.h - dims.pad - (v / maxY) * (dims.h - dims.pad * 2)

  const [hover, setHover] = useState<{ i: number; px: number; pyU: number; pyC: number } | null>(null)

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-sm text-slate-600">Growth over time</div>
          <div className="text-xs text-slate-400">Users vs Communities</div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="h-8 w-[100px] cursor-pointer"><SelectValue placeholder="Days" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30d</SelectItem>
              <SelectItem value="90">90d</SelectItem>
              <SelectItem value="180">180d</SelectItem>
              <SelectItem value="365">365d</SelectItem>
            </SelectContent>
          </Select>
          <Select value={gran} onValueChange={(v) => setGran(v as any)}>
            <SelectTrigger className="h-8 w-[110px] cursor-pointer"><SelectValue placeholder="Granularity" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
            </SelectContent>
          </Select>
          <Select value={cumulative} onValueChange={(v) => setCumulative(v as '0'|'1')}>
            <SelectTrigger className="h-8 w-[130px] cursor-pointer"><SelectValue placeholder="Mode" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Per interval</SelectItem>
              <SelectItem value="1">Cumulative</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="mt-4 overflow-x-auto">
        {loading ? (
          <div className="text-sm text-slate-500 p-4">로딩 중…</div>
        ) : error ? (
          <div className="text-sm text-red-600 p-4">{error}</div>
        ) : series.length === 0 ? (
          <div className="text-sm text-slate-500 p-4">데이터가 없습니다.</div>
        ) : (
          <svg viewBox={`0 0 ${dims.w} ${dims.h}`} className="min-w-[840px] w-full h-[340px] bg-gradient-to-b from-white to-slate-50 rounded-xl">
            {/* axes */}
            <line x1={dims.pad} y1={dims.h-dims.pad} x2={dims.w-dims.pad} y2={dims.h-dims.pad} stroke="#94a3b8" />
            <line x1={dims.pad} y1={dims.pad} x2={dims.pad} y2={dims.h-dims.pad} stroke="#94a3b8" />
            {/* grid */}
            {Array.from({ length: 5 }).map((_, i) => {
              const v = (i/4) * maxY
              const yy = y(v)
              return <g key={i}><line x1={dims.pad} y1={yy} x2={dims.w-dims.pad} y2={yy} stroke="#e2e8f0" strokeDasharray="6 6" /><text x={10} y={yy+4} fontSize={10} fill="#94a3b8">{Math.round(v)}</text></g>
            })}
            {/* smoothed area + line */}
            {(['users','communities'] as const).map((key) => {
              const color = key === 'users' ? '#111827' : '#2563eb'
              const fill = key === 'users' ? 'url(#gradUsers)' : 'url(#gradComms)'
              const pts = series.map((s, i) => `${x(i)},${y((s as any)[key])}`).join(' ')
              // simple smoothing via polyline (kept for performance); could switch to path with cubic curves if needed
              return (
                <g key={key}>
                  <polyline points={`${x(0)},${y(0)} ${pts} ${x(series.length-1)},${y(0)}`} fill={fill} opacity={0.18} />
                  <polyline points={pts} fill="none" stroke={color} strokeWidth={2.5} />
                </g>
              )
            })}
            {/* gradients */}
            <defs>
              <linearGradient id="gradUsers" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#111827" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#111827" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="gradComms" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* hover dots/labels */}
            {series.map((s, i) => {
              const px = x(i)
              const pyU = y(s.users)
              const pyC = y(s.communities)
              return (
                <g key={i}
                  onMouseEnter={() => setHover({ i, px, pyU, pyC })}
                  onMouseLeave={() => setHover(null)}>
                  <circle cx={px} cy={pyU} r={3} fill="#111827" />
                  <circle cx={px} cy={pyC} r={3} fill="#2563eb" />
                </g>
              )
            })}
            {hover && (
              <g>
                <line x1={hover.px} y1={dims.pad} x2={hover.px} y2={dims.h-dims.pad} stroke="#cbd5e1" strokeDasharray="4 4" />
                {/* tooltip */}
                <foreignObject x={Math.min(hover.px+8, dims.w-220)} y={dims.pad+10} width="210" height="64">
                  <div className="rounded-xl bg-slate-900/95 text-white p-3 shadow-xl">
                    <div className="text-[11px] opacity-80">{series[hover.i]?.key}</div>
                    <div className="text-xs mt-1 flex items-center gap-3">
                      <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-900 inline-block" />Users <b className="ml-1">{series[hover.i]?.users}</b></span>
                      <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />Comms <b className="ml-1">{series[hover.i]?.communities}</b></span>
                    </div>
                  </div>
                </foreignObject>
              </g>
            )}
            {/* x tick labels (sparse) */}
            {series.map((s, i) => (i % Math.ceil(series.length / 8) === 0) && (
              <text key={`xt-${i}`} x={x(i)} y={dims.h-10} fontSize={10} textAnchor="middle" fill="#94a3b8">{s.key}</text>
            ))}
          </svg>
        )}
      </div>
    </Card>
  )
}


