import { assertSuperAdminOrNotFound } from '@/lib/auth/admin'
import Link from 'next/link'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await assertSuperAdminOrNotFound()
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">슈퍼 관리자 페이지</h1>
        <span className="rounded bg-black px-2 py-1 text-xs font-medium text-white">super_admin</span>
      </div>
      <nav className="mb-6 flex gap-4 border-b pb-3 text-sm">
        <Link className="hover:underline" href="/admin">Overview</Link>
        <Link className="hover:underline" href="/admin/users">Users</Link>
        <Link className="hover:underline" href="/admin/communities">Communities</Link>
        <Link className="hover:underline" href="/admin/contents">Contents</Link>
      </nav>
      {children}
    </div>
  )
}


