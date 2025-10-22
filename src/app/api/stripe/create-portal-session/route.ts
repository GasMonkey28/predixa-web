import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

export async function POST(request: NextRequest) {
  try {
    // For now, we'll create a customer if one doesn't exist
    // In production, you'd link this to the authenticated user
    const customer = await stripe.customers.create({
      email: 'user@example.com', // Replace with actual user email
    })

    const session = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: `${request.nextUrl.origin}/account`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Error creating portal session:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}



