'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Force dynamic rendering - this page performs client-side redirect
export const dynamic = 'force-dynamic'

export default function DailyPage() {
  const router = useRouter()
  
  // Redirect to model1 by default
  useEffect(() => {
    router.replace('/daily/model1')
  }, [router])
  
  // Show loading while redirecting
  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    </main>
  )
}
