import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

export async function POST(request: NextRequest) {
  try {
    // For testing, use the same test email as checkout
    const testEmail = 'test@example.com'

    // Find the Stripe customer by email
    const customers = await stripe.customers.list({
      email: testEmail,
      limit: 1
    })

    if (customers.data.length === 0) {
      return NextResponse.json({ error: 'No Stripe customer found. Please create a subscription first.' }, { status: 404 })
    }

    const customer = customers.data[0]

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



