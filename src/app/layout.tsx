import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'IntelliStamp — Smart Loyalty Stamps',
  description: 'The smart loyalty stamp platform for modern businesses',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-950 text-white">
        {children}
      </body>
    </html>
  )
}
