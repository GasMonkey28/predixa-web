'use client'

import { useAuthStore } from '@/lib/auth-store'
import { useStripeStore } from '@/lib/stripe-store'
import { useEffect } from 'react'

export default function AccountPage() {
  const { user, signOut } = useAuthStore()
  const { subscription, createCheckoutSession, createCustomerPortalSession, fetchSubscription } = useStripeStore()

  useEffect(() => {
    fetchSubscription()
  }, [fetchSubscription])

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
          onClick={() => signOut()}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
        >
          Sign Out
        </button>
      </div>

      <div className="space-y-6">
        {/* User Info */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-medium mb-4">Profile</h2>
          <div className="space-y-2">
            <p><span className="font-medium">Name:</span> {user?.givenName} {user?.familyName}</p>
            <p><span className="font-medium">Email:</span> {user?.email}</p>
          </div>
        </div>

        {/* Subscription */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-medium mb-4">Subscription</h2>
          
          {subscription ? (
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
                    onClick={() => handleSubscribe('price_monthly_pro')}
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
                    onClick={() => handleSubscribe('price_yearly_pro')}
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

