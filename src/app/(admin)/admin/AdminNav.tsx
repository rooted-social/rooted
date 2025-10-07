'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function AdminNav() {
  const pathname = usePathname()
  const items = [
    { href: '/admin', label: 'Overview' },
    { href: '/admin/users', label: 'Users' },
    { href: '/admin/communities', label: 'Communities' },
    { href: '/admin/contents', label: 'Contents' },
    { href: '/admin/feedback', label: 'Feedback' },
  ]
  return (
    <nav className="mb-6 flex flex-wrap items-center justify-center gap-2 border-b pb-3 text-sm">
      {items.map(it => {
        const active = pathname === it.href
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`rounded px-3 py-1.5 transition-colors ${active ? 'bg-black text-white' : 'hover:underline'}`}
            aria-current={active ? 'page' : undefined}
          >
            {it.label}
          </Link>
        )
      })}
    </nav>
  )
}


