import { fetchExploreCommunities } from '@/lib/dashboard'
import ClientExplorePage from '@/app/explore/ClientExplorePage'

export const revalidate = 0

export default async function ExplorePage() {
  const initial = await fetchExploreCommunities({})
  return <ClientExplorePage initial={initial} />
}


