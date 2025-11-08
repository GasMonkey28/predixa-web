import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth'

export interface UnifiedSubscription {
  id: string
  status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'inactive' | 'trialing' | 'none'
  platform: 'stripe' | 'revenuecat'
  current_period_end: number
  plan: {
    id: string
    name: string
    amount: number
    interval: 'month' | 'year'
  }
}

export interface EntitlementsResponse {
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'none' | 'trial_expired'
  plan: string | null
  current_period_end: number | null
  trial_expires_at: number | null
  trial_started_at: string | null
  trial_days_remaining: number
  trial_active: boolean
  access_granted: boolean
  access_reason: string
}

export class SubscriptionService {
  private static instance: SubscriptionService
  private baseUrl: string

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || ''
  }

  static getInstance(): SubscriptionService {
    if (!SubscriptionService.instance) {
      SubscriptionService.instance = new SubscriptionService()
    }
    return SubscriptionService.instance
  }

  /**
   * Get unified subscription status from DynamoDB entitlements table.
   * This is the primary method - it uses the Lambda entitlements API.
   * Falls back to direct Stripe API if entitlements API is unavailable.
   */
  async getUnifiedSubscription(): Promise<UnifiedSubscription | null> {
    try {
      // First, try the new entitlements API (DynamoDB-backed)
      const entitlements = await this.getEntitlements()
      
      if (entitlements) {
        if (entitlements.access_granted) {
          const derivedStatus =
            entitlements.status === 'active'
              ? 'active'
              : ('trialing' as const)
          const effectivePeriodEnd =
            entitlements.current_period_end ??
            entitlements.trial_expires_at ??
            0
          const planName =
            entitlements.status === 'trialing' && entitlements.trial_active
              ? 'Free Trial'
              : this.getPlanName(entitlements.plan)
          return {
            id: entitlements.plan || 'trial',
            status: derivedStatus,
            platform: 'stripe',
            current_period_end: effectivePeriodEnd,
            plan: {
              id: entitlements.plan || 'trial',
              name: planName,
              amount: 0,
              interval: 'month',
            },
          }
        }

        // Convert entitlements response to UnifiedSubscription format
        // No access granted - fall through to other providers / null
      }

      // Fallback: Check Stripe directly (for backward compatibility)
      // This is useful if entitlements API is not yet deployed
      const stripeSubscription = await this.getStripeSubscription()
      if (stripeSubscription) {
        return stripeSubscription
      }

      // Check RevenueCat as last resort
      try {
        const cognitoUser = await getCurrentUser()
        const revenueCatSubscription = await this.getRevenueCatSubscription(cognitoUser.userId)
        if (revenueCatSubscription) {
          return revenueCatSubscription
        }
      } catch (error) {
        // Ignore RevenueCat errors
      }

      return null
    } catch (error) {
      console.error('Error fetching unified subscription:', error)
      return null
    }
  }

  /**
   * Get entitlements from the Lambda API Gateway endpoint.
   * This is the primary source of truth for subscription status.
   */
  private async getEntitlements(): Promise<EntitlementsResponse | null> {
    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      try {
        const session = await fetchAuthSession()
        const idToken = session.tokens?.idToken?.toString()
        if (idToken) {
          headers.Authorization = `Bearer ${idToken}`
        }
      } catch (error) {
        console.warn('Entitlements: unable to fetch auth session', error)
      }

      const response = await fetch('/api/entitlements', {
        method: 'GET',
        headers,
        cache: 'no-store',
        credentials: 'include',
      })
      
      if (!response.ok) {
        // 401 means not authenticated - that's expected for logged-out users
        if (response.status === 401) {
          return null
        }
        // Other errors - log but don't throw
        console.warn('Entitlements API returned error:', response.status)
        return null
      }

      const entitlements = await response.json() as EntitlementsResponse
      return entitlements
    } catch (error) {
      console.error('Error fetching entitlements:', error)
      return null
    }
  }

  /**
   * Get plan display name from Stripe price ID.
   * This is a helper - in production, you might want to store plan names in DynamoDB.
   */
  private getPlanName(priceId: string | null): string {
    if (!priceId) return 'Unknown Plan'
    
    // You can enhance this with a mapping of price IDs to plan names
    // For now, return a generic name
    if (priceId.includes('month')) return 'Monthly Pro'
    if (priceId.includes('year')) return 'Yearly Pro'
    
    return 'Pro Plan'
  }

  private async getStripeSubscription(): Promise<UnifiedSubscription | null> {
    try {
      const response = await fetch('/api/stripe/subscription')
      if (!response.ok) return null

      const subscription = await response.json()
      if (!subscription) return null

      return {
        id: subscription.id,
        status: subscription.status,
        platform: 'stripe',
        current_period_end: subscription.current_period_end,
        plan: subscription.plan
      }
    } catch (error) {
      console.error('Error fetching Stripe subscription:', error)
      return null
    }
  }

  private async getRevenueCatSubscription(userId: string): Promise<UnifiedSubscription | null> {
    try {
      // This would call your RevenueCat API or database
      // For now, we'll return null as this needs to be implemented
      // based on how you store RevenueCat subscription data
      
      // Example implementation:
      // const response = await fetch(`/api/revenuecat/subscription/${userId}`)
      // if (!response.ok) return null
      // return await response.json()
      
      return null
    } catch (error) {
      console.error('Error fetching RevenueCat subscription:', error)
      return null
    }
  }

  /**
   * Check if user has active subscription or trial.
   * Returns true for 'active' or 'trialing' status.
   */
  async hasActiveSubscription(): Promise<boolean> {
    const entitlements = await this.getEntitlements()
    if (entitlements) {
      if (entitlements.access_granted) {
        return true
      }
    }

    const subscription = await this.getUnifiedSubscription()
    return subscription?.status === 'active' || subscription?.status === 'trialing' || false
  }

  /**
   * Check if user has any subscription (including past_due, canceled, etc.)
   */
  async hasAnySubscription(): Promise<boolean> {
    const subscription = await this.getUnifiedSubscription()
    return subscription !== null && subscription.status !== 'none'
  }

  /**
   * Get subscription status directly from entitlements API.
   * Useful for components that just need the status string.
   */
  async getSubscriptionStatus(): Promise<'active' | 'trialing' | 'past_due' | 'canceled' | 'none'> {
    const entitlements = await this.getEntitlements()
    if (entitlements) {
      if (entitlements.access_granted) {
        if (entitlements.status === 'trialing' && entitlements.trial_active) {
          return 'trialing'
        }
        if (entitlements.status === 'active') {
          return 'active'
        }
      }
      return entitlements.status === 'trial_expired' ? 'none' : entitlements.status
    }
    return 'none'
  }

  async getSubscriptionPlatform(): Promise<'stripe' | 'revenuecat' | null> {
    const subscription = await this.getUnifiedSubscription()
    return subscription?.platform ?? null
  }
}

// Export singleton instance
export const subscriptionService = SubscriptionService.getInstance()
