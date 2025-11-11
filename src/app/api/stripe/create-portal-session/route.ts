import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getOrCreateStripeCustomer } from '@/lib/stripe-helpers'
import { config } from '@/lib/server/config'
import { logger } from '@/lib/server/logger'
import { checkRateLimit, getRateLimitHeaders } from '@/lib/server/rate-limit'

export async function POST(request: NextRequest) {
  const clientIp =
    (request.headers.get('x-forwarded-for') || '').split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    request.ip ||
    'anonymous'

  if (!checkRateLimit(clientIp)) {
    logger.warn({ ip: clientIp }, 'Stripe portal rate limit exceeded')
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429, headers: getRateLimitHeaders(clientIp) }
    )
  }

  try {
    const stripe = new Stripe(config.stripe.secretKey, {
      apiVersion: '2023-10-16',
    })

    // Get userId from request body as fallback
    const body = await request.json().catch(() => ({}))
    const userId = body.userId

    // Get or create Stripe customer for the authenticated user
    let customer = await getOrCreateStripeCustomer(request)
    
    // Fallback: if cookie extraction fails, try using userId from request body
    if (!customer && userId) {
      logger.warn({ userId }, 'Cookie extraction failed; falling back to userId for portal session lookup')
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
      logger.warn({ userId }, 'Portal session requested without authenticated customer')
      return NextResponse.json(
        {
          error: 'User authentication required. Please sign in and try again.',
          debug: 'No customer found and no userId provided',
        },
        { status: 401, headers: getRateLimitHeaders(clientIp) }
      )
    }

    // Check if billing portal is configured in Stripe
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: customer.id,
        return_url: `${request.nextUrl.origin}/account`,
      })

      if (!session.url) {
        throw new Error('No portal URL returned from Stripe')
      }

      logger.info({ customerId: customer.id }, 'Stripe customer portal session created')
      return NextResponse.json({ url: session.url }, { headers: getRateLimitHeaders(clientIp) })
    } catch (portalError: any) {
      // Common error: billing portal not configured
      if (portalError?.code === 'resource_missing' || 
          portalError?.message?.includes('billing portal') ||
          portalError?.message?.includes('No configuration provided') ||
          portalError?.message?.includes('test mode default configuration')) {
        logger.error({ error: portalError, customerId: customer.id }, 'Stripe Billing Portal not configured')
        const isTestMode = config.stripe.secretKey.startsWith('sk_test_')
        const portalUrl = isTestMode 
          ? 'https://dashboard.stripe.com/test/settings/billing/portal'
          : 'https://dashboard.stripe.com/settings/billing/portal'
        
        return NextResponse.json(
          {
            error: `Stripe Billing Portal is not configured. Please configure it in your Stripe Dashboard (Test Mode). Visit: ${portalUrl}`,
            portalUrl: portalUrl,
            needsConfiguration: true,
          },
          { status: 500, headers: getRateLimitHeaders(clientIp) }
        )
      }
      throw portalError
    }
  } catch (error: any) {
    logger.error({ error }, 'Error creating portal session')
    return NextResponse.json(
      { error: error.message || 'Failed to create portal session' },
      { status: 500, headers: getRateLimitHeaders(clientIp) }
    )
  }
}



