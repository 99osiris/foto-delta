import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST() {
  const Stripe = (await import('stripe')).default
  const stripe  = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-03-25.dahlia',
  })

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
      success_url: process.env.NEXT_PUBLIC_URL + '/editor?unlocked=true',
      cancel_url:  process.env.NEXT_PUBLIC_URL + '/editor',
    })
    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Stripe checkout error:', err)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
