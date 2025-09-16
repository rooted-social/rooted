'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog'
import { AnimatedBackground } from '@/components/AnimatedBackground'
import { listNotificationsPaged, markAllAsRead, markAsRead, getMyNotificationPreferences, upsertMyNotificationPreferences, pruneNotificationsToMax } from '@/lib/notifications'
import { getUnreadCount } from '@/lib/notifications'
import type { Notification, NotificationPreferences } from '@/types/notification'
import { Settings } from 'lucide-react'

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [onlyUnread, setOnlyUnread] = useState(false)
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null)
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [page, setPage] = useState(1)
  const pageSize = 10
  const [totalCount, setTotalCount] = useState(0)

  const load = async () => {
    setLoading(true)
    const offset = (page - 1) * pageSize
    // 먼저 오래된 알림 정리(최대 10개 유지)
    try { await pruneNotificationsToMax(10) } catch {}
    const [listRes, p] = await Promise.all([
      listNotificationsPaged({ onlyUnread, limit: pageSize, offset }),
      getMyNotificationPreferences()
    ])
    setItems(listRes.items)
    setTotalCount(listRes.totalCount)
    setPrefs(p)
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlyUnread, page])

  const unreadCount = useMemo(() => items.filter(i => !i.is_read).length, [items])

  const handleMarkOne = async (id: string) => {
    await markAsRead(id)
    setItems(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    try { await getUnreadCount() } catch {}
  }

  const handleMarkAll = async () => {
    await markAllAsRead()
    setItems(prev => prev.map(n => ({ ...n, is_read: true })))
    // 헤더 배지 갱신을 위해 이벤트 발생
    try { await getUnreadCount() } catch {}
  }

  const togglePref = async (key: keyof NotificationPreferences) => {
    if (!prefs) return
    const next = { ...prefs, [key]: !(prefs as any)[key] } as NotificationPreferences
    setPrefs(next)
    setSavingPrefs(true)
    await upsertMyNotificationPreferences({ [key]: (next as any)[key] } as any)
    setSavingPrefs(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white via-slate-50/30 to-slate-100/60 relative overflow-hidden">
      <AnimatedBackground />
      <main className="relative z-10 px-4 pt-16 pb-20">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">알림</h1>
              <p className="text-sm text-slate-600">읽지 않음 {unreadCount}개</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setOnlyUnread(v => !v)}>
                {onlyUnread ? '전체 보기' : '읽지 않음만'}
              </Button>
              <Button onClick={handleMarkAll} disabled={unreadCount === 0}>모두 읽음 처리</Button>
            </div>
          </div>

          {/* Notifications */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Notifications</CardTitle>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="알림 설정 열기">
                    <Settings className="w-5 h-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>알림 설정</DialogTitle>
                    <DialogDescription>원하는 활동에 대해서만 알림을 받아보세요.</DialogDescription>
                  </DialogHeader>
                  <div className="mt-2 space-y-3">
                    {prefs ? (
                      <>
                        <label className="flex items-center gap-3 cursor-pointer p-2 rounded-md hover:bg-slate-50 border border-transparent hover:border-slate-200">
                          <input type="checkbox" checked={prefs.web_enabled} onChange={() => togglePref('web_enabled')} disabled={savingPrefs} />
                          <span className="text-sm">웹 알림 받기</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer p-2 rounded-md hover:bg-slate-50 border border-transparent hover:border-slate-200">
                          <input type="checkbox" checked={prefs.enable_welcome_on_join} onChange={() => togglePref('enable_welcome_on_join')} disabled={savingPrefs} />
                          <span className="text-sm">커뮤니티 가입 환영 알림</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer p-2 rounded-md hover:bg-slate-50 border border-transparent hover:border-slate-200">
                          <input type="checkbox" checked={prefs.enable_congrats_on_create} onChange={() => togglePref('enable_congrats_on_create')} disabled={savingPrefs} />
                          <span className="text-sm">커뮤니티 생성 축하 알림</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer p-2 rounded-md hover:bg-slate-50 border border-transparent hover:border-slate-200">
                          <input type="checkbox" checked={prefs.enable_comment_on_my_post} onChange={() => togglePref('enable_comment_on_my_post')} disabled={savingPrefs} />
                          <span className="text-sm">내 글에 댓글 알림</span>
                        </label>
                      </>
                    ) : (
                      <div className="text-sm text-slate-500">설정을 불러오는 중...</div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-sm text-slate-500">로딩 중...</div>
              ) : items.length === 0 ? (
                <div className="text-sm text-slate-500">표시할 알림이 없습니다.</div>
              ) : (
                <ul className="divide-y divide-slate-200">
                  {items.map((n) => (
                    <li key={n.id} className={`py-3 flex items-start gap-3 ${n.is_read ? 'opacity-70' : ''}`}>
                      <div className={`w-2 h-2 rounded-full mt-2 ${n.is_read ? 'bg-slate-300' : 'bg-sky-500'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-900">{n.title || labelByType(n.type)}</div>
                        {n.message && <div className="text-sm text-slate-600 mt-0.5">{n.message}</div>}
                        <div className="text-xs text-slate-400 mt-1">{new Date(n.created_at).toLocaleString('ko-KR')}</div>
                      </div>
                      {!n.is_read && (
                        <Button size="sm" variant="ghost" onClick={() => handleMarkOne(n.id)}>읽음</Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-xs text-slate-500">알림은 최대 10개까지 보관되며, 그 이상은 오래된 순서대로 자동 삭제됩니다.</p>
            </CardContent>
          </Card>

          {/* Pagination */}
          <div className="mt-6 flex items-center justify-center gap-4">
            <Button variant="outline" disabled={page===1} onClick={() => setPage(p => Math.max(1, p-1))}>이전</Button>
            <div className="text-sm text-slate-600">{page} / {Math.max(1, Math.ceil((totalCount||0)/pageSize))}</div>
            <Button variant="outline" disabled={page >= Math.max(1, Math.ceil((totalCount||0)/pageSize))} onClick={() => setPage(p => p+1)}>다음</Button>
          </div>
        </div>
      </main>
    </div>
  )
}

function labelByType(type: Notification['type']) {
  switch (type) {
    case 'community_join_welcome':
      return '환영 알림'
    case 'community_create_congrats':
      return '축하 알림'
    case 'comment_on_my_post':
      return '댓글 알림'
    default:
      return '알림'
  }
}


