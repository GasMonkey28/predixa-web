import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getOrCreateStripeCustomer } from '@/lib/stripe-helpers'
import { config } from '@/lib/server/config'

export async function POST(request: NextRequest) {
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
      console.log('Cookie extraction failed, using userId from request:', userId)
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
      return NextResponse.json({ 
        error: 'User authentication required. Please sign in and try again.',
        debug: 'No customer found and no userId provided'
      }, { status: 401 })
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

      return NextResponse.json({ url: session.url })
    } catch (portalError: any) {
      // Common error: billing portal not configured
      if (portalError?.code === 'resource_missing' || 
          portalError?.message?.includes('billing portal') ||
          portalError?.message?.includes('No configuration provided') ||
          portalError?.message?.includes('test mode default configuration')) {
        console.error('Stripe Billing Portal not configured:', portalError.message)
        const isTestMode = config.stripe.secretKey.startsWith('sk_test_')
        const portalUrl = isTestMode 
          ? 'https://dashboard.stripe.com/test/settings/billing/portal'
          : 'https://dashboard.stripe.com/settings/billing/portal'
        
        return NextResponse.json({ 
          error: `Stripe Billing Portal is not configured. Please configure it in your Stripe Dashboard (Test Mode). Visit: ${portalUrl}`,
          portalUrl: portalUrl,
          needsConfiguration: true
        }, { status: 500 })
      }
      throw portalError
    }
  } catch (error: any) {
    console.error('Error creating portal session:', error)
    return NextResponse.json({ error: error.message || 'Failed to create portal session' }, { status: 500 })
  }
}



