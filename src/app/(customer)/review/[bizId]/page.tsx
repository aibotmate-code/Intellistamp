'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import type { Business } from '@/types'

export default function ReviewPage() {
  const { bizId } = useParams<{ bizId: string }>()
  const router = useRouter()
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [gmbClicked, setGmbClicked] = useState(false)
  const [claimLoading, setClaimLoading] = useState(false)
  const [claimed, setClaimed] = useState(false)

  const customerId = (() => {
    try {
      const s = localStorage.getItem('customer_session')
      return s ? JSON.parse(s).id : null
    } catch { return null }
  })()

  useEffect(() => {
    if (!customerId) {
      router.push(`/scan/${bizId}`)
      return
    }
    fetch(`/api/business/get?bizId=${bizId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.business?.gmb_link) {
          router.push(`/card/${bizId}`)
          return
        }
        setBusiness(data.business)

        // Check if already claimed
        fetch(`/api/customer/profile?customerId=${customerId}`)
          .then((r) => r.json())
          .then((custData) => {
            const enrollment = custData.cards?.find(
              (c: { business_id: string; review_claimed: boolean }) => c.business_id === bizId
            )
            if (enrollment?.review_claimed) {
              router.push(`/card/${bizId}`)
            }
          })
      })
      .catch(() => router.push(`/card/${bizId}`))
      .finally(() => setLoading(false))
  }, [bizId, customerId, router])

  const handleGmbClick = () => {
    if (business?.gmb_link) {
      window.open(business.gmb_link, '_blank')
      setTimeout(() => setGmbClicked(true), 800)
    }
  }

  const handleClaim = async () => {
    if (!customerId) return
    setClaimLoading(true)
    try {
      const token = (await import('@/lib/token')).generateToken(bizId, 0)
      const res = await fetch('/api/stamp/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customerId,
          business_id: bizId,
          token,
          type: 'bonus_review',
        }),
      })
      const data = await res.json()
      if (data.success) {
        setClaimed(true)
        setTimeout(() => router.push(`/card/${bizId}`), 1500)
      }
    } catch {
      // ignore
    } finally {
      setClaimLoading(false)
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
        {/* Step dots */}
        <div className="flex justify-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="w-3 h-3 rounded-full bg-yellow-400" />
          ))}
        </div>

        <div className="text-center">
          <h1 className="text-3xl font-black text-white">YOU&apos;RE IN! 🎉</h1>
          <p className="text-zinc-400 mt-1">Your loyalty card is ready. One small favour first...</p>
        </div>

        <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 space-y-4">
          <div className="text-center">
            <div className="text-4xl mb-1">⭐⭐⭐⭐⭐</div>
            <div className="text-2xl font-black text-white">{business.emoji} {business.name}</div>
          </div>

          <p className="text-sm text-zinc-400 text-center leading-relaxed">
            Enjoying your experience? A quick Google review helps{' '}
            <span className="text-white font-medium">{business.name}</span> reach more customers like you.
            Takes 30 seconds.
          </p>

          <button
            onClick={handleGmbClick}
            className="w-full border-2 border-green-500 text-green-400 font-semibold py-3 px-4 rounded-xl hover:bg-green-500/10 transition-colors flex items-center justify-center gap-2"
          >
            Share Your Experience on Google →
          </button>

          {gmbClicked && !claimed && (
            <div className="space-y-3">
              <p className="text-center text-sm text-zinc-400">
                Review opened! Come back here after you&apos;re done ✅
              </p>
              <button
                onClick={handleClaim}
                disabled={claimLoading}
                className="w-full bg-yellow-400 text-black font-bold py-4 px-6 rounded-xl text-lg hover:bg-yellow-300 transition-colors animate-glow disabled:opacity-50"
              >
                {claimLoading ? '...' : '🎁 As a Thank You — Claim Bonus Stamp'}
              </button>
            </div>
          )}

          {claimed && (
            <div className="text-center text-green-400 font-semibold py-2">
              Bonus stamp added to {business.name}! 🎁 Redirecting...
            </div>
          )}
        </div>

        <button
          onClick={() => router.push(`/card/${bizId}`)}
          className="text-sm text-zinc-500 hover:text-zinc-300 w-full text-center"
        >
          Skip — go to my cards
        </button>
      </div>
    </div>
  )
}
