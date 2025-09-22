import { assertSuperAdminOrNotFound } from '@/lib/auth/admin'
import { createServerClient } from '@/lib/supabase-server'
import { Card } from '@/components/ui/card'
import AddFeaturedForm from '@/components/admin/contents/AddFeaturedForm'
import RemoveButton from '@/components/admin/contents/RemoveButton'

export const dynamic = 'force-dynamic'

export default async function AdminContentsPage() {
  await assertSuperAdminOrNotFound()
  const supabase = createServerClient()
  const { data: items } = await supabase
    .from('featured_communities')
    .select('id, position, community_id')
    .order('position', { ascending: true, nullsFirst: true })
    .order('created_at', { ascending: true })

  const pageSize = 50
  const { data: applicants } = await supabase
    .from('beta_applicants')
    .select('name, email', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(pageSize)

  const ids = Array.from(new Set((items || []).map((i: any) => i.community_id)))
  let meta: Record<string, { name: string; slug: string }> = {}
  if (ids.length > 0) {
    const { data } = await supabase.from('communities').select('id, name, slug').in('id', ids as any)
    meta = Object.fromEntries((data || []).map((c: any) => [c.id, { name: c.name, slug: c.slug }]))
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">지금 인기 있는 루트 관리</h2>
      <AddFeaturedForm />

      <div className="mt-6 grid gap-3">
        {(items || []).map((it: any) => (
          <Card key={it.id} className="p-3 flex items-center justify-between">
            <div className="text-sm">
              <div className="font-medium">{meta[it.community_id]?.name || it.community_id}</div>
              <div className="text-slate-500">{meta[it.community_id]?.slug ? `/${meta[it.community_id]?.slug}` : ''}</div>
            </div>
            <RemoveButton id={it.id} />
          </Card>
        ))}
      </div>

      <div className="mt-10">
        <h2 className="text-xl font-semibold mb-3">베타 테스터 신청 리스트</h2>
        <div className="overflow-x-auto rounded border">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left">
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Email</th>
              </tr>
            </thead>
            <tbody>
              {(applicants || []).map((a: any, idx: number) => (
                <tr key={`${a.email}-${idx}`} className="border-b">
                  <td className="px-3 py-2">{a.name || '-'}</td>
                  <td className="px-3 py-2">{a.email || '-'}</td>
                </tr>
              ))}
              {(!applicants || applicants.length === 0) && (
                <tr>
                  <td className="px-3 py-6 text-center text-slate-500" colSpan={2}>신청 내역이 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
 
