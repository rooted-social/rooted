"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { createNotice, getCommunitySettings, getNotices, upsertCommunitySettings, getCommunityServices, addCommunityService, removeCommunityService, updateCommunity, deleteCommunity } from "@/lib/communities"
import { getAuthToken } from "@/lib/supabase"
import { supabase } from "@/lib/supabase"
import type { CommunitySettings, Notice } from "@/types/community"
import { buildPublicR2UrlForBucket, COMMUNITY_BANNER_BUCKET } from "@/lib/r2"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { COMMUNITY_CATEGORIES } from '@/lib/constants'
import { Trash2, X, Pin } from "lucide-react"
import { BRAND_COLOR_PALETTE, getReadableTextColor, normalizeHex } from "@/utils/color"

interface SettingsTabProps {
  communityId: string
}

type GalleryItem = { key: string; url: string }

type SubTab = 'page' | 'basic' | 'advanced'

export function SettingsTab({ communityId }: SettingsTabProps) {
  const router = useRouter()
  const params = useParams()
  const routeSlug = (params as any)?.slug as string | undefined

  const [active, setActive] = useState<SubTab>('page')

  const [values, setValues] = useState<Partial<CommunitySettings>>({})
  const [loading, setLoading] = useState<boolean>(true)
  const [saving, setSaving] = useState<boolean>(false)
  const [notices, setNotices] = useState<Notice[]>([])
  const [noticeTitle, setNoticeTitle] = useState("")
  const [noticeContent, setNoticeContent] = useState("")
  const [services, setServices] = useState<{ id: string; label: string }[]>([])
  const [newService, setNewService] = useState("")
  const [slug, setSlug] = useState<string>(routeSlug || "")
  const [images, setImages] = useState<GalleryItem[]>([])
  const [uploading, setUploading] = useState<boolean>(false)
  const bannerInputRef = useRef<HTMLInputElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const iconInputRef = useRef<HTMLInputElement | null>(null)

  // viewer / delete modals
  const [viewerOpen, setViewerOpen] = useState<boolean>(false)
  const [viewerUrl, setViewerUrl] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState<boolean>(false)
  const [deleteKey, setDeleteKey] = useState<string | null>(null)
  // community delete modal
  const [deleteCommunityOpen, setDeleteCommunityOpen] = useState<boolean>(false)
  const [deleteCommunityText, setDeleteCommunityText] = useState<string>("")

  // drag state
  const [dragKey, setDragKey] = useState<string | null>(null)

  // UI state: 브랜드 컬러 선택 모달
  const [brandModalOpen, setBrandModalOpen] = useState<boolean>(false)

  // community basics
  const [communityName, setCommunityName] = useState<string>("")
  const [communitySlug, setCommunitySlug] = useState<string>(slug)
  const [communityDesc, setCommunityDesc] = useState<string>("")
  const [communityCategory, setCommunityCategory] = useState<string>("")
  const [communityIconUrl, setCommunityIconUrl] = useState<string>("")
  const [isPublic, setIsPublic] = useState<boolean>(true)
  const [joinPolicy, setJoinPolicy] = useState<'free'|'approval'>('free')
  // 기본 정보 초기값 스냅샷(변경 감지용)
  const [basicInitial, setBasicInitial] = useState<{ name: string; slug: string; desc: string; category: string } | null>(null)
  // 상세 설정(미션/브랜드 컬러) 초기값 스냅샷
  const [settingsInitial, setSettingsInitial] = useState<{ mission: string; brand_color: string | null } | null>(null)

  useEffect(() => {
    let isMounted = true
    ;(async () => {
      setLoading(true)
      try {
        const token = await getAuthToken().catch(() => null)
        const res = await fetch(`/api/settings/overview?communityId=${encodeURIComponent(communityId)}`, { headers: token ? { authorization: `Bearer ${token}` } : undefined })
        if (!res.ok) throw new Error('failed to load settings overview')
        const data = await res.json()
        if (!isMounted) return
        const s = data?.settings || null
        setValues(s || {})
        setSettingsInitial({ mission: (s?.mission || ""), brand_color: (s?.brand_color ?? null) as any })
        setNotices((data?.notices || []).slice(0, 50))
        setServices((data?.services || []).map((v: any) => ({ id: v.id, label: v.label })))
        // basics는 별도 effect에서 supabase로 로드하지만, 여기서도 보조로 반영할 수 있음 (slug/이름 등)
      } catch {
        // 폴백: 기존 개별 호출 (오류 시에도 UI는 로딩 해제)
        try {
          const [s, ns, sv] = await Promise.all([
            getCommunitySettings(communityId),
            getNotices(communityId),
            getCommunityServices(communityId),
          ])
          if (!isMounted) return
          setValues(s || {})
          setSettingsInitial({ mission: (s?.mission || ""), brand_color: (s?.brand_color ?? null) as any })
          setNotices(ns)
          setServices(sv.map(v => ({ id: v.id, label: v.label })))
        } catch {}
      } finally {
        if (isMounted) setLoading(false)
      }
    })()
    return () => { isMounted = false }
  }, [communityId])

  // load community basics
  useEffect(() => {
    let alive = true
    ;(async () => {
      let { data, error } = await supabase
        .from('communities')
        .select('name, slug, description, category, image_url, icon_url, is_public, join_policy')
        .eq('id', communityId)
        .single()
      if (error) {
        // 폴백: 확장 필드 없는 구 스키마
        const retry = await supabase
          .from('communities')
          .select('name, slug, description, category, image_url, icon_url')
          .eq('id', communityId)
          .single()
        data = retry.data as any
      }
      if (!alive || !data) return
      setCommunityName(data.name || '')
      setCommunitySlug(data.slug || '')
      setCommunityDesc(data.description || '')
      setCommunityCategory(data.category || '')
      setCommunityIconUrl((data as any).icon_url || data.image_url || '')
      setIsPublic((data as any)?.is_public ?? true)
      setJoinPolicy(((data as any)?.join_policy as any) || 'free')
      if (!slug) setSlug(data.slug || '')
      // 초기 스냅샷 저장(한 번만 세팅)
      setBasicInitial({ name: data.name || '', slug: data.slug || '', desc: data.description || '', category: data.category || '' })
    })()
    return () => { alive = false }
  }, [communityId])

  useEffect(() => {
    if (routeSlug && routeSlug !== slug) setSlug(routeSlug)
  }, [routeSlug])

  useEffect(() => {
    if (!slug) return
    void reloadImages(slug)
  }, [slug])

  const reloadImages = async (s: string) => {
    try {
      const res = await fetch(`/api/community-images/${encodeURIComponent(s)}`).then(r => r.json())
      setImages(res?.images || [])
    } catch {
      setImages([])
    }
  }

  const handleSaveCommunityBasics = async () => {
    try {
      const updated = await updateCommunity(communityId, {
        name: communityName?.trim() || '',
        slug: communitySlug?.trim() || '',
        description: communityDesc || '',
        category: communityCategory || '',
        // 대표 이미지(image_url)와 아이콘(icon_url)을 분리 저장
        image_url: (values.banner_url ? values.banner_url : undefined) as any,
        // @ts-ignore - 확장 컬럼 icon_url 지원
        icon_url: (communityIconUrl || undefined) as any,
        // @ts-ignore - 확장 필드 지원
        is_public: isPublic,
        join_policy: joinPolicy,
      })
      setSlug(updated.slug)
      setCommunityIconUrl(((updated as any).icon_url || (updated as any).image_url) || '')
      toast.success('커뮤니티 기본 정보가 저장되었습니다')
    } catch (e: any) {
      toast.error(e?.message || '저장 중 오류가 발생했습니다')
    }
  }

  const handleSaveSettings = async (patch?: Partial<CommunitySettings>) => {
    setSaving(true)
    try {
      const payload = {
        mission: (patch?.mission ?? values.mission) || "",
        // 브랜드 컬러 저장 (선택적)
        brand_color: (patch?.brand_color ?? values.brand_color) || null,
        // 배너 URL도 포함(있을 경우)
        banner_url: (patch?.banner_url ?? (values as any).banner_url) || null,
      }
      const s = await upsertCommunitySettings(communityId, payload)
      setValues(s)
      try { window.dispatchEvent(new CustomEvent('brand-color-updated', { detail: { color: s?.brand_color || null } })) } catch {}
      toast.success('설정이 저장되었습니다')
    } finally {
      setSaving(false)
    }
  }

  const handleAddNotice = async () => {
    if (!noticeTitle.trim()) return
    const n = await createNotice({ community_id: communityId, user_id: '', title: noticeTitle, content: noticeContent, pinned: false })
    setNotices((prev) => [n, ...prev])
    setNoticeTitle("")
    setNoticeContent("")
    toast.success('공지사항이 추가되었습니다')
  }

  const handleAddService = async () => {
    if (!newService.trim()) return
    const created = await addCommunityService(communityId, newService.trim())
    setServices(prev => [...prev, { id: created.id, label: created.label }])
    setNewService("")
    toast.success('서비스가 추가되었습니다')
  }

  const handleRemoveService = async (id: string) => {
    await removeCommunityService(id)
    setServices(prev => prev.filter(s => s.id !== id))
    toast.success('서비스가 삭제되었습니다')
  }

  const onUpload = async (f: File, target: 'images' | 'icon' = 'images') => {
    if (!slug) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', f)
      form.append('target', target)
      const token = await (await import('@/lib/supabase')).getAuthToken()
      const res = await fetch(`/api/community-images/${encodeURIComponent(slug)}`, { method: 'POST', body: form, headers: token ? { 'Authorization': `Bearer ${token}` } : undefined })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.error || '업로드 실패')
      if (target === 'icon') {
        const url = body?.url || communityIconUrl
        setCommunityIconUrl(url)
        try { window.dispatchEvent(new CustomEvent('community-icon-updated', { detail: { url } })) } catch {}
      } else {
        await reloadImages(slug)
      }
      toast.success('업로드가 완료되었습니다')
    } catch (e: any) {
      toast.error(e?.message || '업로드 중 오류가 발생했습니다')
    } finally {
      setUploading(false)
    }
  }

  const onUploadBanner = async (f: File) => {
    if (!slug) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', f)
      form.append('target', 'banner')
      const token = await (await import('@/lib/supabase')).getAuthToken()
      const res = await fetch(`/api/community-images/${encodeURIComponent(slug)}`, { method: 'POST', body: form, headers: token ? { 'Authorization': `Bearer ${token}` } : undefined })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.error || '업로드 실패')
      const key = body?.key as string
      const url = buildPublicR2UrlForBucket(COMMUNITY_BANNER_BUCKET, key)
      setValues(v => ({ ...v, banner_url: url }))
      toast.success('배너가 업로드되었습니다')
    } catch (e: any) {
      toast.error(e?.message || '업로드 중 오류가 발생했습니다')
    } finally {
      setUploading(false)
      if (bannerInputRef.current) bannerInputRef.current.value = ''
    }
  }

  const onDelete = async (key: string) => {
    if (!slug) return
    try {
      const token = await (await import('@/lib/supabase')).getAuthToken()
      const res = await fetch(`/api/community-images/${encodeURIComponent(slug)}?key=${encodeURIComponent(key)}`, { method: 'DELETE', headers: token ? { 'Authorization': `Bearer ${token}` } : undefined })
      if (!res.ok) throw new Error('삭제 실패')
      await reloadImages(slug)
      toast.success('이미지가 삭제되었습니다')
    } catch (e: any) {
      toast.error(e?.message || '삭제 중 오류가 발생했습니다')
    }
  }

  // Drag handlers for images
  const onDragStart = (key: string) => setDragKey(key)
  const onDragOver = (e: React.DragEvent) => e.preventDefault()
  const onDrop = async (targetKey: string) => {
    if (!dragKey || dragKey === targetKey) return
    const current = images.slice()
    const from = current.findIndex(i => i.key === dragKey)
    const to = current.findIndex(i => i.key === targetKey)
    if (from < 0 || to < 0) return
    const [moved] = current.splice(from, 1)
    current.splice(to, 0, moved)
    setImages(current)
    setDragKey(null)
    try {
      const token = await (await import('@/lib/supabase')).getAuthToken()
      await fetch(`/api/community-images/order/${encodeURIComponent(slug)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: JSON.stringify({ keys: current.map(i => i.key), mainKey: current[0]?.key })
      })
    } catch {}
  }

  const onPin = async (key: string) => {
    if (!slug) return
    // 순서를 UI에서 먼저 반영: 대상 이미지를 맨 앞으로 이동
    const next = images.slice()
    const idx = next.findIndex(i => i.key === key)
    if (idx <= 0) return // 이미 대표이거나 존재하지 않음
    const [picked] = next.splice(idx, 1)
    next.unshift(picked)
    setImages(next)
    try {
      const token = await (await import('@/lib/supabase')).getAuthToken()
      await fetch(`/api/community-images/order/${encodeURIComponent(slug)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: JSON.stringify({ keys: next.map(i => i.key), mainKey: key })
      })
      toast.success('대표 사진으로 설정했습니다')
    } catch (e: any) {
      toast.error(e?.message || '대표 사진 설정 중 오류가 발생했습니다')
      // 실패 시 목록 재로드로 복구
      await reloadImages(slug)
    }
  }

  if (loading) {
    return <div className="h-24 bg-slate-100 rounded-xl animate-pulse" />
  }

  const nameMax = 20
  const descMax = 100
  const missionMax = 50
  const settingsChanged = (values.mission || "") !== (settingsInitial?.mission || "") || ((values.brand_color ?? null) !== (settingsInitial?.brand_color ?? null))
  const basicsChanged = !!basicInitial && (basicInitial.name !== communityName || basicInitial.slug !== communitySlug || basicInitial.desc !== communityDesc || basicInitial.category !== communityCategory)
  const combinedChanged = basicsChanged || settingsChanged

  const handleSaveAll = async () => {
    // 기본 정보 + 상세 설정(미션/브랜드컬러) 함께 저장
    await handleSaveCommunityBasics()
    await handleSaveSettings()
    setBasicInitial({ name: communityName, slug: communitySlug, desc: communityDesc, category: communityCategory })
    setSettingsInitial({ mission: (values.mission || ""), brand_color: (values.brand_color ?? null) as any })
  }

  return (
    <section className="space-y-4">
      {/* Sub Tabs - centered (대시보드 설정 탭 제거) */}
      <div className="flex items-center justify-center gap-1.5">
        {([
          { k: 'page', label: '커뮤니티 설정' },
          { k: 'advanced', label: '고급 설정' },
        ] as const).map(tab => (
          <button
            key={tab.k}
            onClick={() => setActive(tab.k as SubTab)}
            className={`px-3.5 py-1.5 rounded-full border text-sm transition-colors cursor-pointer ${active===tab.k ? 'bg-slate-900 text-white border-slate-900' : 'text-slate-700 hover:bg-slate-50 border-slate-200'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Page Settings */}
      {active === 'page' && (
        <div className="space-y-3">
          <Card>
            <CardHeader className="flex items-center justify-between px-4 py-3">
              <CardTitle>커뮤니티 기본 정보</CardTitle>
              <div className="flex gap-2">
                <Button onClick={handleSaveAll} variant={combinedChanged ? 'default' : 'outline'}>
                  {combinedChanged ? '변경된 사항 저장' : '변경된 사항 저장'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 px-4 pb-4">
              <div className="grid md:grid-cols-2 gap-2.5">
                <div>
                  <Label className="text-xs text-slate-600">커뮤니티 이름</Label>
                  <Input value={communityName} maxLength={nameMax} onChange={(e) => setCommunityName(e.target.value)} placeholder="예: 루티드 커뮤니티" />
                  <div className="text-xs text-slate-500 text-right mt-1">{communityName.length}/{nameMax}</div>
                </div>
                <div>
                  <Label className="text-xs text-slate-600">카테고리</Label>
                  <Select value={communityCategory} onValueChange={setCommunityCategory}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="카테고리 선택" /></SelectTrigger>
                    <SelectContent>
                      {COMMUNITY_CATEGORIES.filter(c => c !== '전체').map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs text-slate-600">커뮤니티 소개</Label>
                  <Textarea value={communityDesc} maxLength={descMax} onChange={(e) => setCommunityDesc(e.target.value)} placeholder="커뮤니티 소개" />
                  <div className="text-xs text-slate-500 text-right">{communityDesc.length}/{descMax}</div>
                </div>

                {/* Our Mission - 커뮤니티 소개 아래 배치 */}
                <div className="md:col-span-2">
                  <Label className="text-xs text-slate-600">Our Mission</Label>
                  <Textarea
                    placeholder="커뮤니티 미션을 입력하세요"
                    value={values.mission || ""}
                    maxLength={missionMax}
                    onChange={(e) => setValues((v) => ({ ...v, mission: e.target.value }))}
                  />
                  <div className="text-xs text-slate-500 text-right mt-1">{(values.mission || "").length}/{missionMax}</div>
                </div>
              </div>
              
              {/* 커뮤니티 아이콘 섹션 */}
              <div className="border-t pt-3">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-medium">커뮤니티 아이콘</Label>
                  <div className="flex gap-2">
                    <input ref={iconInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f, 'icon'); if (iconInputRef.current) iconInputRef.current.value = '' }} />
                    <Button size="sm" onClick={() => iconInputRef.current?.click()} disabled={uploading}>{uploading ? '업로드 중...' : '이미지 변경'}</Button>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                    {communityIconUrl ? <img src={communityIconUrl} alt="icon" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">no icon</div>}
                  </div>
                  <div className="text-xs text-slate-600">버킷: community-icons / 경로: {slug ? `${slug}/` : '(slug 로딩중)'}</div>
                </div>
              </div>

              {/* 대시보드 브랜드 컬러 - 아이콘 아래 배치 */}
              <div className="border-t pt-3">
              <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-medium">대시보드 브랜드 컬러</Label>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setBrandModalOpen(true)}>변경</Button>
                </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 items-center">
                  <p className="text-xs text-slate-600">활성 버튼과 강조 요소에 적용됩니다.</p>
                <div className="flex items-center md:justify-end gap-3">
                    <div
                      className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-sm border"
                      style={{ backgroundColor: values.brand_color || '#0f172a', color: getReadableTextColor(values.brand_color || '#0f172a'), borderColor: 'rgba(0,0,0,0.08)' }}
                    >
                      활성 버튼 예시
                    </div>
                    <div className="text-xs text-slate-600">현재 색상: <span className="font-medium text-slate-800">{normalizeHex(values.brand_color || '#0f172a')}</span></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 대시보드 배너 이미지를 커뮤니티 이미지 위에 배치 */}
          <Card>
            <CardHeader className="flex items-center justify-between px-4 py-3">
              <CardTitle>대시보드 배너 이미지</CardTitle>
              <div className="flex gap-2">
                <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadBanner(f) }} />
                <Button size="sm" onClick={() => bannerInputRef.current?.click()} disabled={uploading}>{uploading ? '업로드 중...' : '배너 업로드'}</Button>
                <Button size="sm" variant="outline" onClick={() => handleSaveSettings()} disabled={saving}>{saving ? '저장 중...' : '설정 저장'}</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5 px-4 pb-4">
              <p className="text-xs text-slate-600">권장 비율: (예: 16:4 ~ 21:9) 가로로 긴 배너가 대시보드 홈 상단에 노출됩니다.</p>
              <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
                {values.banner_url ? (
                  <img src={values.banner_url} alt="banner" className="w-full h-40 md:h-56 lg:h-60 object-cover" />
                ) : (
                  <div className="w-full h-40 md:h-56 lg:h-60 flex items-center justify-center text-slate-500 text-sm">루트를 대표하는 배너 이미지를 등록해보세요!</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <CardTitle>커뮤니티 이미지</CardTitle>
                <span className="text-sm text-slate-500">({images.length}/10)</span>
              </div>
              <div className="flex gap-2">
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f, 'images'); if (fileInputRef.current) fileInputRef.current.value = '' }} />
                <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>{uploading ? '업로드 중...' : '이미지 추가'}</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 px-4 pb-4">
              <p className="text-xs text-slate-600">첫 번째 이미지가 대표 이미지로 설정되며, 이미지 위치 변경은 드래그를 통해 가능합니다</p>
              {/* 모바일: 한 줄 2개 노출 + 가로 스크롤 */}
              <div className="block sm:hidden">
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory">
                  {images.map((img, idx) => (
                    <div
                      key={img.key}
                      className="group relative flex-none w-[48%] aspect-[4/3] rounded-lg overflow-hidden border border-slate-200 cursor-zoom-in snap-start"
                      draggable
                      onDragStart={() => onDragStart(img.key)}
                      onDragOver={onDragOver}
                      onDrop={() => onDrop(img.key)}
                      onClick={() => { setViewerUrl(img.url); setViewerOpen(true) }}
                      title="드래그하여 순서 변경"
                    >
                      <img src={img.url} alt="image" className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                      {idx === 0 && (
                        <div className="absolute top-2 left-2 z-10">
                          <span className="inline-flex items-center px-2 py-1 rounded-full bg-amber-500 text-white text-[11px] font-semibold shadow-sm border border-white/70">대표 사진</span>
                        </div>
                      )}
                      <div className="absolute top-2 right-2 flex gap-1">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 px-2 rounded-md bg-white/90 hover:bg-white text-slate-900 shadow-sm opacity-100"
                          onClick={(e) => { e.stopPropagation(); onPin(img.key) }}
                          title="대표 사진으로 설정"
                        >
                          <Pin className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 px-2 rounded-md bg-white/90 hover:bg-white text-slate-900 shadow-sm opacity-100"
                          onClick={(e) => { e.stopPropagation(); setDeleteKey(img.key); setDeleteOpen(true) }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 데스크톱: 그리드 레이아웃 */}
              <div className="hidden sm:grid grid-cols-4 lg:grid-cols-5 gap-2">
                {images.map((img, idx) => (
                  <div
                    key={img.key}
                    className="group relative aspect-[4/3] rounded-lg overflow-hidden border border-slate-200 cursor-zoom-in"
                    draggable
                    onDragStart={() => onDragStart(img.key)}
                    onDragOver={onDragOver}
                    onDrop={() => onDrop(img.key)}
                    onClick={() => { setViewerUrl(img.url); setViewerOpen(true) }}
                    title="드래그하여 순서 변경"
                  >
                    <img src={img.url} alt="image" className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
                    {idx === 0 && (
                      <div className="absolute top-2 left-2 z-10">
                        <span className="inline-flex items-center px-2 py-1 rounded-full bg-amber-500 text-white text-[11px] font-semibold shadow-sm border border-white/70">대표 사진</span>
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 px-2 rounded-md bg-white/90 hover:bg-white text-slate-900 shadow-sm"
                        onClick={(e) => { e.stopPropagation(); onPin(img.key) }}
                        title="대표 사진으로 설정"
                      >
                        <Pin className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 px-2 rounded-md bg-white/90 hover:bg-white text-slate-900 shadow-sm"
                        onClick={(e) => { e.stopPropagation(); setDeleteKey(img.key); setDeleteOpen(true) }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 이미지 뷰어 모달 */}
          <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
            <DialogContent showCloseButton={false} className="bg-transparent border-0 p-0 shadow-none sm:max-w-[95vw]">
              <DialogHeader>
                <DialogTitle className="sr-only">이미지 보기</DialogTitle>
                <DialogDescription className="sr-only">선택한 커뮤니티 이미지의 원본을 표시합니다.</DialogDescription>
              </DialogHeader>
              <div className="w-full h-[85vh] flex items-center justify-center">
                {viewerUrl && (
                  <div className="relative inline-flex">
                    <img src={viewerUrl} alt="image-viewer" className="max-w-[95vw] max-h-[85vh] object-contain rounded-lg shadow-xl" />
                    <DialogClose className="absolute -top-2 -right-2 rounded-full bg-black/60 hover:bg-black/70 text-white p-2 shadow-md cursor-pointer">
                      <X className="w-4 h-4" />
                      <span className="sr-only">닫기</span>
                    </DialogClose>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* 삭제 확인 모달 */}
          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>이미지 삭제</DialogTitle>
                <DialogDescription>이 이미지를 삭제하시겠어요? 이 작업은 되돌릴 수 없습니다.</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteOpen(false)}>취소</Button>
                <Button variant="destructive" onClick={async () => { if (deleteKey) { await onDelete(deleteKey) }; setDeleteOpen(false); setDeleteKey(null) }}>삭제</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Card>
            <CardHeader className="flex items-center justify-between px-4 py-3">
              <CardTitle>커뮤니티 특징</CardTitle>
              <div className="flex gap-2">
                <Button onClick={handleAddService} disabled={!newService.trim()}>추가</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5 px-4 pb-4">
              <div className="flex gap-2">
                <Input value={newService} onChange={(e) => setNewService(e.target.value)} placeholder="커뮤니티에서 제공하는 가치를 입력하세요" />
              </div>
              {services.length === 0 ? (
                <p className="text-sm text-slate-600">등록된 서비스가 없습니다.</p>
              ) : (
                <ul className="space-y-2 text-sm text-slate-800">
                  {services.map((s) => (
                    <li key={s.id} className="flex items-center justify-between border border-slate-200 rounded-md px-3 py-2">
                      <span>{s.label}</span>
                      <Button size="sm" variant="outline" onClick={() => handleRemoveService(s.id)}>삭제</Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Basic Settings */}
      {active === 'basic' && (
        <div className="space-y-3">
          {/* (비움) */}
        </div>
      )}

      {/* 브랜드 컬러 선택 모달 - 탭과 무관하게 항상 마운트 */}
      <Dialog open={brandModalOpen} onOpenChange={setBrandModalOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>브랜드 컬러 선택</DialogTitle>
            <DialogDescription>팔레트에서 색상을 선택하세요. 저장을 눌러 반영됩니다.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
              {BRAND_COLOR_PALETTE.map((c) => {
                const selected = normalizeHex(values.brand_color || '') === normalizeHex(c)
                const text = getReadableTextColor(c)
                return (
                  <button
                    key={c}
                    title={c}
                    onClick={() => setValues(v => ({ ...v, brand_color: c }))}
                    className={`h-10 rounded-md border cursor-pointer transition-transform active:scale-95 ${selected ? 'ring-2 ring-offset-2 ring-slate-900' : 'hover:scale-[1.02]'} `}
                    style={{ backgroundColor: c, color: text, borderColor: 'rgba(0,0,0,0.08)' }}
                  >
                    <span className="text-[11px] font-semibold">{selected ? '선택됨' : '선택'}</span>
                  </button>
                )
              })}
            </div>
              <div className="flex items-center justify-between pt-1">
                <div className="text-xs text-slate-600">현재: {normalizeHex(values.brand_color || '#0f172a')}</div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setValues(v => ({ ...v, brand_color: null as any }))}
                  >초기화</Button>
                  <Button
                    onClick={async () => {
                      await handleSaveSettings({ brand_color: values.brand_color || null })
                      setSettingsInitial({ mission: (values.mission || ""), brand_color: (values.brand_color ?? null) as any })
                      setBrandModalOpen(false)
                    }}
                  >완료</Button>
                </div>
              </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Advanced Settings */}
      {active === 'advanced' && (
        <div className="space-y-3">
          {/* 커뮤니티 공개 설정 */}
          <Card>
            <CardHeader className="flex items-center justify-between px-4 py-3">
              <CardTitle>커뮤니티 공개 설정</CardTitle>
              <Button onClick={handleSaveCommunityBasics} size="sm">저장</Button>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">공개 여부</Label>
                  <p className="text-xs text-slate-600">공개 시 '루트 둘러보기' 페이지에 노출됩니다.</p>
                </div>
                <div className="flex items-center space-x-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPublic}
                      onChange={(e) => setIsPublic(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-slate-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                  </label>
                  <span className="text-sm font-medium text-slate-700">
                    {isPublic ? '공개' : '비공개'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 가입 형태 설정 */}
          <Card>
            <CardHeader className="flex items-center justify-between px-4 py-3">
              <CardTitle>가입 설정</CardTitle>
              <Button onClick={handleSaveCommunityBasics} size="sm">저장</Button>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">가입 형태</Label>
                  <p className="text-xs text-slate-600">자유 가입 또는 승인 기반을 선택합니다.</p>
                </div>
                <div className="min-w-[140px]">
                  <Select value={joinPolicy} onValueChange={(value: 'free' | 'approval') => setJoinPolicy(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">자유 가입</SelectItem>
                      <SelectItem value="approval">승인 필요</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 커뮤니티 삭제 */}
          <Card>
            <CardHeader className="flex items-center justify-between px-4 py-3">
              <CardTitle className="text-red-600">커뮤니티 삭제</CardTitle>
              <Button variant="destructive" onClick={() => { setDeleteCommunityText(""); setDeleteCommunityOpen(true) }}>삭제하기</Button>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-sm text-slate-600">
                이 작업은 되돌릴 수 없습니다. 커뮤니티를 영구적으로 삭제하려면 아래 버튼을 눌러 확인 모달에서 <span className="font-semibold text-slate-900">삭제</span> 라고 입력해주세요.
              </p>
            </CardContent>
          </Card>

          {/* 커뮤니티 삭제 확인 모달 */}
          <Dialog open={deleteCommunityOpen} onOpenChange={setDeleteCommunityOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-red-600">커뮤니티를 삭제하시겠어요?</DialogTitle>
                <DialogDescription>
                  이 동작은 영구적입니다. 계속하려면 아래 입력칸에 <span className="font-semibold">삭제</span> 를 입력한 뒤 삭제를 눌러주세요.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label className="text-xs text-slate-600">확인용 텍스트</Label>
                <Input value={deleteCommunityText} onChange={(e) => setDeleteCommunityText(e.target.value)} placeholder="삭제" />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteCommunityOpen(false)}>취소</Button>
                <Button
                  variant="destructive"
                  disabled={deleteCommunityText !== '삭제'}
                  onClick={async () => {
                    try {
                      await deleteCommunity(communityId)
                      setDeleteCommunityOpen(false)
                      toast.success('커뮤니티가 삭제되었습니다.')
                      router.push('/explore')
                    } catch (err: any) {
                      toast.error(err?.message || '삭제 중 오류가 발생했습니다.')
                    }
                  }}
                >
                  삭제
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </section>
  )
}


