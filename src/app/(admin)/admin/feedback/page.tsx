import { assertSuperAdminOrNotFound } from '@/lib/auth/admin'
import { createServerClient } from '@/lib/supabase-server'
import FeedbackRow from '@/components/admin/feedback/FeedbackRow'

export const dynamic = 'force-dynamic'

export default async function AdminFeedbackPage({ searchParams }: { searchParams?: Promise<{ page?: string; q?: string; category?: string }> }) {
  await assertSuperAdminOrNotFound()
  const sp = (await searchParams) || {}
  const page = Number(sp.page || '1')
  const q = (sp.q || '').trim()
  const category = (sp.category || '').trim()
  const pageSize = 30
  const offset = (page - 1) * pageSize

  const supabase = await createServerClient()
  let query = supabase.from('feedbacks').select('*', { count: 'exact' })
  if (q) query = query.ilike('title', `%${q}%`)
  if (category) query = query.eq('category', category)
  const { data: rows, count } = await query.order('created_at', { ascending: false }).range(offset, offset + pageSize - 1)

  // 사용자 이름 조회 (profiles.full_name)
  const userIds = Array.from(new Set((rows || []).map((r: any) => r.user_id).filter(Boolean)))
  let profileMap: Record<string, { full_name?: string; username?: string }> = {}
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, username')
      .in('id', userIds as any)
    profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.id, { full_name: p.full_name, username: p.username }]))
  }

  return (
    <div>
      <form className="mb-4 flex flex-wrap items-center gap-2">
        <input name="q" defaultValue={q} placeholder="Search title" className="w-64 rounded border px-3 py-2 text-sm" />
        <select name="category" defaultValue={category} className="rounded border px-2 py-2 text-sm">
          <option value="">All</option>
          <option value="ops">운영 관련</option>
          <option value="feature">기능 관련</option>
          <option value="billing">정산 및 비용 관련</option>
          <option value="general">일반 문의</option>
        </select>
        <button className="rounded bg-black px-3 py-2 text-sm text-white" type="submit">Filter</button>
      </form>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="px-2 py-2">Name (email)</th>
              <th className="px-2 py-2">Title</th>
              <th className="px-2 py-2">Category</th>
              <th className="px-2 py-2">Content</th>
              <th className="px-2 py-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {(rows || []).map((f: any) => {
              const prof = profileMap[f.user_id]
              const name = (prof?.full_name || prof?.username || (f.user_email?.split('@')[0])) || '-'
              return <FeedbackRow key={f.id} f={f} profileName={name} />
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <div>Total: {count || 0}</div>
        <div className="flex gap-2">
          {page > 1 && (
            <a className="rounded border px-2 py-1" href={`/admin/feedback?${new URLSearchParams({ q, category, page: String(page - 1) }).toString()}`}>Prev</a>
          )}
          {(count || 0) > offset + pageSize && (
            <a className="rounded border px-2 py-1" href={`/admin/feedback?${new URLSearchParams({ q, category, page: String(page + 1) }).toString()}`}>Next</a>
          )}
        </div>
      </div>
    </div>
  )
}


