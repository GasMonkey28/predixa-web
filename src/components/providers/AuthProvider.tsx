'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import { configureAmplify } from '@/lib/amplify'
import { fetchAuthSession } from 'aws-amplify/auth'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const checkAuth = useAuthStore((state) => state.checkAuth)

  useEffect(() => {
    configureAmplify()
    
    // Handle OAuth callback
    const handleOAuthCallback = async () => {
      try {
        const { tokens } = await fetchAuthSession()
        if (tokens) {
          // User is authenticated via OAuth
          await checkAuth()
          // Small delay to ensure state is updated
          setTimeout(() => {
            // Clean up URL parameters
            window.history.replaceState({}, document.title, window.location.pathname)
            // Redirect to daily page after successful OAuth sign-in
            router.push('/daily')
          }, 100)
        }
      } catch (error) {
        console.error('OAuth callback error:', error)
      }
    }
    
    // Check if we're in an OAuth callback
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.has('code') || urlParams.has('state')) {
      handleOAuthCallback()
    } else {
      checkAuth()
    }
  }, [checkAuth, router])

  return <>{children}</>
}



