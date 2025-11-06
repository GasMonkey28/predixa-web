/**
 * Stripe Configuration
 * 
 * This file manages Stripe price IDs and other configuration.
 * Price IDs are different between test and live modes.
 * 
 * To get your live mode price IDs:
 * 1. Go to Stripe Dashboard → Toggle to Live Mode
 * 2. Go to Products → Select your product
 * 3. Copy the Price ID (starts with price_)
 * 4. Add to Vercel environment variables:
 *    - NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY
 *    - NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY
 */

export const stripeConfig = {
  // Monthly subscription price ID
  priceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY || '',
  
  // Yearly subscription price ID
  priceIdYearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY || '',
  
  // Check if price IDs are configured
  get isConfigured() {
    return !!(this.priceIdMonthly && this.priceIdYearly)
  },
  
  // Get the Stripe mode (test or live) based on publishable key
  get mode() {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
    if (publishableKey.startsWith('pk_live_')) {
      return 'live'
    }
    if (publishableKey.startsWith('pk_test_')) {
      return 'test'
    }
    return 'unknown'
  }
}

