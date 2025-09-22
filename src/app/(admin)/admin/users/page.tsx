import { assertSuperAdminOrNotFound } from '@/lib/auth/admin'
import { createServerClient } from '@/lib/supabase-server'
import Link from 'next/link'
import UserActions from '@/components/admin/users/UserActions'

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage({ searchParams }: { searchParams?: { q?: string; status?: string; page?: string } }) {
  await assertSuperAdminOrNotFound()
  const q = searchParams?.q?.trim() || ''
  const status = searchParams?.status || 'all'
  const page = Number(searchParams?.page || '1')
  const pageSize = 20
  const offset = (page - 1) * pageSize

  const supabase = createServerClient()
  let query = supabase.from('profiles').select('id, username, full_name, email, is_suspended, suspended_until, created_at', { count: 'exact' })
  if (q) query = query.or(`email.ilike.%${q}%,username.ilike.%${q}%,full_name.ilike.%${q}%`)
  if (status === 'active') query = query.eq('is_suspended', false)
  if (status === 'suspended') query = query.eq('is_suspended', true)
  const { data: rows, count } = await query.order('created_at', { ascending: false }).range(offset, offset + pageSize - 1)

  return (
    <div>
      <form className="mb-4 flex gap-2">
        <input name="q" defaultValue={q} placeholder="Search email/username/name" className="w-64 rounded border px-3 py-2 text-sm" />
        <select name="status" defaultValue={status} className="rounded border px-2 py-2 text-sm">
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
        <button className="rounded bg-black px-3 py-2 text-sm text-white" type="submit">Filter</button>
      </form>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="px-2 py-2">Email</th>
              <th className="px-2 py-2">Username / Name</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">Suspended Until</th>
              <th className="px-2 py-2">Joined</th>
              <th className="px-2 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(rows || []).map((u: any) => (
              <tr key={u.id} className="border-b">
                <td className="px-2 py-2">{u.email || '-'}</td>
                <td className="px-2 py-2">{u.username || '-'}{u.full_name ? ` (${u.full_name})` : ''}</td>
                <td className="px-2 py-2">
                  {u.is_suspended ? <span className="rounded bg-red-100 px-2 py-1 text-xs text-red-700">Suspended</span> : <span className="rounded bg-green-100 px-2 py-1 text-xs text-green-700">Active</span>}
                </td>
                <td className="px-2 py-2">{u.suspended_until ? new Date(u.suspended_until).toLocaleString() : '-'}</td>
                <td className="px-2 py-2">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="px-2 py-2"><UserActions user={u} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <div>Total: {count || 0}</div>
        <div className="flex gap-2">
          {page > 1 && (
            <Link className="rounded border px-2 py-1" href={`/admin/users?${new URLSearchParams({ q, status, page: String(page - 1) }).toString()}`}>Prev</Link>
          )}
          {(count || 0) > offset + pageSize && (
            <Link className="rounded border px-2 py-1" href={`/admin/users?${new URLSearchParams({ q, status, page: String(page + 1) }).toString()}`}>Next</Link>
          )}
        </div>
      </div>
    </div>
  )
}


