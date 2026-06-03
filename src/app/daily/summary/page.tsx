'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export const dynamic = 'force-dynamic'

/** Legacy URL — market insight lives at /summary */
export default function DailySummaryRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/summary')
  }, [router])
  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600" />
      </div>
    </main>
  )
}
