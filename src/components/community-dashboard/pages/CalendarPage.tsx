"use client"

import { useEffect, useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getCommunityEvents, createCommunityEvent, updateCommunityEvent, deleteCommunityEvent, getCalendarOverview } from "@/lib/events"
import { Calendar as CalendarIcon, MapPin, Clock, ChevronLeft, ChevronRight, Settings, ListChecks } from "lucide-react"
import { toast } from "sonner"
import { getCommunitySettings } from "@/lib/communities"
import { getReadableTextColor } from "@/utils/color"
import { useAuthData } from "@/components/auth/AuthProvider"

type CalendarEvent = {
  id: string
  community_id: string
  title: string
  description?: string | null
  location?: string | null
  start_at: string
  end_at: string
  color: string
}

const COLORS = [
  "#a5b4fc", "#c4b5fd", "#fbcfe8", "#fcd34d", "#6ee7b7",
  "#67e8f9", "#fde68a", "#fca5a5", "#93c5fd", "#f0abfc"
]

export default function CalendarPage({ communityId }: { communityId: string }) {
  const { user } = useAuthData()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    startDate: new Date().toISOString().slice(0,10),
    start: "10:00",
    endDate: new Date().toISOString().slice(0,10),
    end: "11:00",
    color: COLORS[0],
  })
  const [detail, setDetail] = useState<CalendarEvent | null>(null)
  const [isOwner, setIsOwner] = useState<boolean>(false)
  const [brandColor, setBrandColor] = useState<string | null>(null)

  const todayStr = new Date().toISOString().slice(0,10)
  const todayEvents = useMemo(() => events.filter(e => e.start_at.slice(0,10) === todayStr), [events, todayStr])
  const upcoming = useMemo(() => events.filter(e => e.start_at.slice(0,10) > todayStr).sort((a,b)=> a.start_at.localeCompare(b.start_at)).slice(0,5), [events, todayStr])

  const queryClient = useQueryClient()
  const { data: calData, isFetching: loadingOverview } = useQuery({
    queryKey: ['calendar.overview', communityId, user?.id || 'guest'],
    queryFn: async () => await getCalendarOverview(communityId),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
  useEffect(() => {
    if (!calData) return
    setEvents(calData.events || [])
    setIsOwner(!!calData.isOwner)
    setBrandColor(calData.brandColor || null)
    setLoading(false)
  }, [calData])

  // 오너 판별은 overview에서 함께 처리

  // 브랜드 컬러는 overview에서 함께 처리

  const onCreate = async () => {
    const start_at = new Date(`${form.startDate}T${form.start}:00`).toISOString()
    const end_at = new Date(`${form.endDate}T${form.end}:00`).toISOString()
    try {
      const created = await createCommunityEvent({
        community_id: communityId,
        title: form.title,
        description: form.description,
        location: form.location,
        start_at,
        end_at,
        color: form.color,
      })
      // 낙관적 반영
      const optimistic = {
        id: (created as any)?.id || `tmp-${Date.now()}`,
        community_id: communityId,
        title: form.title,
        description: form.description || null,
        location: form.location || null,
        start_at,
        end_at,
        color: form.color,
      } as any
      setEvents(prev => [optimistic, ...prev])
      toast.success('이벤트가 생성되었습니다')
    } catch (e: any) {
      toast.error(e?.message || '생성 중 오류가 발생했습니다')
    } finally {
      setOpen(false)
      setForm(prev => ({ ...prev, title: "", description: "" }))
      await queryClient.invalidateQueries({ queryKey: ['calendar.overview', communityId] })
    }
  }

  // 매우 간단한 월 캘린더 렌더링
  const [cursor, setCursor] = useState(new Date())
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const first = new Date(year, month, 1)
  const startWeekday = (first.getDay() + 6) % 7 // Mon=0
  const daysInMonth = new Date(year, month+1, 0).getDate()
  const cells = Array.from({length: startWeekday + daysInMonth}).map((_,i)=> i < startWeekday ? null : i - startWeekday + 1)

  const eventsByDay = useMemo(() => {
    // 달력 그리드에 기간 이벤트가 걸쳐 보이도록, 해당 월의 각 날짜 키에 이벤트를 채운다
    const map: Record<number, CalendarEvent[]> = {}
    for (const e of events) {
      const start = new Date(e.start_at)
      const end = new Date(e.end_at)
      // 이벤트 기간 내 각 날짜를 순회
      const cursorDate = new Date(start.getFullYear(), start.getMonth(), start.getDate())
      const lastDate = new Date(end.getFullYear(), end.getMonth(), end.getDate())
      while (cursorDate.getTime() <= lastDate.getTime()) {
        if (cursorDate.getFullYear() === year && cursorDate.getMonth() === month) {
          const day = cursorDate.getDate()
          map[day] = map[day] || []
          // 중복 삽입 방지: 같은 이벤트가 같은 날짜에 두 번 들어가지 않도록 id 기반 체크
          if (!map[day].some(ev => ev.id === e.id)) {
            map[day].push(e)
          }
        }
        // 다음 날짜로 이동
        cursorDate.setDate(cursorDate.getDate() + 1)
      }
    }
    return map
  }, [events, year, month])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 pt-10 md:pt-0">
      <div className="md:grid md:grid-cols-3 gap-6 max-w-8xl mx-auto p-4">
        <div className="md:col-span-2 space-y-6">
          {/* 헤더 섹션 */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-slate-200/50 shadow-sm p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4 md:gap-0">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-2xl ${brandColor ? '' : 'bg-gradient-to-br from-indigo-500 to-purple-600'} shadow-lg`}
                  style={brandColor ? { backgroundImage: 'none', backgroundColor: brandColor } : undefined}
                >
                  <CalendarIcon className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  캘린더
                </h2>
              </div>
              
              {/* 월 네비게이션 */}
              <div className="justify-self-center inline-flex items-center gap-3 bg-white rounded-2xl border border-slate-200/50 shadow-sm px-4 py-2">
                <button 
                  className="p-2 rounded-xl hover:bg-slate-100 cursor-pointer transition-colors" 
                  onClick={()=>setCursor(d=>new Date(d.getFullYear(), d.getMonth()-1, 1))} 
                  aria-label="이전 달"
                >
                  <ChevronLeft className="w-5 h-5 text-slate-600"/>
                </button>
                <span className="min-w-[130px] text-center text-lg md:text-xl font-bold text-slate-800 tracking-wide">
                  {year}. {String(month+1).padStart(2,'0')}
                </span>
                <button 
                  className="p-2 rounded-xl hover:bg-slate-100 cursor-pointer transition-colors" 
                  onClick={()=>setCursor(d=>new Date(d.getFullYear(), d.getMonth()+1, 1))} 
                  aria-label="다음 달"
                >
                  <ChevronRight className="w-5 h-5 text-slate-600"/>
                </button>
              </div>
              
              {/* 일정 생성 버튼: 오너만 */}
              <div className="justify-self-center md:justify-self-end">
                {isOwner && (
                  <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                      <Button className="cursor-pointer border-0 shadow-lg hover:shadow-xl transition-all duration-200 rounded-2xl px-6 py-3"
                        style={brandColor ? { backgroundColor: brandColor, color: getReadableTextColor(brandColor) } : undefined}
                      >
                        일정 생성
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-xl rounded-3xl border-0 p-0">
                      <div className="bg-gradient-to-br from-white via-slate-50/30 to-white rounded-3xl">
                        <DialogHeader className="rounded-t-3xl p-6 border-b border-slate-200/50" style={brandColor ? { backgroundImage: 'none', backgroundColor: `${brandColor}14` } : undefined}>
                          <DialogTitle className="text-xl font-bold" style={brandColor ? { color: brandColor } : undefined}>
                            새 일정
                          </DialogTitle>
                        </DialogHeader>
                        <div className="p-6 space-y-4">
                          {/* 제목 + 컬러 선택 */}
                          <div className="grid grid-cols-[1fr_44px] gap-3 items-center">
                            <Input 
                              placeholder="제목" 
                              value={form.title} 
                              onChange={(e)=>setForm({...form,title:e.target.value})}
                              className="rounded-2xl border-slate-200/50 focus:ring-2 focus:ring-indigo-400 transition-all"
                            />
                            <Select value={form.color} onValueChange={(v)=>setForm({...form,color:v})}>
                              <SelectTrigger className="p-0 h-10 w-11 border-slate-200/50 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer">
                                <SelectValue>
                                  <span className="inline-block w-6 h-6 rounded-xl shadow-sm" style={{ backgroundColor: form.color }} />
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent align="end" className="min-w-[180px] rounded-2xl border-slate-200/50">
                                <div className="grid grid-cols-5 gap-2 p-3">
                                  {COLORS.map(c => (
                                    <SelectItem key={c} value={c} className="p-1 rounded-xl hover:bg-slate-50">
                                      <span className="sr-only">{c}</span>
                                      <span className="w-6 h-6 rounded-xl border border-slate-200/50 inline-block shadow-sm hover:scale-110 transition-transform" style={{ backgroundColor: c }} />
                                    </SelectItem>
                                  ))}
                                </div>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <Textarea 
                            placeholder="설명" 
                            value={form.description} 
                            onChange={(e)=>setForm({...form,description:e.target.value})}
                            className="rounded-2xl border-slate-200/50 focus:ring-2 focus:ring-indigo-400 transition-all resize-none"
                            rows={3}
                          />
                          
                          <Input 
                            placeholder="장소" 
                            value={form.location} 
                            onChange={(e)=>setForm({...form,location:e.target.value})}
                            className="rounded-2xl border-slate-200/50 focus:ring-2 focus:ring-indigo-400 transition-all"
                          />
                          
                          {/* 기간 설정: 시작/종료 일자 및 시간 */}
                          <div className="space-y-2">
                            <div className="text-xs font-semibold text-slate-600">시작 일자</div>
                            <div className="grid grid-cols-2 gap-3">
                              <Input 
                                type="date" 
                                value={form.startDate} 
                                onChange={(e)=>setForm({...form,startDate:e.target.value})}
                                className="rounded-2xl border-slate-200/50 focus:ring-2 focus:ring-indigo-400 transition-all"
                              />
                              <Input 
                                type="time" 
                                value={form.start} 
                                onChange={(e)=>setForm({...form,start:e.target.value})}
                                className="rounded-2xl border-slate-200/50 focus:ring-2 focus:ring-indigo-400 transition-all"
                              />
                            </div>
                            <div className="text-xs font-semibold text-slate-600 mt-3">종료 일자</div>
                            <div className="grid grid-cols-2 gap-3">
                              <Input 
                                type="date" 
                                value={form.endDate} 
                                onChange={(e)=>setForm({...form,endDate:e.target.value})}
                                className="rounded-2xl border-slate-200/50 focus:ring-2 focus:ring-indigo-400 transition-all"
                              />
                              <Input 
                                type="time" 
                                value={form.end} 
                                onChange={(e)=>setForm({...form,end:e.target.value})}
                                className="rounded-2xl border-slate-200/50 focus:ring-2 focus:ring-indigo-400 transition-all"
                              />
                            </div>
                          </div>
                          
                          <Button 
                            onClick={onCreate} 
                            className="cursor-pointer w-full text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 rounded-2xl py-3"
                            style={brandColor ? { backgroundColor: brandColor, color: getReadableTextColor(brandColor) } : undefined}
                          >
                            생성
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
          </div>

          {/* 캘린더 그리드 (주 단위 막대 렌더링) */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-slate-200/50 shadow-sm overflow-hidden">
            {/* 요일 헤더 */}
            <div className="grid grid-cols-7 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200/50">
              {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => (
                <div key={d} className="py-4 px-2 text-center">
                  <span className="text-sm font-semibold text-slate-600">{d}</span>
                </div>
              ))}
            </div>

            {/* 주 단위로 렌더링: 각 주에 이벤트 막대 배치 */}
            {(() => {
              const weeks: (number | null)[][] = []
              for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

              const dayIndexMon = (d: Date) => (d.getDay() + 6) % 7 // Mon=0

              return (
                <div>
                  {weeks.map((week, wi) => {
                    const leadNulls = week.findIndex(v => v !== null)
                    const firstDayNum = leadNulls === -1 ? 1 : (week[leadNulls] as number)
                    const weekStart = new Date(year, month, firstDayNum - (leadNulls === -1 ? 0 : leadNulls))
                    const weekEnd = new Date(weekStart)
                    weekEnd.setDate(weekStart.getDate() + 6)

                    // 주에 걸치는 이벤트 추출
                    const overlapped = events.filter(e => {
                      const s = new Date(e.start_at)
                      const t = new Date(e.end_at)
                      return t >= weekStart && s <= weekEnd
                    })

                    // 막대 배치 (겹침 처리 라인 쌓기)
                    type Bar = { id: string; title: string; color: string; startCol: number; span: number; line: number; event: CalendarEvent }
                    const bars: Bar[] = []
                    const lines: { endCol: number }[] = []
                    for (const e of overlapped) {
                      const s = new Date(e.start_at)
                      const t = new Date(e.end_at)
                      const startCol = Math.max(1, dayIndexMon(s) - dayIndexMon(weekStart) + 1)
                      const endCol = Math.min(7, dayIndexMon(t) - dayIndexMon(weekStart) + 1)
                      const span = Math.max(1, endCol - startCol + 1)
                      // 라인 찾기 (겹치지 않는 첫 라인)
                      let lineIdx = 0
                      for (; lineIdx < lines.length; lineIdx++) {
                        if (startCol > lines[lineIdx].endCol) break
                      }
                      if (lineIdx === lines.length) lines.push({ endCol })
                      lines[lineIdx].endCol = Math.max(lines[lineIdx].endCol, endCol)
                      bars.push({ id: e.id, title: e.title, color: e.color, startCol, span, line: lineIdx, event: e })
                    }

                    const lineHeight = 24
                    const overlayHeight = Math.max(0, lines.length * (lineHeight + 4))

                    return (
                      <div key={`w-${wi}`} className="relative border-b border-slate-200/30 last:border-b-0">
                        {/* 날짜 셀 */}
                        <div className="grid grid-cols-7">
                          {week.map((day, di) => {
                            const isToday = day && todayStr === `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                            return (
                              <div key={`d-${wi}-${di}`} className={`min-h-[100px] md:min-h-[120px] p-2 border-r ${di === 6 ? 'border-r-0' : 'border-slate-200/30'}`}>
                                {day && (
                                  <div
                                    className={`text-sm ${isToday ? 'w-7 h-7 rounded-full flex items-center justify-center font-bold shadow-md ' + (brandColor ? '' : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white') : 'text-slate-600 font-medium'}`}
                                    style={isToday && brandColor ? { backgroundImage: 'none', backgroundColor: brandColor, color: getReadableTextColor(brandColor) } : undefined}
                                  >
                                    {day}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                        {/* 막대 오버레이 */}
                        <div className="absolute left-0 right-0 top-8 px-2" style={{ height: overlayHeight }}>
                          <div className="relative h-full">
                            {bars.map((b) => {
                              const leftPct = ((b.startCol - 1) / 7) * 100
                              const widthPct = (b.span / 7) * 100
                              return (
                                <div
                                  key={`bar-${wi}-${b.id}-${b.line}`}
                                  className="absolute rounded-lg px-2 py-1 text-xs text-slate-800 shadow-sm cursor-pointer overflow-hidden"
                                  style={{ left: `${leftPct}%`, width: `calc(${widthPct}% - 6px)`, top: b.line * (lineHeight + 4), backgroundColor: b.color }}
                                  onClick={() => setDetail(b.event)}
                                >
                                  {b.title}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>
        </div>

        {/* 사이드바 */}
        <div className="space-y-6 mt-6 md:mt-0">
          {/* Today 섹션 */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-slate-200/50 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-slate-200/50 p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg">
                  <ListChecks className="w-5 h-5 text-white"/>
                </div>
                <h3 className="text-lg font-bold bg-gradient-to-r from-emerald-700 to-teal-600 bg-clip-text text-transparent">
                  Today
                </h3>
              </div>
            </div>
            <div className="p-6">
              {todayEvents.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                    <ListChecks className="w-8 h-8 text-slate-400"/>
                  </div>
                  <div className="text-sm text-slate-500">오늘 일정이 없습니다.</div>
                </div>
              ) : (
                <div className="space-y-3">
                      {todayEvents.map(ev => (
                    <div 
                      key={ev.id} 
                      className="group bg-gradient-to-r from-white to-slate-50 border border-slate-200/50 rounded-2xl p-4 cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
                      onClick={()=>setDetail(ev)}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: ev.color }} />
                        <div className="text-sm font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors">
                          {ev.title}
                        </div>
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1.5">
                        <Clock className="w-3 h-3"/>
                        {new Date(ev.start_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        <span className="mx-1">~</span>
                        {new Date(ev.end_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                      {ev.description && (
                        <div className="text-xs text-slate-600 mt-2 line-clamp-2 bg-slate-50 rounded-lg p-2">
                          {ev.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Upcoming 섹션 */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-slate-200/50 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-slate-200/50 p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
                  <Clock className="w-5 h-5 text-white"/>
                </div>
                <h3 className="text-lg font-bold bg-gradient-to-r from-indigo-700 to-purple-600 bg-clip-text text-transparent">
                  Upcoming
                </h3>
              </div>
            </div>
            <div className="p-6">
              {upcoming.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                    <Clock className="w-8 h-8 text-slate-400"/>
                  </div>
                  <div className="text-sm text-slate-500">예정된 일정이 없습니다.</div>
                </div>
              ) : (
                <div className="space-y-3">
                      {upcoming.map(ev => (
                    <div 
                      key={ev.id} 
                      className="group bg-gradient-to-r from-white to-slate-50 border border-slate-200/50 rounded-2xl p-4 cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
                      onClick={()=>setDetail(ev)}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: ev.color }} />
                        <div className="text-sm font-semibold text-slate-800 group-hover:text-indigo-700 transition-colors">
                          {new Date(ev.start_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })} · {ev.title}
                        </div>
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1.5">
                        <Clock className="w-3 h-3"/>
                        {new Date(ev.start_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        <span className="mx-1">~</span>
                        {new Date(ev.end_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                      {ev.location && (
                        <div className="text-xs text-slate-500 flex items-center gap-1.5">
                          <MapPin className="w-3 h-3"/>
                          {ev.location}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 상세/수정 모달 */}
      <Dialog open={!!detail} onOpenChange={(o)=>!o && setDetail(null)}>
        <DialogContent className="sm:max-w-[600px] rounded-3xl border-0 p-0">
          <div className="bg-gradient-to-br from-white via-slate-50/30 to-white rounded-3xl">
            <DialogHeader className="sr-only">
              <DialogTitle>이벤트 상세</DialogTitle>
            </DialogHeader>
            {detail && (
              <div className="p-6 space-y-6">
                {/* 헤더: 제목 가운데, 우측 상단 수정/삭제 */}
                <div className="flex items-start justify-between">
                  <div className="flex-1 text-center pr-24 pl-24">
                    <div className="inline-flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full shadow-md" style={{ backgroundColor: detail.color }} />
                      <div className="text-xl font-bold text-slate-800">{detail.title}</div>
                    </div>
                  </div>
                  {isOwner && (
                    <div className="absolute right-6 -mt-1 flex items-center gap-2">
                      <EditEventButton event={detail} onUpdated={async()=>{ await queryClient.invalidateQueries({ queryKey: ['calendar.overview', communityId] }); }} />
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        className="cursor-pointer rounded-2xl hover:scale-105 transition-transform"
                        onClick={async()=>{ 
                          try { 
                            await deleteCommunityEvent(detail.id); 
                            setDetail(null); 
                            setEvents(prev => prev.filter(e => e.id !== detail.id))
                            toast.success('이벤트가 삭제되었습니다')
                          } catch(e){ 
                            toast.error('삭제에 실패했습니다') 
                          } finally {
                            await queryClient.invalidateQueries({ queryKey: ['calendar.overview', communityId] })
                          }
                        }}
                      >
                        삭제
                      </Button>
                    </div>
                  )}
                </div>

                {/* 정보 카드들: 일시 / 장소 / 설명 */}
                <div className="space-y-3">
                  <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <div className="p-2 rounded-xl bg-slate-100"><Clock className="w-4 h-4 text-slate-700"/></div>
                    <div className="min-w-0">
                      <div className="text-[11px] uppercase tracking-wide text-slate-500">일시</div>
                      <div className="text-sm font-medium text-slate-800">
                        {new Date(detail.start_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
                        <span className="mx-1">~</span>
                        {new Date(detail.end_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
                      </div>
                    </div>
                  </div>
                  {detail.location && (
                    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <div className="p-2 rounded-xl bg-slate-100"><MapPin className="w-4 h-4 text-slate-700"/></div>
                      <div className="min-w-0">
                        <div className="text-[11px] uppercase tracking-wide text-slate-500">장소</div>
                        <div className="text-sm font-medium text-slate-800">{detail.location}</div>
                      </div>
                    </div>
                  )}
                  {detail.description && (
                    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <div className="p-2 rounded-xl bg-slate-100"><CalendarIcon className="w-4 h-4 text-slate-700"/></div>
                      <div className="min-w-0">
                        <div className="text-[11px] uppercase tracking-wide text-slate-500">설명</div>
                        <div className="text-sm font-medium text-slate-800 whitespace-pre-wrap">{detail.description}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function EditEventButton({ event, onUpdated }: { event: any; onUpdated: () => Promise<void> | void }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState(event.title)
  const [description, setDescription] = useState(event.description || "")
  const [location, setLocation] = useState(event.location || "")
  const start = new Date(event.start_at)
  const end = new Date(event.end_at)
  const [startDate, setStartDate] = useState(event.start_at.slice(0,10))
  const [startTime, setStartTime] = useState(start.toTimeString().slice(0,5))
  const [endDate, setEndDate] = useState(event.end_at.slice(0,10))
  const [endTime, setEndTime] = useState(end.toTimeString().slice(0,5))
  const [color, setColor] = useState(event.color)

  const submit = async () => {
    const start_at = new Date(`${startDate}T${startTime}:00`).toISOString()
    const end_at = new Date(`${endDate}T${endTime}:00`).toISOString()
    try {
      await updateCommunityEvent(event.id, { title, description, location, start_at, end_at, color })
      toast.success('이벤트가 수정되었습니다')
    } catch (e: any) {
      toast.error(e?.message || '수정 중 오류가 발생했습니다')
    } finally {
      setOpen(false)
      await onUpdated()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="cursor-pointer rounded-2xl border-slate-200/50 hover:bg-slate-50 hover:scale-105 transition-all">
          <Settings className="w-4 h-4 mr-1"/>수정
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-3xl border-0 p-0">
        <div className="bg-gradient-to-br from-white via-slate-50/30 to-white rounded-3xl">
          <DialogHeader className="bg-gradient-to-r from-slate-50 to-white rounded-t-3xl p-6 border-b border-slate-200/50">
            <DialogTitle className="text-xl font-bold text-slate-800">일정 수정</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <Input 
              placeholder="제목" 
              value={title} 
              onChange={(e)=>setTitle(e.target.value)}
              className="rounded-2xl border-slate-200/50 focus:ring-2 focus:ring-slate-400 transition-all"
            />
            
            <Textarea 
              placeholder="설명" 
              value={description} 
              onChange={(e)=>setDescription(e.target.value)}
              className="rounded-2xl border-slate-200/50 focus:ring-2 focus:ring-slate-400 transition-all resize-none"
              rows={3}
            />
            
            <Input 
              placeholder="장소" 
              value={location} 
              onChange={(e)=>setLocation(e.target.value)}
              className="rounded-2xl border-slate-200/50 focus:ring-2 focus:ring-slate-400 transition-all"
            />
            
            {/* 기간 설정: 시작/종료 일자 및 시간 (생성 모달과 동일) */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-600">시작 일자</div>
              <div className="grid grid-cols-2 gap-3">
                <Input 
                  type="date" 
                  value={startDate} 
                  onChange={(e)=>setStartDate(e.target.value)}
                  className="rounded-2xl border-slate-200/50 focus:ring-2 focus:ring-slate-400 transition-all"
                />
                <Input 
                  type="time" 
                  value={startTime} 
                  onChange={(e)=>setStartTime(e.target.value)}
                  className="rounded-2xl border-slate-200/50 focus:ring-2 focus:ring-slate-400 transition-all"
                />
              </div>
              <div className="text-xs font-semibold text-slate-600 mt-3">종료 일자</div>
              <div className="grid grid-cols-2 gap-3">
                <Input 
                  type="date" 
                  value={endDate} 
                  onChange={(e)=>setEndDate(e.target.value)}
                  className="rounded-2xl border-slate-200/50 focus:ring-2 focus:ring-slate-400 transition-all"
                />
                <Input 
                  type="time" 
                  value={endTime} 
                  onChange={(e)=>setEndTime(e.target.value)}
                  className="rounded-2xl border-slate-200/50 focus:ring-2 focus:ring-slate-400 transition-all"
                />
              </div>
            </div>
            
            <Select value={color} onValueChange={setColor}>
              <SelectTrigger className="rounded-2xl border-slate-200/50 focus:ring-2 focus:ring-slate-400 transition-all">
                <SelectValue placeholder="색상" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-slate-200/50">
                <div className="grid grid-cols-5 gap-2 p-3">
                  {COLORS.map(c => (
                    <SelectItem key={c} value={c} className="p-1 rounded-xl hover:bg-slate-50">
                      <span className="sr-only">{c}</span>
                      <span className="w-6 h-6 rounded-xl border border-slate-200/50 inline-block shadow-sm hover:scale-110 transition-transform" style={{ backgroundColor: c }} />
                    </SelectItem>
                  ))}
                </div>
              </SelectContent>
            </Select>
            
            <Button 
              onClick={submit} 
              className="cursor-pointer w-full bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 rounded-2xl py-3"
            >
              저장
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}