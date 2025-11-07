'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { subscriptionService } from '@/lib/subscription-service'
import { useAuthStore } from '@/lib/auth-store'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireSubscription?: boolean // Whether this route requires active subscription
}

export default function ProtectedRoute({ 
  children, 
  requireSubscription = false 
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isChecking, setIsChecking] = useState(true)
  const [hasSubscription, setHasSubscription] = useState<boolean | null>(null)
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null)

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        console.log('ProtectedRoute: Checking auth...')
        
        // Wait a bit for AuthProvider to configure Amplify
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Only check auth if we don't already have a user
        const currentState = useAuthStore.getState()
        if (!currentState.isAuthenticated && !currentState.user) {
          await checkAuth()
        }
        
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
    // Check subscription status if required
    if (requireSubscription && isAuthenticated && !isLoading) {
      const checkSubscription = async () => {
        try {
          const hasActive = await subscriptionService.hasActiveSubscription()
          setHasSubscription(hasActive)
          setSubscriptionError(null)
        } catch (error) {
          console.error('ProtectedRoute: Subscription check failed:', error)
          setSubscriptionError('Failed to check subscription status')
          // On error, assume no subscription (fail secure)
          setHasSubscription(false)
        }
      }
      checkSubscription()
    } else if (!requireSubscription) {
      // If subscription not required, set to true to allow access
      setHasSubscription(true)
    }
  }, [requireSubscription, isAuthenticated, isLoading])

  useEffect(() => {
    // Once we've finished checking auth, redirect if not authenticated
    if (!isChecking && !isLoading && !isAuthenticated) {
      console.log('ProtectedRoute: Not authenticated, redirecting to home')
      router.push('/')
      return
    }

    // If subscription is required but user doesn't have one, redirect to account
    if (requireSubscription && hasSubscription === false && !isChecking && !isLoading) {
      console.log('ProtectedRoute: No active subscription, redirecting to account')
      router.push('/account?subscription_required=true')
    }
  }, [isChecking, isAuthenticated, isLoading, hasSubscription, requireSubscription, router])

  // Show loading while checking auth or subscription
  if (isChecking || isLoading || (requireSubscription && hasSubscription === null)) {
    return (
      <div className="mx-auto max-w-7xl p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  // Show error message if subscription check failed
  if (subscriptionError) {
    return (
      <div className="mx-auto max-w-7xl p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">{subscriptionError}</p>
        </div>
      </div>
    )
  }

  // Show nothing if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null
  }

  // Show subscription required message if needed
  if (requireSubscription && hasSubscription === false) {
    return (
      <div className="mx-auto max-w-7xl p-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-blue-900 mb-2">
            Subscription Required
          </h2>
          <p className="text-blue-700 mb-4">
            You need an active subscription to access this content.
          </p>
          <button
            onClick={() => router.push('/account')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            View Subscription Options
          </button>
        </div>
      </div>
    )
  }

  // Render children if authenticated (and has subscription if required)
  return <>{children}</>
}
