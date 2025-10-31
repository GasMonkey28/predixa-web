import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getOrCreateStripeCustomer } from '@/lib/stripe-helpers'

export async function GET(request: NextRequest) {
  try {
    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY is not configured')
      return NextResponse.json(null)
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    })

    // Get userId from query params as fallback
    const userId = request.nextUrl.searchParams.get('userId')
    
    // Get or create Stripe customer for the authenticated user
    let customer = await getOrCreateStripeCustomer(request)
    
    // Fallback: if cookie extraction fails, try using userId from query params
    if (!customer && userId) {
      console.log('Cookie extraction failed, using userId from query:', userId)
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
      console.log('No customer found for subscription fetch')
      return NextResponse.json(null)
    }

    // Get the customer's subscriptions - get most recent first
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'all',
      limit: 10, // Get more to find the most recent
      expand: ['data.latest_invoice']
    })

    if (subscriptions.data.length === 0) {
      console.log('No subscriptions found for customer:', customer.id)
      return NextResponse.json(null)
    }

    // Sort by created date (most recent first) and get the first one
    const sortedSubscriptions = subscriptions.data.sort((a, b) => b.created - a.created)
    const subscription = sortedSubscriptions[0]
    
    console.log('Found subscription:', {
      id: subscription.id,
      status: subscription.status,
      customer: customer.id,
      created: new Date(subscription.created * 1000).toISOString()
    })
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
        productName = product?.name || 'Pro Plan'
      } catch (productError) {
        console.error('Error fetching product:', productError)
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

    return NextResponse.json(subscriptionData)
  } catch (error: any) {
    console.error('Error fetching subscription:', error)
    // Return null instead of error to avoid breaking the UI
    // The UI already handles null subscriptions gracefully
    return NextResponse.json(null)
  }
}



