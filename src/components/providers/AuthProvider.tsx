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
        console.log('AuthProvider: Handling OAuth callback...')
        const { tokens } = await fetchAuthSession()
        console.log('AuthProvider: Tokens:', tokens ? 'Present' : 'Missing')
        if (tokens) {
          // User is authenticated via OAuth
          console.log('AuthProvider: User authenticated, updating auth state...')
          await checkAuth()
          console.log('AuthProvider: Auth state updated, redirecting to /daily')
          // Delay to ensure state is updated before redirect
          setTimeout(() => {
            console.log('AuthProvider: Cleaning URL and redirecting to /daily')
            // Clean up URL parameters
            window.history.replaceState({}, document.title, window.location.pathname)
            // Redirect to daily page after successful OAuth sign-in
            router.push('/daily')
          }, 500)
        }
      } catch (error) {
        console.error('AuthProvider: OAuth callback error:', error)
      }
    }
    
    // Check if we're in an OAuth callback
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.has('code') || urlParams.has('state')) {
      console.log('AuthProvider: OAuth callback detected, handling...')
      handleOAuthCallback()
    } else {
      console.log('AuthProvider: No OAuth callback, checking normal auth...')
      checkAuth()
    }
  }, [checkAuth, router])

  return <>{children}</>
}



