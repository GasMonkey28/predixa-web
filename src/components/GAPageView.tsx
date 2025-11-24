'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

declare global {
  interface Window {
    dataLayer: unknown[]
    gtag: (
      command: 'config' | 'js' | 'event',
      targetId: string | Date,
      config?: {
        page_path?: string
        [key: string]: unknown
      }
    ) => void
  }
}

export function GAPageView() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const gaId = process.env.NEXT_PUBLIC_GA_ID

  useEffect(() => {
    if (!gaId || typeof window === 'undefined' || !window.gtag) {
      return
    }

    // Build full URL with query string if present
    const queryString = searchParams.toString()
    const fullPath = queryString ? `${pathname}?${queryString}` : pathname

    // Track pageview
    window.gtag('config', gaId, {
      page_path: fullPath,
    })
  }, [pathname, searchParams, gaId])

  return null
}

