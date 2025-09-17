"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { getCommunity } from "@/lib/communities"
import { createBlogPost } from "@/lib/blog"
import { Underline as UnderlineIcon } from "lucide-react"

export default function NewBlogPostPage() {
  const router = useRouter()
  const params = useParams<{ slug: string }>()
  const search = useSearchParams()
  const slug = params.slug
  const pageId = search?.get('pageId') || ''
  const [community, setCommunity] = useState<any>(null)

  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    ;(async () => {
      const c = await getCommunity(String(slug))
      setCommunity(c)
    })()
  }, [slug])

  const onUploadThumb = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    // 블로그 이미지 업로드 (webp)
    const res = await fetch('/api/blog-images', { method: 'POST', body: formData })
    const body = await res.json()
    if (!res.ok) throw new Error(body?.error || 'upload failed')
    setThumbnailUrl(body.url)
  }

  const onSubmit = async () => {
    if (!pageId) return
    if (!title.trim() || !content.trim()) return
    setSaving(true)
    try {
      const id = await createBlogPost({ page_id: pageId, title: title.trim(), content, thumbnail_url: thumbnailUrl || null })
      router.push(`/${slug}/blog/${id}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-white md:pt-0 pt-15 pb-24">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="text-sm text-slate-500">새 글 작성</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="cursor-pointer" onClick={() => router.back()}>취소</Button>
            <Button className="cursor-pointer" onClick={onSubmit} disabled={saving}>{saving ? '저장 중...' : '발행'}</Button>
          </div>
        </div>

        <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
          <div className="md:col-span-2 space-y-4">
            <Input placeholder="제목을 입력하세요" value={title} onChange={(e) => setTitle(e.target.value)} />
            <RichEditor value={content} onChange={setContent} />
          </div>
          <div className="md:col-span-1 space-y-3">
            <div className="text-sm font-medium text-slate-700">썸네일</div>
            <div className="aspect-[4/3] rounded-xl border bg-slate-50 overflow-hidden flex items-center justify-center">
              {thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumbnailUrl} alt="thumb" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs text-slate-400">썸네일 미리보기</span>
              )}
            </div>
            <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadThumb(f); if (fileInput.current) fileInput.current.value = '' }} />
            <Button variant="outline" onClick={() => fileInput.current?.click()} className="cursor-pointer w-full">썸네일 업로드</Button>
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
  const exec = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val)
    // 커서를 내용 끝으로 이동
    const el = ref.current
    if (el) {
      const range = document.createRange()
      range.selectNodeContents(el)
      range.collapse(false)
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(range)
    }
    el?.focus()
  }
  const sync = () => { onChange(ref.current?.innerHTML || '') }
  // 초기 콘텐츠만 1회 주입하고, 그 이후에는 제어하지 않음(커서 점프 방지)
  useEffect(() => { if (ref.current && value && !ref.current.innerHTML) { ref.current.innerHTML = value } }, [value])
  const insertImage = async (file: File) => {
    const form = new FormData(); form.append('file', file)
    const res = await fetch('/api/blog-images', { method: 'POST', body: form })
    const body = await res.json(); if (res.ok && body.url) {
      const html = `<img src="${body.url}" style="max-width:100%;height:auto" />`
      document.execCommand('insertHTML', false, html)
      sync()
    }
  }
  const emojis = ['😀','😁','😂','🤣','😊','😍','😘','😎','🤩','🤔','🙌','👏','👍','🔥','✨','🎯','💡','🚀','📚','📝']
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1 border rounded-md p-1">
        <select className="h-8 border rounded px-2 text-sm" onChange={(e)=>exec('fontSize', String(e.target.value))} defaultValue="4">
          {['1','2','3','4','5','6','7'].map(s => <option key={s} value={s}>{`${parseInt(s)*2+8}pt`}</option>)}
        </select>
        <ToolbarButton title="굵게" onClick={() => exec('bold')}>B</ToolbarButton>
        <ToolbarButton title="밑줄" onClick={() => exec('underline')}><UnderlineIcon className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton title="텍스트 색상" onClick={() => exec('foreColor', '#111827')}>A</ToolbarButton>
        <ToolbarButton title="이미지" onClick={() => fileRef.current?.click()}>🖼️</ToolbarButton>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e)=>{ const f=e.target.files?.[0]; if (f) insertImage(f); if (fileRef.current) fileRef.current.value='' }} />
        <details className="ml-auto">
          <summary className="px-2 py-1 text-sm rounded hover:bg-slate-100 cursor-pointer select-none">이모지</summary>
          <div className="mt-1 bg-white border rounded p-1 flex flex-wrap gap-1 max-w-sm">
            {emojis.map(e => <button key={e} type="button" className="px-1 cursor-pointer" onClick={()=>{ exec('insertText', e); sync() }}>{e}</button>)}
          </div>
        </details>
      </div>
      <div ref={ref} contentEditable suppressContentEditableWarning className="min-h-[75vh] w-full border rounded-xl p-6 focus:outline-none bg-white shadow-sm leading-7 text-[16px]" onInput={sync} dir="ltr" style={{ direction: 'ltr', caretColor: '#111827', unicodeBidi: 'plaintext' }} />
    </div>
  )
}


