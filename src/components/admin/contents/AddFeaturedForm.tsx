'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function AddFeaturedForm() {
  const [slug, setSlug] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!slug.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/admin/featured', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ communitySlug: slug.trim() }) })
      if (!res.ok) throw new Error('failed')
      toast.success('추가되었습니다')
      setSlug('')
      router.refresh()
    } catch {
      toast.error('추가에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <Input name="slug" placeholder="커뮤니티 슬러그 입력 (예: my-community)" className="w-80" value={slug} onChange={e => setSlug(e.target.value)} />
      <Button type="submit" disabled={loading || !slug.trim()}>추가</Button>
    </form>
  )
}


