'use client'

import { useState } from 'react'
import { useAuthStore } from '@/lib/auth-store'
import { useStripeStore } from '@/lib/stripe-store'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { toast } from 'react-hot-toast'

function AccountPageContent() {
  const router = useRouter()
  const { user, signOut, isAuthenticated, updateUserProfile, isLoading: isAuthLoading } = useAuthStore()
  const [isEditing, setIsEditing] = useState(false)
  const [givenName, setGivenName] = useState(user?.givenName || '')
  const [familyName, setFamilyName] = useState(user?.familyName || '')
  const { subscription, createCheckoutSession, createCustomerPortalSession, fetchSubscription, isLoading, error, clearError } = useStripeStore()

  useEffect(() => {
    // For testing, always try to fetch subscription regardless of auth status
    fetchSubscription()
  }, [fetchSubscription])

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
      await createCheckoutSession(priceId)
    } catch (error) {
      console.error('Failed to create checkout session:', error)
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
        <h1 className="text-2xl font-semibold">Account</h1>
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
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
        >
          Sign Out
        </button>
      </div>

      <div className="space-y-6">
        {/* User Info */}
        <div className="bg-white rounded-lg border p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium">Profile</h2>
            {!isEditing && (
              <button
                onClick={handleEdit}
                disabled={isAuthLoading}
                className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
              >
                Edit
              </button>
            )}
          </div>
          {isEditing ? (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input
                  type="text"
                  value={givenName}
                  onChange={(e) => setGivenName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isAuthLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input
                  type="text"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p><span className="font-medium">Name:</span> {user?.givenName} {user?.familyName}</p>
              <p><span className="font-medium">Email:</span> {user?.email}</p>
            </div>
          )}
        </div>

        {/* Subscription */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-medium mb-4">Subscription</h2>
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded flex justify-between items-center">
              <span>Error: {error}</span>
              <button 
                onClick={clearError}
                className="text-red-600 hover:text-red-800 underline text-sm"
              >
                Dismiss
              </button>
            </div>
          )}
          
          {isLoading ? (
            <div className="text-gray-600">Loading subscription...</div>
          ) : subscription && subscription.plan ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{subscription.plan.name}</p>
                  <p className="text-sm text-gray-600">
                    ${subscription.plan.amount / 100}/{subscription.plan.interval}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded text-sm ${
                  subscription.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {subscription.status}
                </span>
              </div>
              <button
                onClick={handleManageSubscription}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Manage Subscription
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-600">No active subscription</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium">Monthly Pro</h3>
                  <p className="text-2xl font-bold">$19.99<span className="text-sm font-normal">/month</span></p>
                  <button
                    onClick={() => handleSubscribe('price_1SLR4cCqoRregBRsF7uBCniS')}
                    className="w-full mt-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Subscribe
                  </button>
                </div>
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium">Yearly Pro</h3>
                  <p className="text-2xl font-bold">$179.99<span className="text-sm font-normal">/year</span></p>
                  <p className="text-sm text-green-600">Save $60/year</p>
                  <button
                    onClick={() => handleSubscribe('price_1SLR4cCqoRregBRsibd2Jz0B')}
                    className="w-full mt-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Subscribe
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AccountPage() {
  return <AccountPageContent />
}
