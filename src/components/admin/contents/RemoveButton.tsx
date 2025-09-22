'use client'

import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function RemoveButton({ id }: { id: string }) {
  const router = useRouter()
  const remove = async () => {
    try {
      const res = await fetch(`/api/admin/featured?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('failed')
      toast.success('삭제되었습니다')
      router.refresh()
    } catch {
      toast.error('삭제에 실패했습니다')
    }
  }
  return <Button variant="outline" size="sm" onClick={remove}>삭제</Button>
}


