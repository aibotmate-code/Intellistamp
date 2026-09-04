'use client'

import { startTransition, use, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import Alert from '@/components/ui/Alert'
import StampCard from '@/components/customer/StampCard'
import { SocialLinks } from '@/components/customer/SocialLinks'
import { ArrowLeft, Trophy, Camera, Gift } from '@phosphor-icons/react'
import type { Business, MilestoneWithStatus, RewardResult } from '@/types'

interface CardState {
  total_stamps: number
  card_stamps: number
  cards_completed: number
  cards_redeemed: number
  redeemable: boolean
}

interface PageParams {
  params: Promise<{ customerToken: string }>
}

// Key used by scan page to pass the last stamp's reward_result across navigation
const REWARD_KEY = 'intellistamp_pending_reward'

export default function CardPage({ params }: PageParams) {
  const { customerToken } = use(params)
  const searchParams = useSearchParams()
  const bizId = searchParams.get('biz')
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [business, setBusiness] = useState<Business | null>(null)
  const [cardState, setCardState] = useState<CardState | null>(null)
  const [milestones, setMilestones] = useState<MilestoneWithStatus[]>([])
  const [rewardResult, setRewardResult] = useState<RewardResult | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!bizId) {
      router.push('/cards')
      return
    }

    // Read & clear any pending reward result left by the scan page
    try {
      const raw = sessionStorage.getItem(REWARD_KEY)
      if (raw) {
        startTransition(() => setRewardResult(JSON.parse(raw) as RewardResult))
        sessionStorage.removeItem(REWARD_KEY)
      }
    } catch {
      sessionStorage.removeItem(REWARD_KEY)
    }

    // Parallel: customer+card state  AND  active milestones list
    Promise.all([
      fetch(`/api/customer/by-token?token=${customerToken}&bizId=${bizId}`).then((r) => r.json()),
      fetch(`/api/milestones/${bizId}`).then((r) => r.json()),
    ])
      .then(([tokenData, milestonesData]) => {
        if (tokenData.error) {
          setError(tokenData.error)
          return
        }
        if (tokenData.business) setBusiness(tokenData.business as Business)
        if (tokenData.card_state) setCardState(tokenData.card_state)

        // Fetch per-customer milestone status (earned / visits_remaining)
        if (tokenData.customer?.id) {
          const hasMilestones = (milestonesData.milestones?.length ?? 0) > 0
          if (hasMilestones) {
            fetch(`/api/milestones/customer/${tokenData.customer.id}/${bizId}`)
              .then((r) => r.json())
              .then((msData) => {
                if (msData.milestones) setMilestones(msData.milestones)
              })
              .catch(() => {})
          }
        }
      })
      .catch(() => setError('Failed to load card data'))
      .finally(() => setLoading(false))
  }, [customerToken, bizId, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-100 is-dot-grid">
        <Spinner size="lg" className="text-amber-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-4 text-zinc-100 page-enter">
      <div className="max-w-md mx-auto py-2">
        <Link
          href="/cards"
          className="inline-flex items-center gap-1.5 text-xs mb-4 text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft size={12} />
          <span>Back to my cards</span>
        </Link>

        {error && <Alert type="error" message={error} className="mb-4" />}

        {business && cardState && (
          <div className="space-y-4">
            <StampCard
              stampsRequired={business.stamps_required}
              cardStamps={cardState.card_stamps}
              businessName={business.name}
              businessEmoji={business.emoji}
              reward={business.reward}
              redeemable={cardState.redeemable}
              milestones={milestones}
              rewardResult={rewardResult}
              totalVisits={cardState.total_stamps}
              onClaim={() => router.push(`/redeem/${bizId}`)}
              businessBranding={business.branding}
              hideRewardDetails={business.hide_reward_details}
            />

            {cardState.cards_redeemed > 0 && (
              <p className="text-center text-xs font-medium text-emerald-400 flex items-center justify-center gap-1.5">
                <Trophy size={14} weight="duotone" />
                <span>{cardState.cards_redeemed}x reward{cardState.cards_redeemed > 1 ? 's' : ''} redeemed</span>
              </p>
            )}

            <Button
              onClick={() => router.push('/scanner')}
              variant="outline"
              size="sm"
              className="w-full flex items-center justify-center gap-2"
            >
              <Camera size={16} />
              <span>Scan QR to Stamp</span>
            </Button>

            {cardState.redeemable && (
              <Button
                onClick={() => router.push(`/redeem/${bizId}`)}
                size="sm"
                className="w-full flex items-center justify-center gap-2"
              >
                <Gift size={16} weight="fill" />
                <span>Claim Your Reward</span>
              </Button>
            )}

            <SocialLinks links={business.social_links} />
          </div>
        )}

        {!cardState && !error && (
          <div className="text-center py-12 bg-zinc-900/40 rounded-xl border border-zinc-800 p-6 space-y-3">
            <p className="text-sm text-zinc-400">
              No card found for this business.
            </p>
            <Button onClick={() => router.push('/scanner')} size="sm">
              Scan to Enroll
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
