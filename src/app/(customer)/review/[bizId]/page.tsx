'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Spinner from '@/components/ui/Spinner'
import Button from '@/components/ui/Button'
import type { Business } from '@/types'

function getSessionToken(): { customerId: string | null; customerToken: string | null } {
  try {
    const s = localStorage.getItem('customer_session')
    if (!s) return { customerId: null, customerToken: null }
    const parsed = JSON.parse(s)
    return { customerId: parsed.id ?? null, customerToken: parsed.customer_token ?? null }
  } catch {
    return { customerId: null, customerToken: null }
  }
}

export default function ReviewPage() {
  const { bizId } = useParams<{ bizId: string }>()
  const router = useRouter()
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [gmbClicked, setGmbClicked] = useState(false)

  const { customerId, customerToken } = getSessionToken()

  const toCard = () => {
    if (customerToken) router.push(`/card/${customerToken}?biz=${bizId}`)
    else router.push('/cards')
  }

  useEffect(() => {
    if (!customerId) {
      router.push(`/scan/${bizId}`)
      return
    }
    fetch(`/api/business/public?bizId=${bizId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.business?.gmb_link) {
          toCard()
          return
        }
        setBusiness(data.business)
      })
      .catch(() => toCard())
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bizId, customerId, router])

  const handleGmbClick = () => {
    if (business?.gmb_link) {
      window.open(business.gmb_link, '_blank')
      setTimeout(() => setGmbClicked(true), 800)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-100">
      <Spinner size="lg" />
    </div>
  )

  if (!business) return null

  return (
    <div className="min-h-screen bg-zinc-950 p-4 flex flex-col items-center justify-center text-zinc-100">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Earn a Bonus Stamp ⭐</h1>
          <p className="text-xs text-zinc-400 mt-1">Leave a Google review and show staff at the counter.</p>
        </div>

        <div className="bg-zinc-900/50 rounded-lg p-6 border border-zinc-800 space-y-4 shadow-xs">
          <div className="text-center space-y-1">
            <div className="text-2xl">⭐⭐⭐⭐⭐</div>
            <div className="text-base font-semibold text-zinc-100">{business.emoji} {business.name}</div>
          </div>

          <p className="text-xs text-zinc-400 text-center leading-relaxed">
            Enjoying your experience? A quick Google review helps{' '}
            <span className="text-zinc-200 font-medium">{business.name}</span> reach more customers.
            Staff will add a bonus stamp once they verify your review.
          </p>

          <Button
            onClick={handleGmbClick}
            variant="outline"
            size="sm"
            className="w-full"
          >
            Leave Review on Google →
          </Button>

          {gmbClicked && (
            <div className="rounded-md bg-zinc-850/80 border border-zinc-800 p-3 text-center space-y-1 text-xs">
              <p className="text-emerald-400 font-medium">Review link opened ✓</p>
              <p className="text-zinc-400 text-[11px]">
                Show your posted review to staff to receive your bonus stamp.
              </p>
            </div>
          )}
        </div>

        <button
          onClick={toCard}
          className="text-xs text-zinc-500 hover:text-zinc-300 w-full text-center py-1 cursor-pointer"
        >
          Skip — go to my cards
        </button>
      </div>
    </div>
  )
}
