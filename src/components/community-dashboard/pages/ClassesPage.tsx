"use client"

import { useEffect, useRef, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import Image from "next/image"
// Card components were not used; remove to reduce bundle size
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClassCategory, updateClassCategory, deleteClassCategory, createClass, updateClass, ClassCategory, ClassItem, deleteClass, toggleClassCompletion, getClassesOverview } from "@/lib/classes"
import { getAvatarUrl } from "@/lib/profiles"
import { PlusCircle, Pencil, Trash2, AlertTriangle, Eye, Settings, Plus } from "lucide-react"
// supabase import not used in this component
import Link from "next/link"
import { toast } from "sonner"
import { normalizeClassThumbnailUrl } from "@/lib/r2"
import AnimatedBackground from "@/components/AnimatedBackground"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuthData } from "@/components/auth/AuthProvider"
import { getCommunitySettings } from "@/lib/communities"
import { getReadableTextColor, withAlpha } from "@/utils/color"

function fixThumbUrl(url?: string | null) {
  if (!url) return url
  if (url.startsWith('@')) url = url.slice(1)
  return normalizeClassThumbnailUrl(url)
}

export default function ClassesPage({ communityId, ownerId }: { communityId: string; ownerId?: string | null }) {
  const { user } = useAuthData()
  const [categories, setCategories] = useState<ClassCategory[]>([])
  const [activeCat, setActiveCat] = useState<string | null>(null)
  const [items, setItems] = useState<ClassItem[]>([])
  const [query, setQuery] = useState<string>("")
  const [openCreate, setOpenCreate] = useState(false)
  const [openCategoryManage, setOpenCategoryManage] = useState(false)
  const [newCat, setNewCat] = useState("")
  const [editingCategory, setEditingCategory] = useState<{ id: string; name: string } | null>(null)
  const [editCategoryName, setEditCategoryName] = useState("")
  const [form, setForm] = useState({
    title: "",
    description: "",
    category_id: "",
    thumbnail_url: "",
    youtube_url: "",
  })
  const [openEdit, setOpenEdit] = useState(false)
  const [editing, setEditing] = useState<ClassItem | null>(null)
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    category_id: "",
    thumbnail_url: "",
    youtube_url: "",
  })
  const [openDelete, setOpenDelete] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null)
  const [isOwner, setIsOwner] = useState<boolean>(false)
  const [brandColor, setBrandColor] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement | null>(null)
  const editFileInput = useRef<HTMLInputElement | null>(null)
  const createDialogRef = useRef<HTMLDivElement | null>(null)
  const editDialogRef = useRef<HTMLDivElement | null>(null)

  const queryClient = useQueryClient()
  const { data: overviewData, isFetching: loadingOverview } = useQuery({
    queryKey: ['classes.overview', communityId, activeCat || 'all', user?.id || 'guest'],
    queryFn: async () => await getClassesOverview(communityId, { categoryId: activeCat || undefined, userId: user?.id || null }),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    if (!overviewData) return
    setCategories(overviewData.categories || [])
    setItems(overviewData.classes || [])
  }, [overviewData])
  // NOTE: Radix Dialog는 modal 모드로 배경을 inert 처리하므로 별도의 전역 캡처 차단은 사용하지 않음

  useEffect(() => {
    const oid = ownerId || null
    setIsOwner(!!user?.id && !!oid && user.id === oid)
  }, [ownerId, user?.id])

  useEffect(() => {
    ;(async () => {
      try {
        const s = await getCommunitySettings(communityId)
        setBrandColor((s as any)?.brand_color || null)
      } catch {}
    })()
  }, [communityId])

  const addCategory = async () => {
    if (!newCat.trim()) return
    try {
      const c = await createClassCategory(communityId, newCat.trim())
      setNewCat("")
      setCategories(prev => [...prev, c])
      // 생성 직후 필터를 새 카테고리로 전환하여 즉시 확인 가능
      setActiveCat(c.id)
      toast.success('카테고리가 추가되었습니다')
    } catch (error) {
      console.error('Failed to create category:', error)
      toast.error('카테고리 추가에 실패했습니다')
    }
  }

  const startEditCategory = (category: ClassCategory) => {
    setEditingCategory({ id: category.id, name: category.name })
    setEditCategoryName(category.name)
  }

  const updateCategoryName = async () => {
    if (!editingCategory || !editCategoryName.trim()) return
    try {
      const updatedCategory = await updateClassCategory(editingCategory.id, editCategoryName.trim())
      setCategories(prev => prev.map(c => 
        c.id === editingCategory.id ? updatedCategory : c
      ))
      setEditingCategory(null)
      setEditCategoryName("")
      toast.success('카테고리가 수정되었습니다')
    } catch (error) {
      console.error('Failed to update category:', error)
      // 에러 발생 시 편집 상태를 유지하여 사용자가 다시 시도할 수 있도록 함
      toast.error('카테고리 수정에 실패했습니다')
    }
  }

  const cancelEditCategory = () => {
    setEditingCategory(null)
    setEditCategoryName("")
  }

  const removeCategory = async (id: string) => {
    try {
      await deleteClassCategory(id)
      setCategories(prev => prev.filter(c => c.id !== id))
      if (activeCat === id) setActiveCat(null)
      toast.success('카테고리가 삭제되었습니다')
    } catch (error) {
      console.error('Failed to delete category:', error)
      toast.error('카테고리 삭제에 실패했습니다')
    }
  }

  const onUploadThumb = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/class-thumbnails', { method: 'POST', body: formData })
    const body = await res.json()
    if (!res.ok) throw new Error(body?.error || 'upload failed')
    setForm(prev => ({ ...prev, thumbnail_url: body.url }))
    // 업로드 후에도 생성 모달이 유지되도록 강제 오픈 유지
    setOpenCreate(true)
  }

  const onUploadEditThumb = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/class-thumbnails', { method: 'POST', body: formData })
    const body = await res.json()
    if (!res.ok) throw new Error(body?.error || 'upload failed')
    setEditForm(prev => ({ ...prev, thumbnail_url: body.url }))
    // 업로드 후에도 수정 모달이 유지되도록 강제 오픈 유지
    setOpenEdit(true)
  }

  const onCreate = async () => {
    if (!form.title.trim() || !form.description.trim() || !form.category_id) {
      toast.error('제목, 설명, 카테고리는 필수입니다')
      return
    }
    const payload = {
      community_id: communityId,
      category_id: form.category_id || null,
      title: form.title,
      description: form.description,
      thumbnail_url: form.thumbnail_url || null,
      youtube_url: form.youtube_url || null,
      completed: false,
    } as any
    try {
      await createClass(payload)
      toast.success('클래스가 생성되었습니다')
      setOpenCreate(false)
      setForm({ title: "", description: "", category_id: "", thumbnail_url: "", youtube_url: "" })
      // 즉시 목록에 반영
      await queryClient.invalidateQueries({ queryKey: ['classes.overview', communityId] })
    } catch (e) {
      toast.error('클래스 생성에 실패했습니다')
    }
  }

  const openEditModal = (cls: ClassItem) => {
    setEditing(cls)
    setEditForm({
      title: cls.title || "",
      description: cls.description || "",
      category_id: cls.category_id || "",
      thumbnail_url: cls.thumbnail_url || "",
      youtube_url: cls.youtube_url || "",
    })
    setOpenEdit(true)
  }

  const onUpdate = async () => {
    if (!editing) return
    if (!editForm.title.trim() || !editForm.description.trim() || !editForm.category_id) {
      toast.error('제목, 설명, 카테고리는 필수입니다')
      return
    }
    try {
      await updateClass(editing.id, {
        title: editForm.title,
        description: editForm.description,
        category_id: editForm.category_id || null,
        thumbnail_url: editForm.thumbnail_url || null,
        youtube_url: editForm.youtube_url || null,
      })
      toast.success('클래스가 수정되었습니다')
      setOpenEdit(false)
      setEditing(null)
      await queryClient.invalidateQueries({ queryKey: ['classes.overview', communityId] })
    } catch (e) {
      toast.error('클래스 수정에 실패했습니다')
    }
  }

  const onDelete = (id: string, title: string) => {
    setDeleteTarget({ id, title })
    setOpenDelete(true)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteClass(deleteTarget.id)
      toast.success('클래스가 삭제되었습니다')
      setOpenDelete(false)
      setDeleteTarget(null)
      await queryClient.invalidateQueries({ queryKey: ['classes.overview', communityId] })
    } catch (e) {
      toast.error('클래스 삭제에 실패했습니다')
    }
  }

  return (
    <>
      {/* Animated background is heavy on mobile; hide on small screens for perf */}
      <div className="hidden md:block" aria-hidden>
        <AnimatedBackground />
      </div>
      <div className="space-y-6 relative z-10 max-w-6xl mx-auto px-4 md:px-6 lg:px-8">
        {/* 헤드: 타이틀 중앙 + 생성 버튼 우측(절대 배치) */}
        <div className="relative mb-2">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-[-0.02em] text-slate-900 text-center">Welcome to the Classroom!</h1>
          {isOwner && (
          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
             {/* Desktop button: absolute on the right (styled) */}
             <DialogTrigger asChild>
               <Button
                 className="hidden md:flex items-center gap-2 cursor-pointer absolute right-0 top-1/2 -translate-y-1/2 rounded-2xl px-5 py-3 text-base shadow-lg hover:brightness-95"
                 size="lg"
                 style={brandColor ? { backgroundColor: brandColor, color: getReadableTextColor(brandColor) } : undefined}
               >
                 <span className="w-6 h-6 rounded-full border-2 border-white/90 grid place-items-center">
                   <Plus className="w-3.5 h-3.5 text-white" />
                 </span>
                 <span className="font-semibold">클래스 추가</span>
               </Button>
             </DialogTrigger>
            <DialogContent
              className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto"
              onInteractOutside={(e) => e.preventDefault()}
              onEscapeKeyDown={(e) => e.preventDefault()}
              onPointerDownOutside={(e) => e.preventDefault()}
              ref={createDialogRef as any}
            >
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold">새 클래스</DialogTitle>
                <DialogDescription className="sr-only">새 클래스를 생성합니다</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2 space-y-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">클래스 제목</label>
                      <Input
                        placeholder="클래스 제목을 입력하세요"
                        value={form.title}
                        onChange={(e)=>setForm({...form,title:e.target.value})}
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">클래스 설명</label>
                      <Textarea
                        placeholder="클래스에 대한 자세한 설명을 입력하세요"
                        value={form.description}
                        onChange={(e)=>setForm({...form,description:e.target.value})}
                        rows={6}
                        className="resize-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">유튜브 URL</label>
                      <Input
                        placeholder="https://youtube.com/watch?v=..."
                        value={form.youtube_url}
                        onChange={(e)=>setForm({...form,youtube_url:e.target.value})}
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">카테고리</label>
                      <Select value={form.category_id} onValueChange={(v)=>setForm({...form,category_id:v})}>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="카테고리를 선택하세요"/>
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">썸네일 이미지</label>
                      <div
                        className="relative aspect-video rounded-lg border-2 border-dashed border-slate-300 overflow-hidden bg-slate-50 flex items-center justify-center hover:bg-slate-100 transition-colors select-none"
                        onMouseDownCapture={(e)=>{ e.stopPropagation() }}
                        onClick={(e)=>{ e.stopPropagation() }}
                      >
                        {form.thumbnail_url ? (
                          <Image src={fixThumbUrl(form.thumbnail_url) as string} alt="thumb" fill sizes="(max-width: 900px) 90vw, 900px" className="object-cover pointer-events-none select-none" />
                        ) : (
                          <div className="text-center">
                            <div className="w-12 h-12 rounded-xl bg-slate-200 flex items-center justify-center mx-auto mb-2">
                              <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 011 1v16a1 1 0 01-1 1H3a1 1 0 01-1-1V5a1 1 0 011-1h4z" />
                              </svg>
                            </div>
                            <span className="text-sm text-slate-500 font-medium">썸네일 미리보기</span>
                          </div>
                        )}
                      </div>
                      <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={(e)=>{ const f = e.target.files?.[0]; if (f) onUploadThumb(f); if (fileInput.current) fileInput.current.value = '' }} />
                      <Button type="button" variant="outline" onClick={(e)=>{ e.stopPropagation(); fileInput.current?.click() }} className="w-full h-11 cursor-pointer">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        썸네일 업로드
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                  <Button variant="outline" onClick={() => setOpenCreate(false)} className="h-11 px-6 cursor-pointer">
                    취소
                  </Button>
                  <Button onClick={onCreate} className="h-11 px-8 cursor-pointer">
                    클래스 생성
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          )}
          {/* Mobile button: appear under the title */}
          {isOwner && (
            <div className="md:hidden mt-3 flex justify-center">
              <Button onClick={() => setOpenCreate(true)} className="cursor-pointer" size="sm" style={brandColor ? { backgroundColor: brandColor, color: getReadableTextColor(brandColor) } : undefined}>
                <PlusCircle className="w-4 h-4 mr-2"/>
                클래스 추가
              </Button>
            </div>
          )}
        </div>

        {/* 검색바 */}
        <div className="max-w-3xl mx-auto w-full">
          <div className="relative">
            <Input
              value={query}
              onChange={(e)=>setQuery(e.target.value)}
              placeholder="클래스 제목, 설명, 작성자로 검색해보세요..."
              className="h-12 rounded-2xl pl-4 pr-4 shadow-sm border-slate-200"
            />
          </div>
        </div>

        {/* 카테고리 필터 */}
        <div className="relative">
          {/* 모바일: 가로 스크롤, 데스크톱: 중앙 정렬 */}
          <div className="flex gap-2.5 pb-3 items-center overflow-x-auto whitespace-nowrap scrollbar-hide px-1 md:overflow-visible md:flex-wrap md:justify-center">
            <button 
              onClick={() => setActiveCat(null)} 
              className={`flex-shrink-0 px-4 py-2 rounded-lg border text-sm font-semibold transition-all duration-200 cursor-pointer ${
                !activeCat 
                  ? 'shadow-sm ring-1 ring-black/5' 
                  : 'bg-gradient-to-b from-white to-slate-50 text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-white hover:shadow-md'
              }`}
              style={!activeCat && brandColor ? { backgroundColor: brandColor, color: getReadableTextColor(brandColor), borderColor: brandColor, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' } : undefined}
            >
              전체
            </button>
            {categories.map(category => (
              <button 
                key={category.id}
                onClick={() => setActiveCat(category.id)} 
                className={`flex-shrink-0 px-4 py-2 rounded-lg border text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  activeCat === category.id 
                    ? 'shadow-sm ring-1 ring-black/5' 
                    : 'bg-gradient-to-b from-white to-slate-50 text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-white hover:shadow-md'
                }`}
                style={activeCat === category.id && brandColor ? { backgroundColor: brandColor, color: getReadableTextColor(brandColor), borderColor: brandColor, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' } : undefined}
              >
                {category.name}
              </button>
            ))}
            {isOwner && (
              <button 
                onClick={() => setOpenCategoryManage(true)}
                className="ml-2 p-2 rounded-sm transition-colors duration-200 flex-shrink-0"
                style={brandColor ? { backgroundColor: withAlpha(brandColor, 0.08), border: `1px solid ${withAlpha(brandColor, 0.25)}` } : undefined}
                title="카테고리 관리"
              >
                <Settings className="w-4 h-4" style={{ color: brandColor || '#0f172a' }} />
              </button>
            )}
          </div>
          {/* 좌우 여백만 유지 - 스크롤 그라디언트 제거 */}
        </div>

        {/* 카드 그리드: explore 스타일 - 동일 크기 카드 */}
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mb-6 shadow-lg">
              <PlusCircle className="w-12 h-12 text-slate-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3 text-center">
              등록된 클래스가 없습니다
            </h3>
            {isOwner && (
              <>
                <p className="text-slate-600 text-center mb-8 max-w-md leading-relaxed">
                  아직 등록된 클래스가 없습니다. <strong>'클래스 추가'</strong> 버튼을 눌러 첫 번째 클래스를 생성해보세요!
                </p>
                <Button
                  onClick={() => setOpenCreate(true)}
                  className="px-8 py-3 cursor-pointer shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  <PlusCircle className="w-5 h-5 mr-2" />
                  클래스 추가
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 md:gap-7 xl:gap-8">
            {items
              .filter(cls => {
                const q = query.trim().toLowerCase()
                if (!q) return true
                const author = (cls.author?.full_name || cls.author?.username || '').toLowerCase()
                return (
                  cls.title.toLowerCase().includes(q) ||
                  (cls.description || '').toLowerCase().includes(q) ||
                  author.includes(q)
                )
              })
              .map((cls, idx) => (
              <Link key={cls.id} href={`./classes/${cls.id}`} className="group" prefetch={false}>
                <article className="h-full overflow-hidden rounded-xl bg-gradient-to-br from-slate-50 to-white shadow-sm hover:shadow-xl transition-all duration-300 group-hover:scale-[1.01] border border-slate-300 relative">
                  {/* 썸네일 영역 */}
                  <div className="relative w-full aspect-[16/9] overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
                    {cls.thumbnail_url ? (
                      <Image
                        src={fixThumbUrl(cls.thumbnail_url) as string}
                        alt={cls.title}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1536px) 33vw, 25vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        priority={idx < 3}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-slate-200 border border-slate-300 flex items-center justify-center">
                            <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 011 1v16a1 1 0 01-1 1H3a1 1 0 01-1-1V5a1 1 0 011-1h4z" />
                            </svg>
                          </div>
                          <span className="text-sm font-medium">썸네일 없음</span>
                        </div>
                      </div>
                    )}

                    {/* 그라데이션 오버레이 */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>

                  {/* 콘텐츠 영역 */}
                  <div className="p-4 md:p-6 space-y-4 md:space-y-5">
                    {/* 작성자 프로필 */}
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8 md:w-9 md:h-9 border-2 border-white shadow-sm">
                        <AvatarImage
                          src={cls.author?.avatar_url ? getAvatarUrl(cls.author.avatar_url, cls.author.updated_at) : undefined}
                          alt={cls.author?.username || cls.author?.full_name || 'Author'}
                        />
                        <AvatarFallback className="bg-slate-200 text-slate-600 text-xs md:text-sm font-medium border border-slate-300">
                          {cls.author?.full_name ?
                            cls.author.full_name.slice(0,1).toUpperCase() :
                            cls.author?.username ?
                              cls.author.username.slice(0,1).toUpperCase() :
                              '?'
                          }
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs md:text-sm font-semibold text-slate-800 truncate">
                          {cls.author?.full_name || cls.author?.username || 'Anonymous'}
                        </div>
                      </div>
                    </div>

                    {/* 제목 */}
                    <h3 className="text-base md:text-xl font-bold text-slate-900 leading-tight line-clamp-2 group-hover:text-slate-800 transition-colors duration-300">
                      {cls.title}
                    </h3>

                    {/* 메타 정보 */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                      <div className="flex items-center gap-4 md:gap-6 flex-wrap">
                        <div className="flex items-center gap-2 text-xs md:text-sm text-slate-600">
                          <Eye className="w-4 h-4 text-slate-500" />
                          <span className="font-medium">{cls.views || 0}</span>
                        </div>
                      </div>

                      {/* 수강 완료 체크박스 */}
                      <label
                        className="inline-flex items-center gap-2 md:gap-3 cursor-pointer text-slate-700 hover:text-slate-900 transition-colors duration-300 sm:ml-auto"
                        onClick={(e) => e.preventDefault()}
                      >
                        <span
                          className={`w-5 h-5 md:w-6 md:h-6 rounded-xl border-2 ${
                            cls.completed
                              ? 'bg-slate-800 border-slate-800 text-white shadow-md'
                              : 'bg-white border-slate-300 hover:border-slate-400 shadow-sm'
                          } inline-flex items-center justify-center transition-all duration-300 hover:shadow-lg`}
                        >
                          {cls.completed ? '✓' : ''}
                        </span>
                        <input
                          type="checkbox"
                          checked={!!cls.completed}
                          onChange={async (e)=>{
                            try {
                              await toggleClassCompletion(cls.id, e.target.checked);
                              setItems(prev => prev.map(p => p.id===cls.id ? { ...p, completed: e.target.checked } : p))
                            } catch (error) {
                              console.error('Failed to toggle class completion:', error)
                              // 에러 시 체크박스 상태 되돌리기
                              e.target.checked = !e.target.checked
                            }
                          }}
                          className="hidden"
                        />
                        <span className="text-sm font-semibold">수강 완료</span>
                      </label>
                    </div>
                  </div>

                  {/* 액션 버튼 */}
                  {isOwner && (
                    <div className="absolute right-4 top-4 z-30 opacity-0 group-hover:opacity-100 transition-all duration-300 flex gap-2">
                      <button
                        className="w-10 h-10 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-lg hover:shadow-xl cursor-pointer grid place-items-center transition-all duration-300 hover:scale-105"
                        title="수정"
                        onClick={(e)=>{ e.preventDefault(); openEditModal(cls) }}
                      >
                        <Pencil className="w-4 h-4 text-slate-700" />
                      </button>
                      <button
                        className="w-10 h-10 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-lg hover:shadow-xl cursor-pointer grid place-items-center text-red-600 hover:text-red-700 transition-all duration-300 hover:scale-105"
                        title="삭제"
                        onClick={(e)=>{ e.preventDefault(); onDelete(cls.id, cls.title) }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </article>
              </Link>
            ))}
          </div>
        )}

        {/* 수정 모달 */}
        <Dialog open={openEdit} onOpenChange={setOpenEdit}>
          <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto" ref={editDialogRef as any}>
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">클래스 수정</DialogTitle>
              <DialogDescription className="sr-only">선택한 클래스를 수정합니다</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 space-y-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">클래스 제목</label>
                    <Input
                      placeholder="클래스 제목을 입력하세요"
                      value={editForm.title}
                      onChange={(e)=>setEditForm({...editForm,title:e.target.value})}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">클래스 설명</label>
                    <Textarea
                      placeholder="클래스에 대한 자세한 설명을 입력하세요"
                      value={editForm.description}
                      onChange={(e)=>setEditForm({...editForm,description:e.target.value})}
                      rows={6}
                      className="resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">유튜브 URL</label>
                    <Input
                      placeholder="https://youtube.com/watch?v=..."
                      value={editForm.youtube_url}
                      onChange={(e)=>setEditForm({...editForm,youtube_url:e.target.value})}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">카테고리</label>
                    <Select value={editForm.category_id} onValueChange={(v)=>setEditForm({...editForm,category_id:v})}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="카테고리를 선택하세요"/>
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">썸네일 이미지</label>
                    <div
                      className="relative aspect-video rounded-lg border-2 border-dashed border-slate-300 overflow-hidden bg-slate-50 flex items-center justify-center hover:bg-slate-100 transition-colors select-none"
                      onMouseDownCapture={(e)=>{ e.stopPropagation() }}
                      onClick={(e)=>{ e.stopPropagation() }}
                    >
                      {editForm.thumbnail_url ? (
                        <Image src={fixThumbUrl(editForm.thumbnail_url) as string} alt="thumb" fill sizes="(max-width: 900px) 90vw, 900px" className="object-cover pointer-events-none select-none" />
                      ) : (
                        <div className="text-center">
                          <div className="w-12 h-12 rounded-xl bg-slate-200 flex items-center justify-center mx-auto mb-2">
                            <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 011 1v16a1 1 0 01-1 1H3a1 1 0 01-1-1V5a1 1 0 011-1h4z" />
                            </svg>
                          </div>
                          <span className="text-sm text-slate-500 font-medium">썸네일 미리보기</span>
                        </div>
                      )}
                    </div>
                    <input ref={editFileInput} type="file" accept="image/*" className="hidden" onChange={(e)=>{ const f = e.target.files?.[0]; if (f) onUploadEditThumb(f); if (editFileInput.current) editFileInput.current.value = '' }} />
                    <Button type="button" variant="outline" onClick={(e)=>{ e.stopPropagation(); editFileInput.current?.click() }} className="w-full h-11 cursor-pointer">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      썸네일 업로드
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <Button variant="outline" onClick={() => setOpenEdit(false)} className="h-11 px-6 cursor-pointer">
                  취소
                </Button>
                <Button onClick={onUpdate} className="h-11 px-8 cursor-pointer">
                  변경사항 저장
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 카테고리 관리 모달 */}
        <Dialog open={openCategoryManage} onOpenChange={setOpenCategoryManage}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>카테고리 관리</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* 새 카테고리 추가 */}
              <div className="flex gap-2">
                <Input 
                  value={newCat} 
                  onChange={(e) => setNewCat(e.target.value)} 
                  placeholder="새 카테고리 이름" 
                  className="flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && addCategory()}
                />
                <Button onClick={addCategory} disabled={!newCat.trim()}>
                  추가
                </Button>
              </div>
              
              {/* 기존 카테고리 목록 */}
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {categories.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">
                    생성된 카테고리가 없습니다.
                  </p>
                ) : (
                  categories.map(category => (
                    <div key={category.id} className="flex items-center gap-2 p-3 border rounded-lg">
                      {editingCategory?.id === category.id ? (
                        <>
                          <Input 
                            value={editCategoryName} 
                            onChange={(e) => setEditCategoryName(e.target.value)} 
                            className="flex-1"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') updateCategoryName()
                              if (e.key === 'Escape') cancelEditCategory()
                            }}
                            autoFocus
                          />
                          <Button size="sm" onClick={updateCategoryName} disabled={!editCategoryName.trim()}>
                            저장
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEditCategory}>
                            취소
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 font-medium text-slate-700">{category.name}</span>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => startEditCategory(category)}
                            className="cursor-pointer"
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => removeCategory(category.id)}
                            className="cursor-pointer text-red-600 hover:text-red-700 hover:border-red-300"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 삭제 확인 모달 - 사이트 톤앤매너 */}
        <Dialog open={openDelete} onOpenChange={setOpenDelete}>
          <DialogContent className="sm:max-w-md">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <DialogTitle className="text-base">클래스를 삭제할까요?</DialogTitle>
                <p className="text-sm text-slate-600">{deleteTarget?.title || '선택한 클래스'}를 영구적으로 삭제합니다. 이 작업은 되돌릴 수 없습니다.</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" className="cursor-pointer" onClick={()=>setOpenDelete(false)}>취소</Button>
              <Button className="bg-red-600 hover:bg-red-700 text-white cursor-pointer" onClick={confirmDelete}>삭제</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  )
}


