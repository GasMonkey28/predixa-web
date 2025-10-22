import { getCurrentUser } from 'aws-amplify/auth'

export interface UnifiedSubscription {
  id: string
  status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'inactive'
  platform: 'stripe' | 'revenuecat'
  current_period_end: number
  plan: {
    id: string
    name: string
    amount: number
    interval: 'month' | 'year'
  }
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

  async getUnifiedSubscription(): Promise<UnifiedSubscription | null> {
    try {
      const cognitoUser = await getCurrentUser()
      const userId = cognitoUser.userId

      // Check both Stripe and RevenueCat subscriptions
      const [stripeSubscription, revenueCatSubscription] = await Promise.allSettled([
        this.getStripeSubscription(),
        this.getRevenueCatSubscription(userId)
      ])

      // Prioritize active subscriptions
      const subscriptions: UnifiedSubscription[] = []

      if (stripeSubscription.status === 'fulfilled' && stripeSubscription.value) {
        subscriptions.push(stripeSubscription.value)
      }

      if (revenueCatSubscription.status === 'fulfilled' && revenueCatSubscription.value) {
        subscriptions.push(revenueCatSubscription.value)
      }

      // Return the most recent active subscription
      const activeSubscriptions = subscriptions.filter(sub => sub.status === 'active')
      if (activeSubscriptions.length > 0) {
        return activeSubscriptions.sort((a, b) => b.current_period_end - a.current_period_end)[0]
      }

      // If no active subscriptions, return the most recent one
      if (subscriptions.length > 0) {
        return subscriptions.sort((a, b) => b.current_period_end - a.current_period_end)[0]
      }

      return null
    } catch (error) {
      console.error('Error fetching unified subscription:', error)
      return null
    }
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

  async hasActiveSubscription(): Promise<boolean> {
    const subscription = await this.getUnifiedSubscription()
    return subscription?.status === 'active' || false
  }

  async getSubscriptionPlatform(): Promise<'stripe' | 'revenuecat' | null> {
    const subscription = await this.getUnifiedSubscription()
    return subscription?.platform ?? null
  }
}

// Export singleton instance
export const subscriptionService = SubscriptionService.getInstance()
