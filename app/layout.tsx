import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FOTO — Analog filter',
  description: 'VHS and digicam filters for photos and videos. Runs in your browser.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#0a0a0a', overflow: 'hidden' }}>
        {children}
      </body>
    </html>
  )
}
