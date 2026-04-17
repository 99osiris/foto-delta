import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const Stripe = (await import('stripe')).default
  const stripe  = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-03-25.dahlia',
  })

  const body = await req.text()
  const sig  = req.headers.get('stripe-signature')

  if (!sig) return new NextResponse('Missing stripe-signature header', { status: 400 })

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    return new NextResponse('Webhook signature invalid', { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    console.log('Payment confirmed:', (event.data.object as any).customer_email)
  }

  return NextResponse.json({ received: true })
}
