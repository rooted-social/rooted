import { assertSuperAdminOrNotFound } from '@/lib/auth/admin'
import { createServerClient } from '@/lib/supabase-server'
import Link from 'next/link'
import CommunityActions from '@/components/admin/communities/CommunityActions'

export const dynamic = 'force-dynamic'

export default async function AdminCommunitiesPage({ searchParams }: { searchParams?: { q?: string; status?: string; page?: string } }) {
  await assertSuperAdminOrNotFound()
  const q = searchParams?.q?.trim() || ''
  const status = searchParams?.status || 'all'
  const page = Number(searchParams?.page || '1')
  const pageSize = 20
  const offset = (page - 1) * pageSize

  const supabase = createServerClient()
  let query = supabase.from('communities').select('id, name, slug, owner_id, is_disabled, member_count, created_at', { count: 'exact' })
  if (q) query = query.ilike('name', `%${q}%`)
  if (status === 'active') query = query.eq('is_disabled', false)
  if (status === 'disabled') query = query.eq('is_disabled', true)
  const { data: rows, count } = await query.order('created_at', { ascending: false }).range(offset, offset + pageSize - 1)

  // 소유자 이름 조회
  const ownerIds = Array.from(new Set((rows || []).map((r: any) => r.owner_id).filter(Boolean)))
  let ownerMap: Record<string, { full_name?: string; username?: string }> = {}
  if (ownerIds.length > 0) {
    const { data: owners } = await supabase
      .from('profiles')
      .select('id, full_name, username')
      .in('id', ownerIds as any)
    ownerMap = Object.fromEntries((owners || []).map((o: any) => [o.id, { full_name: o.full_name, username: o.username }]))
  }

  return (
    <div>
      <form className="mb-4 flex gap-2">
        <input name="q" defaultValue={q} placeholder="Search name" className="w-64 rounded border px-3 py-2 text-sm" />
        <select name="status" defaultValue={status} className="rounded border px-2 py-2 text-sm">
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
        </select>
        <button className="rounded bg-black px-3 py-2 text-sm text-white" type="submit">Filter</button>
      </form>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="px-2 py-2">Name</th>
              <th className="px-2 py-2">Owner</th>
              <th className="px-2 py-2">Members</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">Created</th>
              <th className="px-2 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(rows || []).map((c: any) => (
              <tr key={c.id} className="border-b">
                <td className="px-2 py-2">{c.name}{c.slug ? ` (/${c.slug})` : ''}</td>
                <td className="px-2 py-2">{(() => { const o = ownerMap[c.owner_id]; return o ? `${o.full_name || o.username || '-' } (${c.owner_id})` : c.owner_id })()}</td>
                <td className="px-2 py-2">{c.member_count ?? '-'}</td>
                <td className="px-2 py-2">
                  {c.is_disabled ? <span className="rounded bg-red-100 px-2 py-1 text-xs text-red-700">Disabled</span> : <span className="rounded bg-green-100 px-2 py-1 text-xs text-green-700">Active</span>}
                </td>
                <td className="px-2 py-2">{new Date(c.created_at).toLocaleDateString()}</td>
                <td className="px-2 py-2"><CommunityActions community={c} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <div>Total: {count || 0}</div>
        <div className="flex gap-2">
          {page > 1 && (
            <Link className="rounded border px-2 py-1" href={`/admin/communities?${new URLSearchParams({ q, status, page: String(page - 1) }).toString()}`}>Prev</Link>
          )}
          {(count || 0) > offset + pageSize && (
            <Link className="rounded border px-2 py-1" href={`/admin/communities?${new URLSearchParams({ q, status, page: String(page + 1) }).toString()}`}>Next</Link>
          )}
        </div>
      </div>
    </div>
  )
}


