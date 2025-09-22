'use client'

import { useRouter } from 'next/navigation'

export default function AddQuick({ id, name, slug }: { id: string; name: string; slug: string }) {
  const router = useRouter()
  const onClick = async () => {
    const res = await fetch('/api/admin/featured', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ communityId: id }) })
    if (res.ok) router.refresh()
  }
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm">{name} <span className="text-slate-500">/{slug}</span></span>
      <button className="rounded border px-2 py-1 text-sm" onClick={onClick}>추가</button>
    </div>
  )
}


