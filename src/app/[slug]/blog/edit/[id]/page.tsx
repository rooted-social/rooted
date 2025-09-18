"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getBlogPostById, updateBlogPost } from "@/lib/blog"
import { Button as UIButton } from "@/components/ui/button"
import { Underline as UnderlineIcon, Droplet as DropletIcon, Image as ImageIcon } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { BRAND_COLOR_PALETTE, normalizeHex } from "@/utils/color"

export default function EditBlogPostPage() {
  const router = useRouter()
  const params = useParams<{ slug: string; id: string }>()
  const search = useSearchParams()
  const slug = params.slug
  const id = params.id
  const pageId = search?.get('pageId') || ''

  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [saving, setSaving] = useState(false)
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)

  useEffect(() => { (async () => {
    const p = await getBlogPostById(String(id))
    if (p) { setTitle(p.title || ""); setContent(p.content || ""); setThumbnailUrl((p as any)?.thumbnail_url || null) }
  })() }, [id])

  const onSubmit = async () => {
    setSaving(true)
    try {
      await updateBlogPost(String(id), { title: title.trim(), content, thumbnail_url: thumbnailUrl || null })
      router.push(`/${slug}/blog/${id}?pageId=${pageId}`)
    } catch (e: any) {
      console.error(e)
      alert(e?.message || '저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="text-sm text-slate-500">글 수정</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="cursor-pointer" onClick={() => router.back()}>취소</Button>
            <Button className="cursor-pointer" onClick={onSubmit} disabled={saving}>{saving ? '저장 중...' : '저장'}</Button>
          </div>
        </div>
        <div className="grid gap-6 grid-cols-1 md:grid-cols-4">
          <div className="md:col-span-3 space-y-4">
            <Input placeholder="제목을 입력하세요" value={title} onChange={(e)=>setTitle(e.target.value)} />
            <RichEditor value={content} onChange={setContent} />
          </div>
          <div className="md:col-span-1 space-y-3">
            <div className="text-sm font-medium text-slate-700">썸네일</div>
            <div className="aspect-[16/10] rounded-xl border bg-slate-50 overflow-hidden flex items-center justify-center">
              {thumbnailUrl ? (<img src={thumbnailUrl} alt="thumb" className="w-full h-full object-cover" />) : (<span className="text-xs text-slate-400">썸네일 미리보기</span>)}
            </div>
            <input id="thumb-input" type="file" accept="image/*" className="hidden" onChange={async (e)=>{ const f=e.target.files?.[0]; if(!f) return; const form = new FormData(); form.append('file', f); const res = await fetch('/api/blog-thumbnails', { method:'POST', body: form }); const body = await res.json(); if(res.ok) setThumbnailUrl(body.url as string) }} />
            <UIButton variant="outline" className="w-full cursor-pointer" onClick={()=>document.getElementById('thumb-input')?.click()}>썸네일 업로드</UIButton>
          </div>
        </div>
      </div>
    </div>
  )
}

function ToolbarButton({ children, onClick, title }: { children: ReactNode; onClick: () => void; title?: string }) {
  return <button type="button" title={title} onClick={onClick} className="px-2 py-1 text-sm rounded hover:bg-slate-100 cursor-pointer">{children}</button>
}

function RichEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLDivElement | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [colorModalOpen, setColorModalOpen] = useState(false)
  const [tempColor, setTempColor] = useState<string>("#111827")
  const [currentColor, setCurrentColor] = useState<string>("#111827")
  const savedRange = useRef<Range | null>(null)
  const captureSelection = () => {
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) {
      savedRange.current = sel.getRangeAt(0).cloneRange()
    }
  }
  const restoreSelection = () => {
    const sel = window.getSelection()
    if (sel && savedRange.current) {
      sel.removeAllRanges()
      sel.addRange(savedRange.current)
    }
  }
  const exec = (cmd: string, val?: string) => { document.execCommand(cmd, false, val); ref.current?.focus() }
  const sync = () => { onChange(ref.current?.innerHTML || '') }
  useEffect(()=>{ if (ref.current && value && !ref.current.innerHTML) { ref.current.innerHTML = value } }, [value])
  const insertImage = async (file: File) => {
    const form = new FormData(); form.append('file', file)
    const res = await fetch('/api/blog-images', { method: 'POST', body: form })
    const body = await res.json(); if (res.ok && body?.urls?.md) {
      const src = body.urls.md
      const srcset = body.srcset || ''
      const sizes = body.sizes || '(max-width: 640px) 100vw, (max-width: 1024px) 800px, 1200px'
      const html = `<img src=\"${src}\" srcset=\"${srcset}\" sizes=\"${sizes}\" loading=\"lazy\" decoding=\"async\" style=\"max-width:100%;height:auto\" />`
      document.execCommand('insertHTML', false, html)
      sync()
    }
  }
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1 border rounded-md p-1">
        <select className="h-8 border rounded px-2 text-sm" onChange={(e)=>exec('fontSize', String(e.target.value))} defaultValue="4">
          {['1','2','3','4','5','6','7'].map(s => <option key={s} value={s}>{`${parseInt(s)*2+8}pt`}</option>)}
        </select>
        <ToolbarButton title="굵게" onClick={() => exec('bold')}>B</ToolbarButton>
        <ToolbarButton title="밑줄" onClick={() => exec('underline')}><UnderlineIcon className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton title="텍스트 색상" onClick={() => { captureSelection(); setTempColor(currentColor); setColorModalOpen(true) }}>
          <DropletIcon className="w-4 h-4" style={{ color: currentColor }} />
        </ToolbarButton>
        <ToolbarButton title="이미지" onClick={() => fileRef.current?.click()}>
          <ImageIcon className="w-4 h-4" />
        </ToolbarButton>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e)=>{ const f=e.target.files?.[0]; if (f) insertImage(f); if (fileRef.current) fileRef.current.value='' }} />
      </div>
      <div ref={ref} contentEditable suppressContentEditableWarning className="min-h-[75vh] w-full border rounded-xl p-6 focus:outline-none bg-white shadow-sm leading-7 text-[16px]" onInput={sync} dir="ltr" style={{ direction: 'ltr', caretColor: '#111827', unicodeBidi: 'plaintext' }} />

      <Dialog open={colorModalOpen} onOpenChange={(o)=>{ setColorModalOpen(o) }}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>텍스트 색상 선택</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-6 sm:grid-cols-10 gap-2">
              {BRAND_COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  title={c}
                  type="button"
                  onClick={() => { restoreSelection(); exec('foreColor', c); setCurrentColor(c); sync(); setColorModalOpen(false) }}
                  className="h-9 rounded-md border cursor-pointer transition-transform active:scale-95 hover:scale-[1.02]"
                  style={{ backgroundColor: c, borderColor: 'rgba(0,0,0,0.08)' }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Input
                value={tempColor}
                onChange={(e)=> setTempColor(e.target.value)}
                placeholder="#111827"
                className="h-9"
              />
              <div
                className="h-9 w-9 rounded-md border"
                style={{ backgroundColor: normalizeHex(tempColor), borderColor: 'rgba(0,0,0,0.08)' }}
                aria-hidden
              />
              <Button onClick={()=>{ const c = normalizeHex(tempColor); restoreSelection(); exec('foreColor', c); setCurrentColor(c); sync(); setColorModalOpen(false) }}>적용</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}


