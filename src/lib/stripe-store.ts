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
  createCheckoutSession: (priceId: string, promoCode?: string) => Promise<void>
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
  createCheckoutSession: async (priceId: string, promoCode?: string) => {
    set({ isLoading: true, error: null })
    try {
      // Get current user info to pass as fallback
      const { getCurrentUser } = await import('aws-amplify/auth')
      let userId: string | undefined
      let userEmail: string | undefined
      
      try {
        const user = await getCurrentUser()
        userId = user.userId
        const session = await (await import('aws-amplify/auth')).fetchAuthSession()
        userEmail = (session.tokens?.idToken?.payload as any)?.email
      } catch (authError) {
        console.log('Could not get user info for fallback:', authError)
      }
      
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important: include cookies
        body: JSON.stringify({ priceId, userId, userEmail, promoCode })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        // If user already has subscription, don't redirect - let them handle it
        if (errorData.hasActiveSubscription) {
          set({ error: errorData.error, isLoading: false })
          throw new Error(errorData.error)
        }
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
      // Get current user info to pass as fallback
      const { getCurrentUser } = await import('aws-amplify/auth')
      let userId: string | undefined
      
      try {
        const user = await getCurrentUser()
        userId = user.userId
      } catch (authError) {
        console.log('Could not get user info for portal session:', authError)
      }
      
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Important: include cookies
        body: JSON.stringify({ userId })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        // If portal needs configuration, include the URL in the error
        if (errorData.needsConfiguration && errorData.portalUrl) {
          throw new Error(`${errorData.error}\n\nClick here to configure: ${errorData.portalUrl}`)
        }
        throw new Error(errorData.error || 'Failed to create portal session')
      }
      
      const data = await response.json()
      
      if (!data.url) {
        throw new Error('No portal URL returned from server')
      }
      
      // Redirect to Stripe billing portal
      window.location.href = data.url
    } catch (error: any) {
      set({ error: error.message || 'Failed to create portal session', isLoading: false })
      throw error
    }
  },

  fetchSubscription: async () => {
    set({ isLoading: true, error: null })
    try {
      // Get current user info to pass as fallback
      const { getCurrentUser } = await import('aws-amplify/auth')
      let userId: string | undefined
      
      try {
        const user = await getCurrentUser()
        userId = user.userId
      } catch (authError) {
        console.log('Could not get user info for subscription fetch:', authError)
      }
      
      const url = userId 
        ? `/api/stripe/subscription?userId=${encodeURIComponent(userId)}`
        : '/api/stripe/subscription'
      
      const response = await fetch(url, {
        credentials: 'include' // Important: include cookies
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const subscription = await response.json()
      // If subscription is null, that's fine - just means no active subscription
      set({ subscription, isLoading: false, error: null })
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch subscription', isLoading: false })
    }
  },

  clearError: () => set({ error: null }),
}))



