import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getCurrentUser } from 'aws-amplify/auth'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

export async function POST(request: NextRequest) {
  try {
    const { priceId } = await request.json()

    // Get the current Cognito user
    let cognitoUser
    try {
      cognitoUser = await getCurrentUser()
    } catch (error) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
    }

    // Check if customer already exists in Stripe
    let customer
    const existingCustomers = await stripe.customers.list({
      email: cognitoUser.signInDetails?.loginId,
      limit: 1
    })

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0]
    } else {
      // Create new Stripe customer linked to Cognito user
      customer = await stripe.customers.create({
        email: cognitoUser.signInDetails?.loginId,
        metadata: {
          cognito_user_id: cognitoUser.userId,
          platform: 'web'
        }
      })
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: customer.id,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${request.nextUrl.origin}/account?success=true`,
      cancel_url: `${request.nextUrl.origin}/account?canceled=true`,
    })

    return NextResponse.json({ sessionId: session.id })
  } catch (error: any) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}



