import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FOTO — Delta',
  description: 'VHS & Digicam filters',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
