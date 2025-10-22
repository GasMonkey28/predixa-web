import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getCurrentUser } from 'aws-amplify/auth'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

export async function GET() {
  try {
    // Get the current Cognito user
    let cognitoUser
    try {
      cognitoUser = await getCurrentUser()
    } catch (error) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
    }

    // Find Stripe customer by Cognito user ID
    const customers = await stripe.customers.list({
      email: cognitoUser.signInDetails?.loginId,
      limit: 1
    })

    if (customers.data.length === 0) {
      return NextResponse.json(null)
    }

    const customer = customers.data[0]

    // Get active subscriptions for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 1
    })

    if (subscriptions.data.length === 0) {
      return NextResponse.json(null)
    }

    const subscription = subscriptions.data[0]
    const price = subscription.items.data[0].price

    return NextResponse.json({
      id: subscription.id,
      status: subscription.status,
      current_period_end: subscription.current_period_end,
      plan: {
        id: price.id,
        name: price.nickname || 'Subscription',
        amount: price.unit_amount,
        interval: price.recurring?.interval
      }
    })
  } catch (error: any) {
    console.error('Error fetching subscription:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}



