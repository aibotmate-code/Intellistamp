'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { Business } from '@/types'

interface CardItem {
  business_id: string
  business: Business
  total_stamps: number
  card_stamps: number
  cards_completed: number
  cards_redeemed: number
}

type FlowState = 'loading' | 'phone' | 'cards' | 'not_found'

export default function CardsPage() {
  const [flow, setFlow] = useState<FlowState>('loading')
  const [phone, setPhone] = useState('')
  const [phoneLoading, setPhoneLoading] = useState(false)
  const [phoneError, setPhoneError] = useState('')
  const [cards, setCards] = useState<CardItem[]>([])
  const [customerToken, setCustomerToken] = useState<string | null>(null)

  const loadCards = async (customerId: string) => {
    const res = await fetch(`/api/customer/profile?customerId=${customerId}`)
    if (!res.ok) {
      setFlow('not_found')
      return
    }
    const data = await res.json()
    if (data.cards) setCards(data.cards)
    if (data.customer?.customer_token) setCustomerToken(data.customer.customer_token)
    setFlow('cards')
  }

  useEffect(() => {
    const stored = localStorage.getItem('customer_session')
    if (!stored) {
      queueMicrotask(() => setFlow('phone'))
      return
    }
    const session = JSON.parse(stored) as { id: string; phone: string; customer_token?: string }
    queueMicrotask(() => loadCards(session.id))
  }, [])

  const handlePhoneLookup = async () => {
    setPhoneError('')
    const digits = phone.replace(/\D/g, '').replace(/^91/, '')
    if (digits.length !== 10) {
      setPhoneError('Enter a valid 10-digit mobile number')
      return
    }
    setPhoneLoading(true)
    try {
      const res = await fetch(`/api/customer/profile?phone=${digits}`)
      if (res.status === 404) {
        setFlow('not_found')
        return
      }
      if (!res.ok) {
        setPhoneError('Something went wrong. Try again.')
        return
      }
      const data = await res.json()
      localStorage.setItem('customer_session', JSON.stringify({
        id: data.customer.id,
        phone: digits,
        customer_token: data.customer.customer_token,
      }))
      if (data.cards) setCards(data.cards)
      if (data.customer?.customer_token) setCustomerToken(data.customer.customer_token)
      setFlow('cards')
    } catch {
      setPhoneError('Network error. Try again.')
    } finally {
      setPhoneLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('customer_session')
    setCards([])
    setCustomerToken(null)
    setPhone('')
    setFlow('phone')
  }

  if (flow === 'loading') {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-full max-w-md px-4 space-y-4">
          <div className="h-8 w-48 bg-zinc-800 rounded animate-pulse mb-6" />
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-24 w-full bg-zinc-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (flow === 'phone') {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">💳</div>
            <h1 className="text-2xl font-black text-white">View My Cards</h1>
            <p className="text-zinc-400 text-sm mt-1">Enter your mobile number to see your loyalty cards</p>
          </div>

          <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Mobile Number</label>
              <input
                type="tel"
                inputMode="numeric"
                placeholder="9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePhoneLookup()}
                className="w-full bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 transition-colors"
              />
            </div>
            {phoneError && <p className="text-sm text-red-400">{phoneError}</p>}
            <button
              onClick={handlePhoneLookup}
              disabled={phoneLoading}
              className="w-full bg-yellow-400 text-black font-bold py-3 px-6 rounded-xl hover:bg-yellow-300 transition-colors disabled:opacity-60"
            >
              {phoneLoading ? 'Looking up…' : 'View My Cards →'}
            </button>
            <p className="text-center text-xs text-zinc-500">
              New here? Scan a business QR code to get started.
            </p>
          </div>

          <div className="text-center mt-4 flex flex-col items-center gap-1.5">
            <Link href="/login" className="text-xs text-zinc-500 hover:text-zinc-300">🏪 Business Login</Link>
            <Link href="/" className="text-xs text-zinc-600 hover:text-zinc-400">← Back to home</Link>
          </div>
        </div>
      </div>
    )
  }

  if (flow === 'not_found') {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">🔍</div>
          <h2 className="text-xl font-black text-white mb-2">No account found</h2>
          <p className="text-zinc-400 text-sm mb-6">
            We couldn&apos;t find loyalty cards for this number. Scan a business QR code first to create your account.
          </p>
          <button
            onClick={() => { setFlow('phone'); setPhone('') }}
            className="text-yellow-400 text-sm hover:underline mr-4"
          >
            Try again
          </button>
          <Link href="/login" className="text-zinc-400 text-sm hover:text-zinc-200 mr-4">🏪 Business Login</Link>
          <Link href="/" className="text-zinc-500 text-sm hover:text-zinc-300">← Home</Link>
        </div>
      </div>
    )
  }

  // flow === 'cards'
  return (
    <div className="min-h-screen bg-zinc-950 p-4">
      <div className="max-w-md mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">My Loyalty Cards</h1>
            <p className="text-sm text-zinc-400">Tap a card to view details</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-zinc-500 hover:text-zinc-300"
          >
            Logout
          </button>
        </div>

        {cards.length === 0 ? (
          <div className="text-center py-12 text-zinc-400">
            <p className="text-5xl mb-4">💳</p>
            <p className="font-semibold text-base text-white">No loyalty cards yet</p>
            <p className="text-sm mt-1">Scan a business QR code to get started</p>
            <Link
              href="/"
              className="mt-4 inline-block text-sm font-medium text-yellow-400 hover:underline"
            >
              Back to home →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {cards.map((card) => {
              const { business, card_stamps, cards_completed, cards_redeemed } = card
              const redeemable = cards_completed > (cards_redeemed ?? 0)
              const segCount = business.stamps_required

              return (
                <Link
                  key={card.business_id}
                  href={customerToken ? `/card/${customerToken}?biz=${card.business_id}` : '#'}
                  className="block bg-zinc-900 rounded-2xl p-4 border border-zinc-800 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{business.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white truncate">{business.name}</p>
                      <p className="text-xs text-zinc-400">
                        Free {business.reward} after {business.stamps_required} stamps
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-2xl font-black text-yellow-400">
                        {card_stamps}/{business.stamps_required}
                      </p>
                      {cards_completed > 0 && (
                        <p className="text-xs text-green-400">{cards_completed}x completed</p>
                      )}
                    </div>
                  </div>

                  {/* Segmented progress bar */}
                  <div className="mt-3 flex gap-[2px]">
                    {Array.from({ length: segCount }).map((_, i) => (
                      <div
                        key={i}
                        className="h-1.5 flex-1 rounded-full"
                        style={{ background: i < card_stamps ? '#facc15' : '#27272a' }}
                      />
                    ))}
                  </div>

                  {redeemable && (
                    <p className="text-xs font-semibold mt-2 text-yellow-400">🎁 Ready to redeem!</p>
                  )}
                </Link>
              )
            })}
          </div>
        )}

        <Link
          href="/scanner"
          className="mt-6 flex items-center justify-center gap-2 border-2 border-dashed border-zinc-800 rounded-2xl p-5 text-zinc-500 hover:border-zinc-700 hover:text-zinc-400 transition-colors"
        >
          <span className="text-xl">📷</span>
          <span className="font-medium">Scan a new business</span>
        </Link>
      </div>
    </div>
  )
}
