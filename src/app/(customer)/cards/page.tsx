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
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
        {/* Skeleton: title + 3 card rows */}
        <div className="w-full max-w-md px-4 space-y-4">
          <div className="skeleton h-8 w-48 mb-6" />
          {[1, 2, 3].map((n) => (
            <div key={n} className="skeleton h-24 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 page-enter" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-md mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1
              className="text-3xl text-white"
              style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.02em' }}
            >
              MY LOYALTY CARDS
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Tap a business to view your card
            </p>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem('customer_session')
              router.push('/')
            }}
            className="btn btn-ghost text-xs"
            style={{ color: 'var(--color-text-dim)' }}
          >
            Logout
          </button>
        </div>

        {cards.length === 0 ? (
          <div className="text-center py-12 page-enter" style={{ color: 'var(--color-text-muted)' }}>
            <p className="text-5xl mb-4">💳</p>
            <p className="font-semibold text-base" style={{ color: 'var(--color-text)' }}>
              No loyalty cards yet
            </p>
            <p className="text-sm mt-1">Scan a business QR code to get started</p>
            <Link
              href="/"
              className="mt-4 inline-block text-sm font-medium hover:underline"
              style={{ color: 'var(--color-gold)' }}
            >
              Discover businesses →
            </Link>
          </div>
        ) : (
          <div className="stagger-children space-y-3">
            {cards.map((card) => {
              const { business, card_stamps, cards_completed, cards_redeemed } = card
              const redeemable = cards_completed > (cards_redeemed ?? 0)
              const progress = (card_stamps / business.stamps_required) * 100
              const segCount = business.stamps_required

              return (
                <Link
                  key={card.business_id}
                  href={`/card/${card.business_id}`}
                  className="card-interactive block rounded-2xl p-4 border"
                  style={{
                    background: 'var(--color-surface)',
                    borderColor: 'var(--color-border)',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{business.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate" style={{ color: 'var(--color-text)' }}>
                        {business.name}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        Free {business.reward} after {business.stamps_required} stamps
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p
                        className="text-2xl"
                        style={{ fontFamily: 'var(--font-display)', color: 'var(--color-gold)' }}
                      >
                        {card_stamps}/{business.stamps_required}
                      </p>
                      {cards_completed > 0 && (
                        <p className="text-xs" style={{ color: 'var(--color-green)' }}>
                          {cards_completed}x redeemed
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Segmented progress bar */}
                  <div className="mt-3 flex gap-[2px]">
                    {Array.from({ length: segCount }).map((_, i) => (
                      <div
                        key={i}
                        className="h-1.5 flex-1 rounded-full progress-fill"
                        style={{
                          background: i < card_stamps ? 'var(--color-gold)' : 'var(--color-elevated)',
                          transitionDelay: `${i * 30}ms`,
                        }}
                      />
                    ))}
                  </div>

                  {redeemable && (
                    <p className="text-xs font-semibold mt-2" style={{ color: 'var(--color-gold)' }}>
                      🎁 Ready to redeem!
                    </p>
                  )}
                </Link>
              )
            })}
          </div>
        )}

        <Link
          href="/"
          className="btn mt-6 flex items-center justify-center gap-2 border-2 border-dashed rounded-2xl p-5 transition-colors"
          style={{
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-muted)',
          }}
        >
          <span className="text-xl">+</span>
          <span className="font-medium">Scan a new business</span>
        </Link>
      </div>
    </div>
  )
}
