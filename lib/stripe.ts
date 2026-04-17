const UNLOCK_KEY = 'vhess_unlocked'

export function checkUnlocked(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(UNLOCK_KEY) === 'true'
}

export function setUnlocked(): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(UNLOCK_KEY, 'true')
}

export async function redirectToCheckout(): Promise<void> {
  const res = await fetch('/api/stripe/checkout', { method: 'POST' })
  if (!res.ok) {
    console.error('Checkout request failed:', res.status)
    return
  }
  const data = (await res.json()) as { url?: string }
  if (data.url) window.location.href = data.url
}
