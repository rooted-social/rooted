"use client"

import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuthData } from "@/components/auth/AuthProvider"
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PlusIcon, PencilIcon, Trash2Icon, User, Clock, Calendar } from "lucide-react"
import SectionTitle from "@/components/SectionTitle"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getAvatarUrl } from "@/lib/utils"

interface NotesPageProps {
  title: string
  bannerUrl: string | null
  description: string | null
  pageId: string
}

type NoteCategory = { id: string; name: string; color: string | null }
type NoteItem = { 
  id: string; 
  title: string; 
  body: string; 
  category_id: string | null; 
  color?: string | null;
  created_at: string;
  updated_at?: string;
  user_id?: string;
  author?: {
    id: string;
    full_name?: string;
    username?: string;
    avatar_url?: string;
    updated_at?: string;
  } | null;
}

export default function NotesPage({ title, bannerUrl, description, pageId }: NotesPageProps) {
  const { user } = useAuthData()
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<NoteCategory[]>([])
  const [items, setItems] = useState<NoteItem[]>([])
  const [filterCat, setFilterCat] = useState<string | "all">("all")
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isOwner, setIsOwner] = useState<boolean>(false)

  // form state (create / edit)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const MAX_NOTE_CHARS = 190
  const [form, setForm] = useState<{ content: string; category_id: string | null; color: string }>({
    content: "",
    category_id: null,
    color: "#FDE68A",
  })

  const filtered = useMemo(() => {
    if (filterCat === "all") return items
    return items.filter((i) => i.category_id === filterCat)
  }, [items, filterCat])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        setLoading(true)
        // 현재 사용자와 오너 판별
        if (user) setCurrentUserId(user.id)
        // 카테고리 로드
        const categoriesResult = await supabase
          .from('community_page_note_categories')
          .select('id,name,color')
          .eq('page_id', pageId)
          .order('position', { ascending: true })
        
        // 노트 로드 (기본 필드부터 시도)
        const notesResult = await supabase
          .from('community_page_note_items')
          .select('id, title, body, category_id, color, created_at, updated_at, user_id')
          .eq('page_id', pageId)
          .order('created_at', { ascending: false })
        
        if (!mounted) return
        
        if (categoriesResult.error) {
          console.error('Categories load error:', categoriesResult.error)
          toast.error('카테고리를 불러오는 중 오류가 발생했습니다.')
        } else {
          setCategories(categoriesResult.data || [])
        }
        
        if (notesResult.error) {
          console.error('Notes load error:', notesResult.error)
          toast.error('노트를 불러오는 중 오류가 발생했습니다.')
        } else {
          // 노트 데이터 로드 후 작성자 정보를 별도로 가져오기
          const notes = notesResult.data || []
          const userIds = [...new Set(notes.map((n: any) => n.user_id).filter(Boolean))]
          
          let authorMap: { [key: string]: any } = {}
          if (userIds.length > 0) {
            try {
              const authorsResult = await supabase
                .from('profiles')
                .select('id, full_name, username, avatar_url, updated_at')
                .in('id', userIds)
              
              if (authorsResult.data) {
                authorsResult.data.forEach((author: any) => {
                  authorMap[author.id] = author
                })
              }
            } catch (authorError) {
              console.warn('Failed to load authors:', authorError)
            }
          }
          
          setItems(notes.map((item: any) => ({
            ...item,
            color: item.color || '#FDE68A',
            author: item.user_id ? authorMap[item.user_id] || null : null
          })))
        }
      } catch (error: any) {
        console.error('Data load error:', error)
        toast.error('데이터를 불러오는 중 오류가 발생했습니다.')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [pageId, user])

  // 오너 판별: 페이지가 속한 커뮤니티를 조회해야 하지만 전달 경로가 없으므로 서버 스키마에 따라 page -> community_id가 연결되어 있다고 가정하고 조회 시도
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        if (!user) { setIsOwner(false); return }
        // 페이지의 커뮤니티 id 추정: 별도 테이블이 있다면 거기서 community_id를 select
        const { data: pageRow } = await supabase
          .from('community_pages')
          .select('community_id')
          .eq('id', pageId)
          .single()
        const communityId = (pageRow as any)?.community_id
        if (communityId) {
          const { data: comm } = await supabase
            .from('communities')
            .select('owner_id')
            .eq('id', communityId)
            .single()
          const ownerId = (comm as any)?.owner_id || null
          if (mounted) setIsOwner(!!ownerId && ownerId === user.id)
        }
      } catch {}
    })()
    return () => { mounted = false }
  }, [pageId, user])

  const resetForm = () => {
    setEditingId(null)
    setForm({ content: "", category_id: null, color: "#FDE68A" })
  }

  const openCreate = () => {
    resetForm()
    setOpen(true)
  }

  const openEdit = (note: NoteItem) => {
    setEditingId(note.id)
    setForm({ content: note.title || note.body || "", category_id: note.category_id, color: note.color || "#FDE68A" })
    setOpen(true)
  }

  const upsertNote = async () => {
    if (!form.content.trim()) {
      toast.error('내용을 입력하세요')
      return
    }
    if (form.content.length > MAX_NOTE_CHARS) {
      toast.error(`최대 ${MAX_NOTE_CHARS}자까지 입력할 수 있습니다.`)
      return
    }
    
    setSaving(true)
    try {
      // 현재 사용자 정보 가져오기
      if (!user) {
        toast.error('로그인이 필요합니다.')
        return
      }

      const base: any = {
        page_id: pageId,
        title: form.content,
        body: form.content,
        category_id: form.category_id,
      }
      
      // user_id 추가
      base.user_id = user.id
      
      if (editingId) {
        base.id = editingId
      } else {
        // 새 노트 생성 시에만 created_at 설정
        base.created_at = new Date().toISOString()
      }

      // color 포함해서 저장
      const result = await supabase
        .from('community_page_note_items')
        .upsert({
          ...base,
          color: form.color
        })
        .select('id, title, body, category_id, color, created_at, updated_at, user_id')
        .single()
      
      if (result.error) {
        throw result.error
      }

      if (result.data) {
        // 저장 후 작성자 정보를 별도로 가져오기
        let author = null
        if ((result.data as any).user_id) {
          try {
            const authorResult = await supabase
              .from('profiles')
              .select('id, full_name, username, avatar_url, updated_at')
              .eq('id', (result.data as any).user_id)
              .single()
            
            if (authorResult.data) {
              author = authorResult.data
            }
          } catch (authorError) {
            console.warn('Failed to load author for saved note:', authorError)
          }
        }
        
        const noteData = {
          ...result.data,
          author
        } as any
        setItems((prev) => {
          const idx = prev.findIndex((p) => p.id === noteData.id)
          if (idx === -1) {
            // 새 노트: 맨 앞에 추가
            return [noteData, ...prev]
          } else {
            // 기존 노트 수정: 해당 위치 업데이트
            const next = [...prev]
            next[idx] = noteData
            return next
          }
        })
        
        toast.success(editingId ? '노트를 수정했습니다.' : '노트를 추가했습니다.')
        setOpen(false)
        resetForm()
      }
    } catch (error: any) {
      console.error('Note save error:', error)
      toast.error(`저장 중 오류가 발생했습니다: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const removeNote = async (id: string) => {
    try {
      const { error } = await supabase
        .from('community_page_note_items')
        .delete()
        .eq('id', id)
      
      if (error) {
        console.error('Note delete error:', error)
        toast.error(`삭제 중 오류가 발생했습니다: ${error.message}`)
        return
      }
      
      setItems((prev) => prev.filter((p) => p.id !== id))
      toast.success('노트가 삭제되었습니다.')
    } catch (error: any) {
      console.error('Note delete error:', error)
      toast.error('삭제 중 오류가 발생했습니다.')
    }
  }

  // category create (inline)
  const [newCatName, setNewCatName] = useState("")
  const createCategory = async () => {
    if (!newCatName.trim()) return
    
    try {
      const { data, error } = await supabase
        .from('community_page_note_categories')
        .insert({ 
          page_id: pageId, 
          name: newCatName.trim(),
          position: categories.length 
        })
        .select('id,name,color')
        .single()
      
      if (error) {
        console.error('Category create error:', error)
        toast.error(`카테고리 생성 중 오류가 발생했습니다: ${error.message}`)
        return
      }
      
      if (data) {
        setCategories((prev) => [...prev, data as any])
        setNewCatName("")
        toast.success('카테고리가 추가되었습니다.')
      }
    } catch (error: any) {
      console.error('Category create error:', error)
      toast.error('카테고리 생성 중 오류가 발생했습니다.')
    }
  }

  return (
    <div className="space-y-3">
      {bannerUrl && (
        <div className="relative w-full h-40 overflow-hidden rounded-xl border">
          <Image src={bannerUrl} alt={title} fill className="object-cover" />
        </div>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <SectionTitle title={title} description={description} />
        </div>
        <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); setOpen(o) }}>
          <DialogTrigger asChild>
            <Button size="sm" className="whitespace-nowrap rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200">
              <PlusIcon className="w-4 h-4 mr-2" /> 새 노트
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl rounded-3xl border border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-slate-900">{editingId ? '노트 수정' : '새 노트'}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-6">
              <div className="sm:col-span-3 space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">내용</label>
                  <Textarea 
                    placeholder="노트 내용을 입력하세요..." 
                    className="min-h-40 rounded-2xl border-slate-200 focus:ring-2 focus:ring-indigo-400 resize-none" 
                    value={form.content} 
                    onChange={(e) => setForm((f) => ({ ...f, content: e.target.value.slice(0, MAX_NOTE_CHARS) }))} 
                  />
                  <div className="text-right text-xs text-slate-500 mt-2">
                    <span className={form.content.length > MAX_NOTE_CHARS * 0.9 ? 'text-amber-600 font-medium' : ''}>
                      {form.content.length}
                    </span>
                    <span className="text-slate-400"> / {MAX_NOTE_CHARS}</span>
                  </div>
                </div>
              </div>
              <div className="sm:col-span-2 space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-3 block">색상</label>
                  <div className="flex flex-wrap items-center gap-3">
                    {['#FDE68A', '#FECACA', '#BFDBFE', '#C7D2FE', '#BBF7D0', '#FED7AA', '#F3E8FF'].map((c) => (
                      <button 
                        key={c} 
                        type="button" 
                        onClick={() => setForm((f) => ({ ...f, color: c }))} 
                        className={`h-10 w-10 rounded-2xl border-2 cursor-pointer transition-all duration-200 hover:scale-110 ${form.color===c ? 'ring-2 ring-slate-900 ring-offset-2' : 'border-slate-200 hover:border-slate-300'}`} 
                        style={{ backgroundColor: c }} 
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">카테고리</label>
                  <Select value={form.category_id ?? 'none'} onValueChange={(v) => setForm((f) => ({ ...f, category_id: v === 'none' ? null : v }))}>
                    <SelectTrigger className="w-full cursor-pointer rounded-2xl border-slate-200 focus:ring-2 focus:ring-indigo-400">
                      <SelectValue placeholder="카테고리를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border border-slate-200">
                      <SelectItem value="none">카테고리 없음</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* 미리보기 */}
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">미리보기</label>
                  <div 
                    className="aspect-square rounded-2xl p-3 border border-slate-200 shadow-sm"
                    style={{ backgroundColor: form.color }}
                  >
                    <div className="text-slate-900/90 text-xs font-medium leading-snug whitespace-pre-wrap break-words h-full overflow-hidden">
                      {form.content || "노트 내용이 여기에 표시됩니다..."}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => { setOpen(false); resetForm() }} 
                disabled={saving} 
                className="cursor-pointer rounded-2xl px-6"
              >
                취소
              </Button>
              <Button 
                onClick={upsertNote} 
                disabled={saving || !form.content.trim()} 
                className="cursor-pointer rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 px-6"
              >
                {saving ? '저장 중...' : (editingId ? '수정 완료' : '노트 추가')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* 카테고리 필터 및 관리 */}
      <div className="bg-gradient-to-r from-slate-50 to-white rounded-3xl border border-slate-200/50 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-slate-600">필터:</span>
            <Button 
              size="sm" 
              variant={filterCat === 'all' ? 'default' : 'outline'} 
              onClick={() => setFilterCat('all')}
              className={`rounded-2xl ${filterCat === 'all' ? 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700' : ''}`}
            >
              All
            </Button>
            {categories.map((c) => (
              <Button 
                key={c.id} 
                size="sm" 
                variant={filterCat === c.id ? 'default' : 'outline'} 
                onClick={() => setFilterCat(c.id)}
                className={`rounded-2xl ${filterCat === c.id ? 'bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700' : ''}`}
              >
                {c.name}
              </Button>
            ))}
          </div>
          {isOwner && (
            <div className="ml-auto flex items-center gap-2">
              <Input 
                value={newCatName} 
                onChange={(e) => setNewCatName(e.target.value)} 
                placeholder="새 카테고리 이름" 
                className="h-9 w-40 rounded-2xl border-slate-200 focus:ring-2 focus:ring-indigo-400"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    createCategory()
                  }
                }}
              />
              <Button 
                size="sm" 
                variant="outline" 
                onClick={createCategory}
                disabled={!newCatName.trim()}
                className="rounded-2xl px-4"
              >
                <PlusIcon className="w-4 h-4 mr-1" />
                추가
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 카드 그리드 */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-16 rounded-3xl border border-dashed border-slate-300 bg-white/60">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg mb-4">
            <PlusIcon className="w-7 h-7 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">첫 번째 게시글을 작성해보세요!</h3>
          <p className="mt-1 text-sm text-slate-600">노트 페이지의 첫 콘텐츠를 등록해 보세요.</p>
          <Button onClick={openCreate} className="mt-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg">
            <PlusIcon className="w-4 h-4 mr-2" /> 새 노트
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          {filtered.map((n) => (
            <Dialog key={n.id}>
              <DialogTrigger asChild>
                <div className="group relative overflow-hidden rounded-3xl aspect-square p-4 shadow-sm hover:shadow-xl cursor-pointer transition-all duration-300 ease-out hover:scale-[1.02]" style={{ backgroundColor: n.color || '#FDE68A' }}>
                  {/* 작성자 정보 */}
                  <div className="absolute top-3 left-3 right-3 flex items-center gap-2 opacity-80">
                    <Avatar className="w-6 h-6 ring-1 ring-black/20">
                      <AvatarImage src={n.author ? getAvatarUrl(n.author.avatar_url, n.author.updated_at) : undefined} alt={n.author?.username || ''} />
                      <AvatarFallback className="bg-black/20 text-white text-xs font-semibold">
                        {n.author ? (n.author.full_name || n.author.username || '?').slice(0,1) : '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-slate-900/90 truncate">
                        {n.author ? (n.author.full_name || n.author.username || 'Anonymous') : 'Anonymous'}
                      </div>
                    </div>
                  </div>
                  
                  {/* 메인 콘텐츠 */}
                  <div className="absolute top-12 left-4 right-4 bottom-16">
                    <div className="text-slate-900/90 font-medium leading-snug whitespace-pre-wrap break-words h-full overflow-hidden">
                      {n.title}
                    </div>
                  </div>
                  
                  {/* 작성 시간 */}
                  <div className="absolute bottom-12 left-4 right-4">
                    <div className="flex items-center gap-1.5 text-xs text-slate-900/70">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(n.created_at).toLocaleDateString('ko-KR', { 
                        month: 'short', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</span>
                    </div>
                  </div>
                  
                  {/* 액션 버튼들: 작성자 또는 오너만 표시 */}
                  {(n.user_id === currentUserId || isOwner) && (
                    <div className="absolute bottom-3 left-3 right-3 flex justify-between">
                      <button 
                        className="h-7 w-7 rounded-full bg-red-500/80 hover:bg-red-600/90 text-white flex items-center justify-center transition-colors duration-200 opacity-0 group-hover:opacity-100" 
                        onClick={(e) => { e.stopPropagation(); removeNote(n.id) }} 
                        title="삭제"
                      >
                        <Trash2Icon className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        className="h-7 w-7 rounded-full bg-black/70 hover:bg-black/80 text-white flex items-center justify-center transition-colors duration-200 opacity-0 group-hover:opacity-100" 
                        onClick={(e) => { e.stopPropagation(); openEdit(n) }} 
                        title="편집"
                      >
                        <PencilIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl rounded-3xl border-0 p-0" style={{ backgroundColor: n.color || '#FDE68A' }}>
                <div className="p-6">
                  <DialogHeader className="mb-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Avatar className="w-10 h-10 ring-2 ring-black/20">
                        <AvatarImage src={n.author ? getAvatarUrl(n.author.avatar_url, n.author.updated_at) : undefined} alt={n.author?.username || ''} />
                        <AvatarFallback className="bg-black/20 text-white font-semibold">
                          {n.author ? (n.author.full_name || n.author.username || '?').slice(0,1) : '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="font-semibold text-slate-900 text-lg">
                          {n.author ? (n.author.full_name || n.author.username || 'Anonymous') : 'Anonymous'}
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-slate-900/70">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(n.created_at).toLocaleDateString('ko-KR', { 
                            year: 'numeric',
                            month: 'long', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}</span>
                        </div>
                      </div>
                    </div>
                    <DialogTitle className="text-2xl font-bold text-slate-900 sr-only">노트 상세</DialogTitle>
                  </DialogHeader>
                  <div className="bg-white/30 backdrop-blur-sm rounded-2xl p-6 border border-black/10">
                    <div className="text-slate-900 leading-relaxed whitespace-pre-wrap break-words text-lg">
                      {n.title}
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          ))}
        </div>
      )}
    </div>
  )
}


