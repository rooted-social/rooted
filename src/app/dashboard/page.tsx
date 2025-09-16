"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getAvatarUrl, getVersionedUrl } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
// ensureProfile 제거: AuthProvider에서 제공되는 프로필만 사용
import { ProfileEditForm } from "@/components/ProfileEditForm"
import { AnimatedBackground } from "@/components/AnimatedBackground"
import type { User } from "@supabase/supabase-js"
import type { Profile } from "@/types/auth"
import Link from "next/link"
import { leaveCommunity } from "@/lib/communities"
import type { Community } from "@/types/community"
import { useAuthData } from "@/components/auth/AuthProvider"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Trash2, AlertTriangle } from "lucide-react"

export default function DashboardPage() {
  const { user: authUser, profile: authProfile, loading: authLoading, myCommunities } = useAuthData()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [showProfileEdit, setShowProfileEdit] = useState(false)
  const [joinedCommunities, setJoinedCommunities] = useState<any[]>([])
  const [ownedCommunities, setOwnedCommunities] = useState<Community[]>([])
  const [openLeave, setOpenLeave] = useState(false)
  const [leaveTarget, setLeaveTarget] = useState<{ id: string; name: string } | null>(null)
  const router = useRouter()

  useEffect(() => {
    const run = async () => {
      if (authLoading) return
      if (!authUser) {
        router.push('/login')
        return
      }
      setUser(authUser)
      // AuthProvider 값만 사용 (중복 DB 요청 제거)
      setProfile(authProfile || null)
      try {
        const memberships = (myCommunities || []) as any[]
        const ownedList = memberships
          .map((m: any) => m.communities)
          .filter((c: any) => !!c && c.owner_id === authUser.id)
        const ownedIds = new Set((ownedList || []).map((c: any) => c.id))
        const joinedList = memberships.filter((m: any) => {
          const cid = m.communities?.id || m.community_id
          return cid && !ownedIds.has(cid)
        })
        setOwnedCommunities(ownedList as any)
        setJoinedCommunities(joinedList as any)
      } catch (_) {}
      setLoading(false)
    }
    run()
  }, [authLoading, authUser, authProfile, myCommunities, router])

  const handleLogout = async () => {
    try {
      // 1) 글로벌 로그아웃 시도 (모든 기기 세션 무효화)
      let { error } = await supabase.auth.signOut({ scope: 'global' as any })
      if (error && (error.status === 401 || error.status === 403)) {
        // 2) 권한 문제로 글로벌 실패 시 로컬만 정리
        const res = await supabase.auth.signOut()
        error = res.error
      }
      if (error) {
        toast.error('로그아웃 중 오류가 발생했습니다.')
        return
      }
      toast.success('로그아웃되었습니다.')
      router.push('/')
    } catch {
      // 네트워크/기타 예외 시에도 로컬 세션 제거를 최후 시도로 시도
      try { await supabase.auth.signOut() } catch {}
      router.push('/')
    }
  }

  const confirmLeave = async () => {
    if (!leaveTarget) return
    try {
      await leaveCommunity(leaveTarget.id)
      setJoinedCommunities(prev => prev.filter((m: any) => (m.communities?.id || m.community_id) !== leaveTarget.id))
      toast.success('루트를 탈퇴했습니다.')
    } catch (e: any) {
      toast.error(e?.message || '탈퇴 중 오류가 발생했습니다.')
    } finally {
      setOpenLeave(false)
      setLeaveTarget(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white via-slate-50/30 to-slate-100/60 relative overflow-hidden flex items-center justify-center">
        <AnimatedBackground zIndexClass="-z-0" />
        <div className="text-lg relative z-10">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white via-slate-50/30 to-slate-100/60 relative overflow-hidden p-4 pt-5 pb-24 md:pt-4 md:pb-4">
      <AnimatedBackground zIndexClass="-z-0" />
      <div className="max-w-4xl mx-auto relative z-10 pt-2 md:pt-10">
        {/* Header */}
        <div className="flex justify-end items-center mb-8">
          <Button onClick={handleLogout} className="cursor-pointer bg-red-600 hover:bg-red-700 text-white border border-red-700/70 shadow-sm">
            로그아웃
          </Button>
        </div>

        {/* 계정 정보 */}
        <Card className="mb-8 shadow-sm border border-slate-200 bg-white/90 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold text-slate-900">계정 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <Avatar className="w-16 h-16 ring-2 ring-slate-100">
                  <AvatarImage src={getAvatarUrl(profile?.avatar_url, profile?.updated_at)} alt="프로필 이미지" />
                  <AvatarFallback className="bg-slate-100 text-slate-600 text-lg font-medium">
                    {profile?.username?.[0]?.toUpperCase() || profile?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-slate-900">{profile?.full_name || '이름 없음'}</h3>
                  <p className="text-slate-600">@{profile?.username || '사용자명 없음'}</p>
                </div>
              </div>
              {profile?.bio && (
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-slate-700 leading-relaxed">{profile.bio.length > 80 ? `${profile.bio.slice(0, 80)}…` : profile.bio}</p>
                </div>
              )}
              <div className="grid sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">이메일</p>
                  <p className="text-sm text-slate-900">{user?.email}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">가입일</p>
                  <p className="text-sm text-slate-900">{user?.created_at ? new Date(user.created_at).toLocaleDateString('ko-KR') : '정보 없음'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">프로필 업데이트</p>
                  <p className="text-sm text-slate-900">{profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString('ko-KR') : '정보 없음'}</p>
                </div>
              </div>
              {!showProfileEdit && (
                <div className="pt-2">
                  <Button onClick={() => setShowProfileEdit(true)} className="cursor-pointer bg-slate-900 hover:bg-slate-800 text-white px-6">
                    프로필 편집
                  </Button>
                </div>
              )}
              {showProfileEdit && (
                <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                  <ProfileEditForm
                    profile={profile}
                    userId={user!.id}
                    onProfileUpdateAction={(updatedProfile) => {
                      setProfile(updatedProfile)
                      setShowProfileEdit(false)
                    }}
                    onCancel={() => setShowProfileEdit(false)}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 나의 커뮤니티 */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card className="shadow-sm border border-slate-200 bg-white/90 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold text-slate-900">운영 중인 루트</CardTitle>
              <CardDescription className="text-slate-600">내가 소유한 커뮤니티</CardDescription>
            </CardHeader>
            <CardContent>
              {ownedCommunities.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 mx-auto mb-3 bg-slate-100 rounded-full flex items-center justify-center">
                    <span className="text-slate-400 text-xl">🌱</span>
                  </div>
                  <p className="text-sm text-slate-500">운영 중인 루트가 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {ownedCommunities.map((c) => (
                    <Link key={c.id} href={`/${c.slug}/dashboard`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 border border-slate-100 hover:border-slate-200 transition-all duration-200 hover:shadow-sm">
                      {c.image_url ? (
                        <img src={getVersionedUrl(c.image_url, c.updated_at)} alt="icon" className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 flex items-center justify-center">
                          <span className="text-sm font-semibold">{c.name?.[0]}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-900 truncate">{c.name}</div>
                        <div className="text-xs text-slate-500 truncate">멤버 {c.member_count || 0}명 · {c.category}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm border border-slate-200 bg-white/90 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold text-slate-900">가입한 루트</CardTitle>
              <CardDescription className="text-slate-600">내가 멤버로 참여 중</CardDescription>
            </CardHeader>
            <CardContent>
              {joinedCommunities.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 mx-auto mb-3 bg-slate-100 rounded-full flex items-center justify-center">
                    <span className="text-slate-400 text-xl">👥</span>
                  </div>
                  <p className="text-sm text-slate-500">가입한 루트가 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {joinedCommunities.map((m) => (
                    <Link key={m.id} href={`/${m.communities?.slug}/dashboard`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 border border-slate-100 hover:border-slate-200 transition-all duration-200 hover:shadow-sm">
                      {m.communities?.image_url ? (
                        <img src={getVersionedUrl(m.communities?.image_url, m.communities?.updated_at)} alt="icon" className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 flex items-center justify-center">
                          <span className="text-sm font-semibold">{m.communities?.name?.[0]}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-900 truncate">{m.communities?.name}</div>
                        <div className="text-xs text-slate-500 truncate">멤버 {m.communities?.member_count || 0}명 · {m.communities?.category}</div>
                      </div>
                      <button
                        className="ml-2 p-1.5 rounded-md border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-300 hover:bg-red-50 transition-colors"
                        title="탈퇴"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const cid = m.communities?.id || m.community_id
                          setLeaveTarget({ id: String(cid), name: m.communities?.name || '' })
                          setOpenLeave(true)
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      {/* 루트 탈퇴 확인 모달 */}
      <Dialog open={openLeave} onOpenChange={setOpenLeave}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>루트를 탈퇴하시겠습니까?</DialogTitle>
            <DialogDescription>이 작업은 되돌릴 수 없습니다.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 text-red-700 border border-red-100">
            <AlertTriangle className="w-5 h-5" />
            <span className="text-sm">{leaveTarget?.name || '선택한 루트'}에서 탈퇴합니다.</span>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpenLeave(false)} className="cursor-pointer">취소</Button>
            <Button onClick={confirmLeave} className="bg-red-600 hover:bg-red-700 text-white cursor-pointer">탈퇴</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 