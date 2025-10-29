import { assertSuperAdminOrNotFound } from '@/lib/auth/admin'
import { createServerClient } from '@/lib/supabase-server'
import Link from 'next/link'
import CommunityActions from '@/components/admin/communities/CommunityActions'

export const dynamic = 'force-dynamic'

export default async function AdminCommunitiesPage({ searchParams }: { searchParams?: Promise<{ q?: string; status?: string; page?: string }> }) {
  await assertSuperAdminOrNotFound()
  const sp = (await searchParams) || {}
  const q = sp.q?.trim() || ''
  const status = sp.status || 'all'
  const page = Number(sp.page || '1')
  const pageSize = 20
  const offset = (page - 1) * pageSize

  const supabase = await createServerClient()
  let query = supabase.from('communities').select('id, name, slug, owner_id, is_disabled, is_public, member_count, created_at, plan, member_limit, page_limit', { count: 'exact' })
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

  // 실제 멤버 수(오너/보류 제외)를 커뮤니티별로 계산 (페이지당 최대 20개라 병렬 카운트 수행)
  const communityIds = (rows || []).map((r: any) => r.id)
  let memberCountMap: Record<string, number> = {}
  let pageCountMap: Record<string, number> = {}
  if (communityIds.length > 0) {
    const [memberResults, pageResults] = await Promise.all([
      Promise.all(
        communityIds.map(async (id) => {
          const { count: cnt } = await supabase
            .from('community_members')
            .select('*', { count: 'exact', head: true })
            .eq('community_id', id)
            .or('role.is.null,role.neq.pending')
          return [id, cnt || 0] as const
        })
      ),
      Promise.all(
        communityIds.map(async (id) => {
          const { count: cnt } = await supabase
            .from('community_pages')
            .select('*', { count: 'exact', head: true })
            .eq('community_id', id)
          return [id, cnt || 0] as const
        })
      ),
    ])
    memberCountMap = Object.fromEntries(memberResults)
    pageCountMap = Object.fromEntries(pageResults)
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
              <th className="px-2 py-2">Plan</th>
              <th className="px-2 py-2">Pages</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">Public</th>
              <th className="px-2 py-2">Created</th>
              <th className="px-2 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(rows || []).map((c: any) => (
              <tr key={c.id} className="border-b">
                <td className="px-2 py-2">{c.name}{c.slug ? ` (/${c.slug})` : ''}</td>
                <td className="px-2 py-2">{(() => { const o = ownerMap[c.owner_id]; return o ? `${o.full_name || o.username || '-' } (${c.owner_id})` : c.owner_id })()}</td>
                <td className="px-2 py-2">{memberCountMap[c.id] ?? c.member_count ?? '-'}</td>
                <td className="px-2 py-2">{c.plan || 'starter'}</td>
                <td className="px-2 py-2">{(pageCountMap[c.id] ?? 0)} / {(c.page_limit ?? '∞')}</td>
                <td className="px-2 py-2">
                  {c.is_disabled ? <span className="rounded bg-red-100 px-2 py-1 text-xs text-red-700">Disabled</span> : <span className="rounded bg-green-100 px-2 py-1 text-xs text-green-700">Active</span>}
                </td>
                <td className="px-2 py-2">
                  {c.is_public ? (
                    <span className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-700">Public</span>
                  ) : (
                    <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">Private</span>
                  )}
                </td>
                <td className="px-2 py-2">{new Date(c.created_at).toLocaleDateString()}</td>
                <td className="px-2 py-2">
                  <div className="flex items-center gap-2">
                    <CommunityActions community={c} />
                    {c.slug ? (
                      <Link
                        href={`/${c.slug}/dashboard`}
                        className="rounded border px-2 py-1 hover:bg-slate-50 cursor-pointer"
                        title="커뮤니티로 이동"
                      >
                        이동
                      </Link>
                    ) : null}
                  </div>
                </td>
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


