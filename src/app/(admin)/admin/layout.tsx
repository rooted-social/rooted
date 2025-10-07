import { assertSuperAdminOrNotFound } from '@/lib/auth/admin'
import Link from 'next/link'
import AdminNav from './AdminNav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await assertSuperAdminOrNotFound()
  return (
    <div className="mx-auto max-w-8xl px-4 py-6">
      <div className="mb-4 flex flex-col items-center text-center gap-2">
        <h1 className="text-2xl font-semibold">슈퍼 관리자 페이지</h1>
        <span className="rounded bg-black px-2 py-1 text-xs font-medium text-white">super_admin</span>
      </div>
      <AdminNav />
      {children}
    </div>
  )
}


