"use client"

import { useEffect, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { normalizeProfileAvatarUrl } from "@/lib/r2"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getCommunityMembers, getPendingCommunityMembers, removeCommunityMember, getMembersOverview } from "@/lib/communities"
import { MoreHorizontal, Check, X, Search } from "lucide-react"
import { supabase, getUserId } from "@/lib/supabase"

interface MembersTabProps {
  communityId: string
  ownerId?: string | null
}

type MemberItem = {
  user_id: string
  role?: string
  is_owner?: boolean
  profile?: { id: string; username?: string; full_name?: string; avatar_url?: string; bio?: string; email?: string }
}

export function MembersTab({ communityId, ownerId }: MembersTabProps) {
  const [pending, setPending] = useState<MemberItem[]>([])
  const [members, setMembers] = useState<MemberItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [selected, setSelected] = useState<MemberItem | null>(null)
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const [q, setQ] = useState<string>("")
  const [roleFilter, setRoleFilter] = useState<'all'|'owner'|'member'>('all')
  const [page, setPage] = useState<number>(1)
  const pageSize = 20
  const [isOwner, setIsOwner] = useState<boolean>(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const { members: m, pending: p, isOwner: o } = await getMembersOverview(communityId)
      setIsOwner(o)
      setPending(o ? p : [])
      const sorted = [...m].sort((a,b)=> (b.is_owner?1:0) - (a.is_owner?1:0))
      setMembers(sorted)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [communityId, ownerId])

  const onRemove = async (userId: string) => {
    if (!isOwner) return
    try {
      await removeCommunityMember(communityId, userId)
      await load()
      setMenuFor(null)
    } catch (err: any) {
      console.error('removeCommunityMember error:', err)
      alert(err?.message || '멤버 추방 중 오류가 발생했습니다.')
    }
  }

  const MemberCard = ({ item }: { item: MemberItem }) => (
    <div className={`group relative p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
      item.is_owner
        ? 'border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 hover:shadow-lg hover:shadow-blue-100/50'
        : 'border-slate-200 bg-white hover:bg-slate-50 hover:shadow-md'
    }`}>
      <button className="flex items-center gap-4 text-left w-full" onClick={() => setSelected(item)}>
        <div className="relative">
          <Avatar className={`w-12 h-12 ${item.is_owner ? 'ring-2 ring-blue-300' : ''}`}>
            <AvatarImage src={normalizeProfileAvatarUrl(item.profile?.avatar_url)} alt={item.profile?.full_name || item.profile?.username || 'member'} />
            <AvatarFallback className={item.is_owner ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}>
              {item.profile?.full_name?.[0] || item.profile?.username?.[0] || '?'}
            </AvatarFallback>
          </Avatar>
          {item.is_owner && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-xs text-white font-bold">👑</span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-slate-900 truncate">
              {item.profile?.full_name || item.profile?.username || '사용자'}
            </h3>
            {item.is_owner && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                리더
              </span>
            )}
          </div>
          {item.profile?.bio && (
            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
              {item.profile.bio}
            </p>
          )}
        </div>
      </button>
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="relative">
          <button
            className="h-8 w-8 rounded-lg hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
            onClick={() => setMenuFor(menuFor === item.user_id ? null : item.user_id)}
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {menuFor === item.user_id && (
            <div className="absolute right-0 top-full mt-2 bg-white border border-slate-200 rounded-lg shadow-lg text-sm z-20 overflow-hidden min-w-[140px] whitespace-nowrap">
              <button
                className="block w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors"
                onClick={() => { setSelected(item); setMenuFor(null) }}
              >
                프로필 보기
              </button>
              {isOwner && !item.is_owner && item.user_id !== currentUserId && (
                <button
                  className="block w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 transition-colors"
                  onClick={() => onRemove(item.user_id)}
                >
                  멤버 추방
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">커뮤니티 멤버</h1>
        <p className="text-slate-600">커뮤니티 구성원을 관리하고 확인하세요</p>
      </div>

      {/* 검색/필터 */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e)=>setQ(e.target.value)}
              placeholder="멤버 이름으로 검색..."
              className="w-full sm:w-64 pl-9 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50/50"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e)=>setRoleFilter(e.target.value as any)}
            className="px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white min-w-[120px]"
          >
            <option value="all">전체 역할</option>
            <option value="owner">리더만</option>
            <option value="member">멤버만</option>
          </select>
        </div>
        <div className="text-sm text-slate-500">
          총 {members.length}명의 멤버
        </div>
      </div>

      {isOwner && (
      <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-amber-800 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
            승인 대기 중 ({pending.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="space-y-3">
              <div className="h-12 bg-slate-200 rounded-lg animate-pulse"></div>
              <div className="h-12 bg-slate-200 rounded-lg animate-pulse"></div>
            </div>
          ) : pending.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <div className="text-4xl mb-2">📋</div>
              <div className="text-sm">새로운 가입 요청이 없습니다</div>
            </div>
          ) : (
            pending.map(p => (
              <div key={p.user_id} className="flex items-center justify-between p-4 rounded-xl border border-amber-200 bg-white/80 hover:bg-white hover:shadow-md transition-all duration-200">
                <div className="flex items-center gap-4">
                  <Avatar className="w-11 h-11 ring-2 ring-amber-200">
                    <AvatarImage src={normalizeProfileAvatarUrl(p.profile?.avatar_url)} />
                    <AvatarFallback className="bg-amber-100 text-amber-700">{p.profile?.full_name?.[0] || '?'}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold text-slate-900">{p.profile?.full_name || p.profile?.username || '사용자'}</div>
                    <div className="text-xs text-slate-500">가입 승인 대기 중</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 px-3 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                    onClick={async ()=>{ await removeCommunityMember(communityId, p.user_id); await load() }}
                  >
                    <X className="w-4 h-4 mr-1"/>
                    거절
                  </Button>
                  <Button
                    size="sm"
                    className="h-9 px-3 bg-green-600 hover:bg-green-700 text-white"
                    onClick={async ()=>{
                      try {
                        await supabase.rpc('approve_member', { p_community_id: communityId, p_target_user_id: p.user_id })
                        await load()
                      } catch (err) {
                        console.error('approve_member error:', err)
                        alert('승인 처리 중 오류가 발생했습니다.')
                      }
                    }}
                  >
                    <Check className="w-4 h-4 mr-1"/>
                    승인
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      )}

      {isOwner && (
        <div className="text-xs text-slate-500 px-1 -mt-2">승인 대기 목록 테이블은 관리자에게만 노출이 됩니다</div>
      )}

      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            커뮤니티 멤버
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full space-y-4">
              <div className="h-20 bg-slate-100 rounded-xl animate-pulse"></div>
              <div className="h-20 bg-slate-100 rounded-xl animate-pulse"></div>
              <div className="h-20 bg-slate-100 rounded-xl animate-pulse"></div>
            </div>
          ) : (
            (()=>{
              // 검색/필터/페이지네이션 적용
              let list = members
              if (q) { list = list.filter(m => (m.profile?.full_name || m.profile?.username || '').toLowerCase().includes(q.toLowerCase())) }
              if (roleFilter==='owner') list = list.filter(m => m.is_owner)
              if (roleFilter==='member') list = list.filter(m => !m.is_owner)
              // 오너 우선 정렬 유지
              list = [...list].sort((a,b)=> (b.is_owner?1:0) - (a.is_owner?1:0))
              const start = (page-1)*pageSize
              const end = start + pageSize
              const pageItems = list.slice(start, end)
              return (
                <>
                  {pageItems.length === 0 ? (
                    <div className="col-span-full text-center py-12">
                      <div className="text-6xl mb-4">👥</div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">멤버를 찾을 수 없습니다</h3>
                      <p className="text-slate-600">
                        {q || roleFilter !== 'all'
                          ? '검색 조건에 맞는 멤버가 없습니다. 필터를 조정해보세요.'
                          : '아직 커뮤니티에 멤버가 없습니다.'
                        }
                      </p>
                    </div>
                  ) : (
                    <>
                      {pageItems.map(m => <MemberCard key={m.user_id} item={m} />)}
                      <div className="col-span-full flex items-center justify-between pt-6 mt-4 border-t border-slate-100">
                    <div className="text-sm text-slate-600">
                      총 <span className="font-semibold text-slate-900">{list.length}</span>명의 멤버
                      <span className="mx-2 text-slate-400">·</span>
                      {page}/{Math.max(1, Math.ceil(list.length/pageSize))} 페이지
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page<=1}
                        onClick={()=>setPage(p=>Math.max(1,p-1))}
                        className="px-4 py-2"
                      >
                        이전
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page>=Math.ceil(list.length/pageSize)}
                        onClick={()=>setPage(p=>Math.min(Math.ceil(list.length/pageSize), p+1))}
                        className="px-4 py-2"
                      >
                        다음
                      </Button>
                    </div>
                  </div>
                    </>
                  )}
                </>
              )
            })()
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-xl font-semibold text-center">프로필 정보</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="relative">
                <Avatar className="w-20 h-20 ring-4 ring-slate-100">
                  <AvatarImage src={normalizeProfileAvatarUrl(selected.profile?.avatar_url)} alt={selected.profile?.full_name || selected.profile?.username || 'member'} />
                  <AvatarFallback className="bg-slate-100 text-slate-700 text-xl">
                    {selected.profile?.full_name?.[0] || selected.profile?.username?.[0] || '?'}
                  </AvatarFallback>
                </Avatar>
                {selected.is_owner && (
                  <div className="absolute -top-2 -right-2 w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-sm text-white">👑</span>
                  </div>
                )}
              </div>
              <div className="space-y-2 w-full">
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-slate-900">
                    {selected.profile?.full_name || selected.profile?.username || '사용자'}
                  </h3>
                  {selected.is_owner && (
                    <span className="inline-block px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                      커뮤니티 리더
                    </span>
                  )}
                </div>
                {/* 사용자명 노출 제거 */}
                <div className="text-sm text-slate-600">
                  {selected.profile?.email || '이메일 정보 없음'}
                </div>
                {selected.profile?.bio && (
                  <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                    <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {selected.profile.bio}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}


