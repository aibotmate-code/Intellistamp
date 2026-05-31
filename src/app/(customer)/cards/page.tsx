'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Spinner from '@/components/ui/Spinner'
import type { Business } from '@/types'

interface CardItem {
  business_id: string
  business: Business
  total_stamps: number
  card_stamps: number
  cards_completed: number
  cards_redeemed: number
}

export default function CardsPage() {
  const router = useRouter()
  const [cards, setCards] = useState<CardItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('customer_session')
    if (!stored) {
      router.push('/')
      return
    }
    const session = JSON.parse(stored)

    fetch(`/api/customer/profile?customerId=${session.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.cards) setCards(data.cards)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-4">
      <div className="max-w-md mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">MY LOYALTY CARDS</h1>
            <p className="text-zinc-400 text-sm">Tap a business to view your card</p>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem('customer_session')
              router.push('/')
            }}
            className="text-xs text-zinc-500 hover:text-zinc-300"
          >
            Logout
          </button>
        </div>

        {cards.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">
            <p className="text-4xl mb-3">💳</p>
            <p className="font-medium text-white">No loyalty cards yet</p>
            <p className="text-sm mt-1">Scan a business QR code to get started</p>
            <Link href="/" className="mt-4 inline-block text-yellow-400 hover:underline text-sm">
              Discover businesses →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {cards.map((card) => {
              const { business, card_stamps, cards_completed, cards_redeemed } = card
              const redeemable = cards_completed > (cards_redeemed ?? 0)
              const progress = (card_stamps / business.stamps_required) * 100

              return (
                <Link
                  key={card.business_id}
                  href={`/card/${card.business_id}`}
                  className="block bg-zinc-900 rounded-2xl p-4 border border-zinc-800 hover:border-zinc-600 transition-colors"
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
                      <p className="text-xl font-black text-yellow-400">
                        {card_stamps}/{business.stamps_required}
                      </p>
                      {cards_completed > 0 && (
                        <p className="text-xs text-green-400">{cards_completed}x redeemed</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  {redeemable && (
                    <p className="text-xs text-yellow-400 font-semibold mt-1.5">🎁 Ready to redeem!</p>
                  )}
                </Link>
              )
            })}
          </div>
        )}

        <Link
          href="/"
          className="mt-6 flex items-center justify-center gap-2 border-2 border-dashed border-zinc-700 rounded-2xl p-5 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <span className="text-xl">+</span>
          <span className="font-medium">Scan a new business</span>
        </Link>
      </div>
    </div>
  )
}
