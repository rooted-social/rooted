"use client"

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/types/auth'
import { supabase, setAuthCacheFromSession } from '@/lib/supabase'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { ensureProfile } from '@/lib/profiles'
import { getUserCommunities } from '@/lib/communities'
import { getUnreadCount } from '@/lib/notifications'

type AuthData = {
  user: User | null
  profile: Profile | null
  myCommunities: any[]
  unreadCount: number
  loading: boolean
}

const AuthContext = createContext<AuthData | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const [suspendInfo, setSuspendInfo] = useState<{ until: string | null; reason: string | null } | null>(null)

  const sessionQ = useQuery({
    queryKey: ['auth', 'session'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      // 세션을 가져올 때 캐시를 동기화하여 중복 auth 호출 억제
      setAuthCacheFromSession(session)
      return session
    },
    staleTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
  })

  const user = sessionQ.data?.user ?? null

  // ensureProfile는 로그인 직후 별도 경로에서 1회 수행하고 이곳에서는 조회만 권장
  const profileQ = useQuery({
    queryKey: ['auth', 'profile', user?.id],
    enabled: !!user?.id,
    queryFn: async () => (await (await import('@/lib/profiles')).getProfile(user!.id)) as Profile | null,
    staleTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
  })

  const communitiesQ = useQuery({
    queryKey: ['communities', 'mine', user?.id],
    enabled: !!user?.id,
    queryFn: async () => (await getUserCommunities(user!.id)) || [],
    staleTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
  })

  const unreadQ = useQuery({
    queryKey: ['notifications', 'unread-count', user?.id],
    enabled: !!user?.id,
    queryFn: async () => (await getUnreadCount(user!.id)) || 0,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    refetchInterval: () => {
      if (typeof document === 'undefined') return false
      return document.visibilityState === 'visible' ? 1000 * 300 : false
    },
  })

  // onAuthStateChange가 중복 등록되지 않도록 보장
  const authSubRef = useRef<ReturnType<typeof supabase.auth.onAuthStateChange> | null>(null)
  useEffect(() => {
    if (authSubRef.current) return
    const sub = supabase.auth.onAuthStateChange((_event, session) => {
      // 인증 상태 변화 시 캐시 갱신
      setAuthCacheFromSession(session)
      // SSR 가드용 쿠키 동기화
      const access_token = session?.access_token
      const refresh_token = session?.refresh_token
      if (access_token && refresh_token) {
        fetch('/api/auth/sync', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ access_token, refresh_token }),
        }).catch(() => {})
      }
      queryClient.invalidateQueries({ queryKey: ['auth'] })
      queryClient.invalidateQueries({ queryKey: ['communities', 'mine'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    })
    authSubRef.current = sub as any
    return () => { authSubRef.current?.data.subscription.unsubscribe() }
  }, [queryClient])

  useEffect(() => {
    const onUnread = () => { queryClient.invalidateQueries({ queryKey: ['notifications'] }) }
    if (typeof window !== 'undefined') {
      window.addEventListener('unread-updated', onUnread)
    }
    return () => { if (typeof window !== 'undefined') window.removeEventListener('unread-updated', onUnread) }
  }, [queryClient])

  useEffect(() => {
    const p = profileQ.data as any
    if (p && p.is_suspended) {
      setSuspendInfo({ until: p.suspended_until || null, reason: p.suspended_reason || null })
    } else {
      setSuspendInfo(null)
    }
  }, [profileQ.data])

  const value: AuthData = useMemo(() => ({
    user: user || null,
    profile: (profileQ.data as Profile | null) || null,
    myCommunities: (communitiesQ.data as any[]) || [],
    unreadCount: (unreadQ.data as number) || 0,
    loading: sessionQ.isLoading || profileQ.isLoading || communitiesQ.isLoading,
  }), [user, profileQ.data, communitiesQ.data, unreadQ.data, sessionQ.isLoading, profileQ.isLoading, communitiesQ.isLoading])

  return (
    <AuthContext.Provider value={value}>
      {children}
      {suspendInfo && (
        <Dialog open>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>계정이 일시정지되었습니다</DialogTitle>
              <DialogDescription>
                해당 계정은 관리자에 의해 {suspendInfo.until ? new Date(suspendInfo.until).toLocaleString() : '추후 공지 시까지'} 사용이 일시정지 되었습니다.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-md border bg-red-50 p-3 text-sm text-red-800">
              사유: {suspendInfo.reason || '사유가 제공되지 않았습니다.'}
            </div>
            <DialogFooter>
              <Button
                className="cursor-pointer"
                onClick={async () => {
                  try { await supabase.auth.signOut() } catch {}
                  try { await fetch('/api/auth/clear', { method: 'POST' }) } catch {}
                  router.push('/login')
                }}
              >
                확인
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </AuthContext.Provider>
  )
}

export function useAuthData(): AuthData {
  const ctx = useContext(AuthContext)
  if (!ctx) return { user: null, profile: null, myCommunities: [], unreadCount: 0, loading: true }
  return ctx
}

