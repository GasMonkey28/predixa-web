import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getOrCreateStripeCustomer } from '@/lib/stripe-helpers'
import { config } from '@/lib/server/config'
import { logger } from '@/lib/server/logger'
import { checkRateLimit, getRateLimitHeaders } from '@/lib/server/rate-limit'

// Force dynamic rendering since we use searchParams
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const clientIp =
    (request.headers.get('x-forwarded-for') || '').split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    request.ip ||
    'anonymous'

  if (!checkRateLimit(clientIp)) {
    logger.warn({ ip: clientIp }, 'Stripe subscription rate limit exceeded')
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429, headers: getRateLimitHeaders(clientIp) }
    )
  }

  try {
    const stripe = new Stripe(config.stripe.secretKey, {
      apiVersion: '2023-10-16',
    })

    // Get userId from query params as fallback
    const userId = request.nextUrl.searchParams.get('userId')
    
    // Get or create Stripe customer for the authenticated user
    let customer = await getOrCreateStripeCustomer(request)
    
    // Fallback: if cookie extraction fails, try using userId from query params
    if (!customer && userId) {
      logger.warn({ userId }, 'Cookie extraction failed; falling back to userId for subscription lookup')
      // Search for existing customer by Cognito user ID
      const existingCustomers = await stripe.customers.search({
        query: `metadata['cognito_user_id']:'${userId}'`,
        limit: 1
      })
      
      if (existingCustomers.data.length > 0) {
        customer = existingCustomers.data[0]
      }
    }
    
    if (!customer) {
      logger.warn({ userId }, 'No customer found when fetching subscription')
      return NextResponse.json(null, { headers: getRateLimitHeaders(clientIp) })
    }

    // Get the customer's subscriptions - get most recent first
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'all',
      limit: 10, // Get more to find the most recent
      expand: ['data.latest_invoice']
    })

    if (subscriptions.data.length === 0) {
      logger.info({ customerId: customer.id }, 'No Stripe subscriptions found for customer')
      return NextResponse.json(null, { headers: getRateLimitHeaders(clientIp) })
    }

    // Sort by created date (most recent first) and get the first one
    const sortedSubscriptions = subscriptions.data.sort((a, b) => b.created - a.created)
    const subscription = sortedSubscriptions[0]
    
    logger.debug({
      subscriptionId: subscription.id,
      status: subscription.status,
      customerId: customer.id,
      created: new Date(subscription.created * 1000).toISOString(),
    }, 'Stripe subscription retrieved')
    const subscriptionItem = subscription.items.data[0]
    
    if (!subscriptionItem) {
      return NextResponse.json(null)
    }

    const price = subscriptionItem.price
    
    // Fetch product details separately
    let productName = 'Pro Plan'
    if (price?.product) {
      try {
        const product = typeof price.product === 'string' 
          ? await stripe.products.retrieve(price.product)
          : price.product
        // Check if product is not deleted and has a name property
        if (product && !product.deleted && 'name' in product) {
          productName = product.name || 'Pro Plan'
        }
      } catch (productError) {
        logger.error({ error: productError, productId: price.product }, 'Error fetching Stripe product details')
        // Continue with default name
      }
    }

    // Format the subscription data to match the expected interface
    const subscriptionData = {
      id: subscription.id,
      status: subscription.status,
      current_period_end: subscription.current_period_end,
      plan: {
        id: price?.id || '',
        name: productName,
        amount: price?.unit_amount || 0,
        interval: (price?.recurring?.interval || 'month') as 'month' | 'year'
      }
    }

    logger.info({ customerId: customer.id, subscriptionId: subscription.id, status: subscription.status }, 'Returning current subscription details')
    return NextResponse.json(subscriptionData, { headers: getRateLimitHeaders(clientIp) })
  } catch (error: any) {
    logger.error({ error }, 'Error fetching Stripe subscription')
    // Return null instead of error to avoid breaking the UI
    // The UI already handles null subscriptions gracefully
    return NextResponse.json(null, { headers: getRateLimitHeaders(clientIp) })
  }
}



