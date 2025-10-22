import { create } from 'zustand'
import { loadStripe } from '@stripe/stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

export interface Subscription {
  id: string
  status: 'active' | 'canceled' | 'past_due' | 'unpaid'
  current_period_end: number
  plan: {
    id: string
    name: string
    amount: number
    interval: 'month' | 'year'
  }
}

interface StripeState {
  subscription: Subscription | null
  isLoading: boolean
  error: string | null
}

interface StripeActions {
  createCheckoutSession: (priceId: string) => Promise<void>
  createCustomerPortalSession: () => Promise<void>
  fetchSubscription: () => Promise<void>
  clearError: () => void
}

export const useStripeStore = create<StripeState & StripeActions>((set, get) => ({
  // State
  subscription: null,
  isLoading: false,
  error: null,

  // Actions
  createCheckoutSession: async (priceId: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create checkout session')
      }
      
      const { sessionId } = await response.json()
      
      if (!sessionId) {
        throw new Error('No session ID returned from server')
      }
      
      const stripe = await stripePromise
      
      if (stripe) {
        const { error } = await stripe.redirectToCheckout({ sessionId })
        if (error) {
          throw new Error(error.message)
        }
      } else {
        throw new Error('Stripe failed to load')
      }
    } catch (error: any) {
      set({ error: error.message || 'Failed to create checkout session', isLoading: false })
      throw error
    }
  },

  createCustomerPortalSession: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      const { url } = await response.json()
      window.location.href = url
    } catch (error: any) {
      set({ error: error.message || 'Failed to create portal session', isLoading: false })
      throw error
    }
  },

  fetchSubscription: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await fetch('/api/stripe/subscription')
      
      if (response.status === 401) {
        // User not authenticated, this is normal
        set({ subscription: null, isLoading: false, error: null })
        return
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const subscription = await response.json()
      set({ subscription, isLoading: false })
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch subscription', isLoading: false })
    }
  },

  clearError: () => set({ error: null }),
}))



