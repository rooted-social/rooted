import { fetchExploreCommunities } from '@/lib/dashboard'
import ClientExplorePage from '@/app/explore/ClientExplorePage'

// 둘러보기 목록은 60초 ISR로 서버 캐시를 활용
export const revalidate = 60

export default async function ExplorePage() {
  const initial = await fetchExploreCommunities({})
  return <ClientExplorePage initial={initial} />
}


