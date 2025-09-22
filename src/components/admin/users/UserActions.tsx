'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function UserActions({ user }: { user: any }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [until, setUntil] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const suspend = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${user.id}/suspend`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reason, until: until || null }),
      })
      if (!res.ok) throw new Error('suspend failed')
      toast.success('정지 완료')
      setOpen(false)
      router.refresh()
    } catch (e: any) {
      toast.error('정지 처리에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const unsuspend = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${user.id}/unsuspend`, { method: 'PATCH' })
      if (!res.ok) throw new Error('unsuspend failed')
      toast.success('해제 완료')
      router.refresh()
    } catch {
      toast.error('해제 처리에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex gap-2">
      {user.is_suspended ? (
        <Button variant="outline" size="sm" onClick={unsuspend} disabled={loading}>해제</Button>
      ) : (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive" size="sm">정지</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>사용자 정지</DialogTitle>
              <DialogDescription>사유와 선택적으로 해제예정일을 입력하세요.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Input placeholder="사유" value={reason} onChange={e => setReason(e.target.value)} />
              <Input type="datetime-local" value={until} onChange={e => setUntil(e.target.value)} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>취소</Button>
              <Button onClick={suspend} disabled={loading || !reason}>정지</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}


