'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore()
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        console.log('ProtectedRoute: Checking auth...')
        // First check the current auth state
        await checkAuth()
        console.log('ProtectedRoute: Auth check complete')
      } catch (error) {
        console.error('ProtectedRoute: Auth check failed:', error)
      } finally {
        setIsChecking(false)
      }
    }
    verifyAuth()
  }, [checkAuth])

  useEffect(() => {
    // Once we've finished checking auth, redirect if not authenticated
    console.log('ProtectedRoute state:', { isChecking, isLoading, isAuthenticated })
    if (!isChecking && !isLoading && !isAuthenticated) {
      console.log('ProtectedRoute: Not authenticated, redirecting to home')
      // Redirect to home if not authenticated
      router.push('/')
    }
  }, [isChecking, isAuthenticated, isLoading, router])

  // Show loading while checking auth
  if (isChecking || isLoading) {
    return (
      <div className="mx-auto max-w-7xl p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  // Show nothing if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null
  }

  // Render children if authenticated
  return <>{children}</>
}

