import { supabase, getUserId } from '@/lib/supabase'
import type { Notification, NotificationPreferences } from '@/types/notification'

function emitUnreadChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('unread-updated'))
  }
}

export async function listNotifications(opts?: { onlyUnread?: boolean; limit?: number; userId?: string }) {
  const uid = opts?.userId || await getUserId()
  if (!uid) return [] as Notification[]
  let query = supabase
    .from('notifications')
    .select('*')
    .eq('recipient_id', uid)
    .order('created_at', { ascending: false })
  if (opts?.onlyUnread) query = query.eq('is_read', false as any)
  if (opts?.limit) query = query.limit(opts.limit)
  const { data, error } = await query
  if (error) return []
  return (data || []) as Notification[]
}

export async function listNotificationsPaged(opts?: { onlyUnread?: boolean; limit?: number; offset?: number; userId?: string }): Promise<{ items: Notification[]; totalCount: number }> {
  const uid = opts?.userId || await getUserId()
  if (!uid) return { items: [], totalCount: 0 }
  const limit = Math.max(1, Math.min(50, opts?.limit ?? 10))
  const offset = Math.max(0, opts?.offset ?? 0)

  let countQuery = supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_id', uid)

  let dataQuery = supabase
    .from('notifications')
    .select('*')
    .eq('recipient_id', uid)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (opts?.onlyUnread) {
    countQuery = countQuery.eq('is_read', false as any)
    dataQuery = dataQuery.eq('is_read', false as any)
  }

  const [countRes, dataRes] = await Promise.all([countQuery, dataQuery])
  const items = (dataRes.data || []) as Notification[]
  const totalCount = countRes.count || 0
  return { items, totalCount }
}

export async function markAsRead(id: string, userId?: string) {
  const uid = userId || await getUserId()
  if (!uid) return { success: false }
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id)
    .eq('recipient_id', uid)
  const ok = !error
  if (ok) emitUnreadChanged()
  return { success: ok }
}

export async function markAllAsRead(userId?: string) {
  const uid = userId || await getUserId()
  if (!uid) return { success: false }
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('recipient_id', uid)
    .eq('is_read', false as any)
  const ok = !error
  if (ok) emitUnreadChanged()
  return { success: ok }
}

export async function getMyNotificationPreferences(userId?: string): Promise<NotificationPreferences | null> {
  const uid = userId || await getUserId()
  if (!uid) return null
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', uid)
    .maybeSingle()
  if (error) return null
  if (!data) {
    // 기본값을 즉시 반환(서버 기본값과 맞춤)
    return {
      user_id: uid,
      web_enabled: true,
      enable_welcome_on_join: true,
      enable_congrats_on_create: true,
      enable_comment_on_my_post: true,
      updated_at: new Date().toISOString(),
    }
  }
  return data as NotificationPreferences
}

export async function upsertMyNotificationPreferences(prefs: Partial<NotificationPreferences>, userId?: string) {
  const uid = userId || await getUserId()
  if (!uid) return { success: false }
  const payload = { ...prefs, user_id: uid }
  const { error } = await supabase
    .from('notification_preferences')
    .upsert(payload, { onConflict: 'user_id' })
  return { success: !error }
}

export async function getUnreadCount(userId?: string): Promise<number> {
  const uid = userId || await getUserId()
  if (!uid) return 0
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', uid as string)
      .eq('is_read', false as any)
    if (error) return 0
    return count || 0
  } catch {
    return 0
  }
}


// 오래된 알림 자동 정리: 최신 max개만 유지
export async function pruneNotificationsToMax(max: number = 10, userId?: string): Promise<number> {
  const uid = userId || await getUserId()
  if (!uid || max <= 0) return 0
  try {
    // max 인덱스 이후(0-based) 레코드 선택
    const { data } = await supabase
      .from('notifications')
      .select('id')
      .eq('recipient_id', uid)
      .order('created_at', { ascending: false })
      .range(max, 999)
    const ids = (data || []).map((r: any) => r.id).filter(Boolean)
    if (ids.length === 0) return 0
    const { error } = await supabase
      .from('notifications')
      .delete()
      .in('id', ids)
      .eq('recipient_id', uid)
    if (error) return 0
    emitUnreadChanged()
    return ids.length
  } catch {
    return 0
  }
}


