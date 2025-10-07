'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function CommunityActions({ community }: { community: any }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [toggling, setToggling] = useState(false)
  const router = useRouter()

  const disable = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/communities/${community.id}/disable`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      if (!res.ok) throw new Error('disable failed')
      toast.success('비활성화 완료')
      setOpen(false)
      router.refresh()
    } catch {
      toast.error('비활성화 처리에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const enable = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/communities/${community.id}/enable`, { method: 'PATCH' })
      if (!res.ok) throw new Error('enable failed')
      toast.success('해제 완료')
      router.refresh()
    } catch {
      toast.error('해제 처리에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const togglePublic = async () => {
    setToggling(true)
    try {
      const res = await fetch(`/api/admin/communities/${community.id}/visibility`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ is_public: !community.is_public }),
      })
      if (!res.ok) throw new Error('visibility failed')
      toast.success(!community.is_public ? '공개로 변경되었습니다' : '비공개로 변경되었습니다')
      router.refresh()
    } catch {
      toast.error('공개 설정 변경에 실패했습니다')
    } finally {
      setToggling(false)
    }
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={togglePublic} disabled={toggling}>
        {community.is_public ? '비공개' : '공개'}
      </Button>
      {community.is_disabled ? (
        <Button variant="outline" size="sm" onClick={enable} disabled={loading}>해제</Button>
      ) : (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive" size="sm">비활성화</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>커뮤니티 비활성화</DialogTitle>
              <DialogDescription>사유를 입력하세요.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Input placeholder="사유" value={reason} onChange={e => setReason(e.target.value)} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>취소</Button>
              <Button onClick={disable} disabled={loading || !reason}>비활성화</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}


