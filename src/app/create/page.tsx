import { Suspense } from 'react'
import CreateClient from './CreateClient'

export const dynamic = 'force-dynamic'

export default function CreatePage() {
  return (
    <Suspense>
      <CreateClient />
    </Suspense>
  )
}
