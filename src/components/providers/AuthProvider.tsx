'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import { fetchAuthSession } from 'aws-amplify/auth'
import { configureAmplify } from '@/lib/amplify'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const checkAuth = useAuthStore((state) => state.checkAuth)

  useEffect(() => {
    // Configure Amplify on client side
    console.log('AuthProvider: Configuring Amplify...')
    configureAmplify()
    console.log('AuthProvider: Amplify configured')
    
    // Handle OAuth callback
    const handleOAuthCallback = async () => {
      try {
        console.log('AuthProvider: Handling OAuth callback...')
        
        // Wait a bit for Amplify to process the callback
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        const { tokens } = await fetchAuthSession()
        console.log('AuthProvider: Tokens:', tokens ? 'Present' : 'Missing')
        
        if (tokens) {
          console.log('AuthProvider: User authenticated, updating auth state...')
          await checkAuth()
          console.log('AuthProvider: Auth state updated')
          
          // Clean up URL parameters
          window.history.replaceState({}, document.title, '/')
          
          // Use router.push instead of window.location.href for better Next.js integration
          setTimeout(() => {
            console.log('AuthProvider: Redirecting to /daily')
            router.push('/daily')
          }, 100)
        } else {
          console.log('AuthProvider: No tokens found, redirecting to home')
          router.push('/')
        }
      } catch (error) {
        console.error('AuthProvider: OAuth callback error:', error)
        router.push('/')
      }
    }
    
    // Check if we're in an OAuth callback
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.has('code') || urlParams.has('state')) {
      console.log('AuthProvider: OAuth callback detected, handling...')
      handleOAuthCallback()
    } else {
      console.log('AuthProvider: No OAuth callback, checking normal auth...')
      // Only check auth if we're not in the middle of signing out
      const currentState = useAuthStore.getState()
      if (!currentState.isLoading || currentState.isAuthenticated) {
        checkAuth()
      }
    }
  }, [checkAuth, router])

  return <>{children}</>
}



