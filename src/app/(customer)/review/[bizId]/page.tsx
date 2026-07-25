'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Spinner from '@/components/ui/Spinner'
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
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  )

  if (!business) return null

  return (
    <div className="min-h-screen bg-zinc-950 p-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="w-3 h-3 rounded-full bg-yellow-400" />
          ))}
        </div>

        <div className="text-center">
          <h1 className="text-3xl font-black text-white">EARN A BONUS STAMP ⭐</h1>
          <p className="text-zinc-400 mt-1">Leave a Google review and ask staff to add your bonus stamp.</p>
        </div>

        <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 space-y-4">
          <div className="text-center">
            <div className="text-4xl mb-1">⭐⭐⭐⭐⭐</div>
            <div className="text-2xl font-black text-white">{business.emoji} {business.name}</div>
          </div>

          <p className="text-sm text-zinc-400 text-center leading-relaxed">
            Enjoying your experience? A quick Google review helps{' '}
            <span className="text-white font-medium">{business.name}</span> reach more customers like you.
            Takes 30 seconds — and staff will add a bonus stamp once they see your review.
          </p>

          <button
            onClick={handleGmbClick}
            className="w-full border-2 border-green-500 text-green-400 font-semibold py-3 px-4 rounded-xl hover:bg-green-500/10 transition-colors flex items-center justify-center gap-2"
          >
            Leave a Review on Google →
          </button>

          {gmbClicked && (
            <div className="rounded-xl bg-zinc-800 border border-zinc-700 p-4 text-center space-y-1">
              <p className="text-sm text-zinc-300 font-medium">Review opened ✅</p>
              <p className="text-xs text-zinc-500">
                Once you&apos;ve posted your review, show staff and they&apos;ll add your bonus stamp at the counter.
              </p>
            </div>
          )}
        </div>

        <button
          onClick={toCard}
          className="text-sm text-zinc-500 hover:text-zinc-300 w-full text-center"
        >
          Skip — go to my cards
        </button>
      </div>
    </div>
  )
}
