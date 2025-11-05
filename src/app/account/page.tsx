'use client'

import { useState } from 'react'
import { useAuthStore } from '@/lib/auth-store'
import { useStripeStore } from '@/lib/stripe-store'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { toast } from 'react-hot-toast'
import ProtectedRoute from '@/components/auth/ProtectedRoute'

function AccountPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, signOut, isAuthenticated, updateUserProfile, isLoading: isAuthLoading } = useAuthStore()
  const [isEditing, setIsEditing] = useState(false)
  const [givenName, setGivenName] = useState(user?.givenName || '')
  const [familyName, setFamilyName] = useState(user?.familyName || '')
  const [promoCode, setPromoCode] = useState('')
  const [showPromoCode, setShowPromoCode] = useState(false)
  const { subscription, createCheckoutSession, createCustomerPortalSession, fetchSubscription, isLoading, error, clearError } = useStripeStore()

  useEffect(() => {
    // For testing, always try to fetch subscription regardless of auth status
    fetchSubscription()
  }, [fetchSubscription])

  useEffect(() => {
    // Check if returning from successful checkout
    const success = searchParams.get('success')
    if (success === 'true') {
      // Wait a bit longer for Stripe to process, then refetch subscription
      setTimeout(() => {
        fetchSubscription()
        toast.success('Subscription activated!')
        // Remove the query parameter from URL
        router.replace('/account')
      }, 2000) // Increased delay to 2 seconds
      
      // Also refetch after a longer delay as backup
      setTimeout(() => {
        fetchSubscription()
      }, 5000)
    }
  }, [searchParams, fetchSubscription, router])

  useEffect(() => {
    // Update local state when user changes
    setGivenName(user?.givenName || '')
    setFamilyName(user?.familyName || '')
  }, [user])

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setGivenName(user?.givenName || '')
    setFamilyName(user?.familyName || '')
  }

  const handleSave = async () => {
    try {
      await updateUserProfile(givenName, familyName)
      setIsEditing(false)
      toast.success('Profile updated successfully!')
    } catch (error: any) {
      console.error('Error in handleSave:', error)
      const errorMessage = error?.message || 'Failed to update profile'
      toast.error(errorMessage)
    }
  }

  const handleSubscribe = async (priceId: string) => {
    try {
      // Use promo code if provided, otherwise use empty string
      const codeToUse = promoCode.trim() || undefined
      await createCheckoutSession(priceId, codeToUse)
      // Clear promo code after successful checkout initiation
      setPromoCode('')
    } catch (error: any) {
      console.error('Failed to create checkout session:', error)
      // Show user-friendly error message
      if (error?.message) {
        toast.error(error.message)
      } else {
        toast.error('Failed to start subscription. Please try again.')
      }
    }
  }

  const handleManageSubscription = async () => {
    try {
      await createCustomerPortalSession()
    } catch (error) {
      console.error('Failed to create portal session:', error)
    }
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold dark:text-white">Account</h1>
        <button
          onClick={async () => {
            try {
              await signOut()
              // Redirect to home page after sign out
              router.push('/')
            } catch (error) {
              console.error('Sign out failed:', error)
            }
          }}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
        >
          Sign Out
        </button>
      </div>

      <div className="space-y-6">
        {/* User Info */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium dark:text-white">Profile</h2>
            {!isEditing && (
              <button
                onClick={handleEdit}
                disabled={isAuthLoading}
                className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50"
              >
                Edit
              </button>
            )}
          </div>
          {isEditing ? (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name</label>
                <input
                  type="text"
                  value={givenName}
                  onChange={(e) => setGivenName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isAuthLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
                <input
                  type="text"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isAuthLoading}
                />
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleSave}
                  disabled={isAuthLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {isAuthLoading ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={isAuthLoading}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="dark:text-gray-300"><span className="font-medium dark:text-white">Name:</span> {user?.givenName} {user?.familyName}</p>
              <p className="dark:text-gray-300"><span className="font-medium dark:text-white">Email:</span> {user?.email}</p>
            </div>
          )}
        </div>

        {/* Subscription */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium dark:text-white">Subscription</h2>
          </div>
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <p className="text-red-800 dark:text-red-200 font-medium">Error</p>
                <button 
                  onClick={clearError}
                  className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 text-sm font-medium"
                >
                  Dismiss
                </button>
              </div>
              <div className="text-sm text-red-700 dark:text-red-300 whitespace-pre-line mb-3">{error}</div>
              {error.includes('dashboard.stripe.com') && (
                <a
                  href={error.match(/https:\/\/[^\s]+/)?.[0] || 'https://dashboard.stripe.com/test/settings/billing/portal'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Configure Stripe Portal
                </a>
              )}
            </div>
          )}
          
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600 dark:text-gray-400">Loading subscription...</span>
            </div>
          ) : subscription && subscription.plan ? (
            <div className="space-y-6">
              {/* Active Subscription Card */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold dark:text-white">{subscription.plan.name}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        subscription.status === 'active' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                      }`}>
                        {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                      </span>
                    </div>
                    <p className="text-3xl font-bold dark:text-white mb-1">
                      ${(subscription.plan.amount / 100).toFixed(2)}
                      <span className="text-lg font-normal text-gray-600 dark:text-gray-400">
                        /{subscription.plan.interval}
                      </span>
                    </p>
                  </div>
                </div>
                
                {subscription.status === 'active' && subscription.current_period_end && (
                  <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Next billing date: {new Date(subscription.current_period_end * 1000).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <button
                onClick={handleManageSubscription}
                disabled={isLoading}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Manage Subscription
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center py-4">
                <p className="text-gray-600 dark:text-gray-400 mb-2">You don&apos;t have an active subscription</p>
                <p className="text-sm text-gray-500 dark:text-gray-500">Choose a plan to get started</p>
              </div>
              
              {/* Promo Code Input */}
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowPromoCode(!showPromoCode)}
                  className="flex items-center justify-between w-full text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Have a promo code?
                  </span>
                  <svg 
                    className={`w-4 h-4 transition-transform ${showPromoCode ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showPromoCode && (
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      placeholder="Enter promo code"
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    {promoCode && (
                      <button
                        onClick={() => setPromoCode('')}
                        className="px-3 py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                )}
              </div>
              
              {/* Pricing Plans */}
              <div className="grid gap-6 sm:grid-cols-2">
                {/* Monthly Plan */}
                <div className="relative border-2 border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold dark:text-white mb-2">Monthly Pro</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold dark:text-white">$19.99</span>
                      <span className="text-gray-600 dark:text-gray-400">/month</span>
                    </div>
                  </div>
                  <ul className="space-y-2 mb-6 text-sm text-gray-600 dark:text-gray-400">
                    <li className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Full access to all features
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Cancel anytime
                    </li>
                  </ul>
                  <button
                    onClick={() => handleSubscribe('price_1SLR4cCqoRregBRsF7uBCniS')}
                    disabled={isLoading}
                    className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
                  >
                    Subscribe
                  </button>
                </div>

                {/* Yearly Plan - Featured */}
                <div className="relative border-2 border-blue-500 dark:border-blue-600 rounded-xl p-6 bg-blue-50 dark:bg-blue-900/10">
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                      Best Value
                    </span>
                  </div>
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold dark:text-white mb-2">Yearly Pro</h3>
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="text-4xl font-bold dark:text-white">$179.99</span>
                      <span className="text-gray-600 dark:text-gray-400">/year</span>
                    </div>
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">
                      Save $60/year (25% off)
                    </p>
                  </div>
                  <ul className="space-y-2 mb-6 text-sm text-gray-600 dark:text-gray-400">
                    <li className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Full access to all features
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Cancel anytime
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Best savings
                    </li>
                  </ul>
                  <button
                    onClick={() => handleSubscribe('price_1SLR4cCqoRregBRsibd2Jz0B')}
                    disabled={isLoading}
                    className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
                  >
                    Subscribe
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Legal & Support */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-6">
          <h2 className="text-lg font-medium dark:text-white mb-4">Legal & Support</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a
              href="https://www.notion.so/Predixa-Terms-of-Service-28ff89ca672480f3b8a7d4bb82346fe4?source=copy_link"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Terms of Service
            </a>
            <a
              href="https://www.notion.so/Predixa-Privacy-Policy-7e268254f7e149a1b0ace9572ac70e78?source=copy_link"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Privacy Policy
            </a>
            <a
              href="https://www.notion.so/Predixa-App-Support-28ef89ca67248053b3f9d19aec86068a?source=copy_link"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Support
            </a>
            <a
              href="#"
              className="flex items-center gap-2 text-gray-500 dark:text-gray-400 cursor-not-allowed"
              title="Coming soon"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Cookie Policy
            </a>
            <a
              href="#"
              className="flex items-center gap-2 text-gray-500 dark:text-gray-400 cursor-not-allowed"
              title="Coming soon"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Refund Policy
            </a>
            <a
              href="#"
              className="flex items-center gap-2 text-gray-500 dark:text-gray-400 cursor-not-allowed"
              title="Coming soon"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Disclaimer
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AccountPage() {
  return (
    <ProtectedRoute>
      <AccountPageContent />
    </ProtectedRoute>
  )
}
