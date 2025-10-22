import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

export async function GET() {
  try {
    // For now, return null (no subscription)
    // In production, you'd fetch the user's subscription based on their customer ID
    return NextResponse.json(null)
  } catch (error: any) {
    console.error('Error fetching subscription:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}



