'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import Alert from '@/components/ui/Alert'
import StampCard from '@/components/customer/StampCard'
import type { Business } from '@/types'

interface CardData {
  total_stamps: number
  card_stamps: number
  cards_completed: number
  cards_redeemed: number
  redeemable: boolean
}

export default function CardPage() {
  const { bizId } = useParams<{ bizId: string }>()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [business, setBusiness] = useState<Business | null>(null)
  const [cardData, setCardData] = useState<CardData | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem('customer_session')
    if (!stored) {
      router.push(`/scan/${bizId}`)
      return
    }

    const session = JSON.parse(stored)

    Promise.all([
      fetch(`/api/business/get?bizId=${bizId}`).then((r) => r.json()),
      fetch(`/api/customer/profile?customerId=${session.id}`).then((r) => r.json()),
    ])
      .then(([bizData, custData]) => {
        if (bizData.business) setBusiness(bizData.business)
        if (custData.cards) {
          const card = custData.cards.find((c: { business_id: string }) => c.business_id === bizId)
          if (card) {
            setCardData({
              total_stamps: card.total_stamps,
              card_stamps: card.card_stamps,
              cards_completed: card.cards_completed,
              cards_redeemed: card.cards_redeemed ?? 0,
              redeemable: card.cards_completed > (card.cards_redeemed ?? 0),
            })
          }
        }
      })
      .catch(() => setError('Failed to load card data'))
      .finally(() => setLoading(false))
  }, [bizId, router])

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
        <Link href="/cards" className="flex items-center gap-2 text-zinc-400 hover:text-white mb-6 text-sm">
          ← Back to my cards
        </Link>

        {error && <Alert type="error" message={error} className="mb-4" />}

        {business && cardData && (
          <div className="space-y-4">
            <StampCard
              stampsRequired={business.stamps_required}
              cardStamps={cardData.card_stamps}
              businessName={business.name}
              businessEmoji={business.emoji}
              reward={business.reward}
              redeemable={cardData.redeemable}
              onClaim={() => router.push(`/redeem/${bizId}`)}
            />

            {cardData.cards_redeemed > 0 && (
              <p className="text-center text-green-400 text-sm">
                🏆 {cardData.cards_redeemed}x redeemed
              </p>
            )}

            <Button
              onClick={() => router.push(`/scan/${bizId}`)}
              variant="outline"
              className="w-full"
            >
              📱 Scan QR to Stamp
            </Button>

            {cardData.redeemable && (
              <Button
                onClick={() => router.push(`/redeem/${bizId}`)}
                className="w-full"
              >
                🎁 Claim Your Reward
              </Button>
            )}
          </div>
        )}

        {!cardData && !error && (
          <div className="text-center py-12">
            <p className="text-zinc-400">No card found for this business.</p>
            <Button onClick={() => router.push(`/scan/${bizId}`)} className="mt-4">
              Scan to enroll
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
