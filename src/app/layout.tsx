import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ToastProvider } from '@/components/ui/Toast'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'IntelliStamp — Smart Loyalty Stamps',
  description: 'The smart loyalty stamp platform for modern businesses',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <body className="min-h-screen font-sans antialiased bg-bg text-text">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
