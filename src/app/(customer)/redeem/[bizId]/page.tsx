'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import { Gift, CheckCircle } from '@phosphor-icons/react'

export default function RedeemPage() {
  const { bizId } = useParams<{ bizId: string }>()
  const router = useRouter()
  const [code, setCode] = useState('')
  const [reward, setReward] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const toCard = () => {
    try {
      const s = localStorage.getItem('customer_session')
      const token = s ? JSON.parse(s).customer_token : null
      if (token) router.push(`/card/${token}?biz=${bizId}`)
      else router.push('/cards')
    } catch {
      router.push('/cards')
    }
  }

  useEffect(() => {
    const stored = localStorage.getItem('customer_session')
    if (!stored) {
      router.push(`/scan/${bizId}`)
      return
    }
    const session = JSON.parse(stored)

    fetch('/api/stamp/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_id: session.id, business_id: bizId, customer_token: session.customer_token }),
    })
      .then((r) => r.json())
      .then(async (data) => {
        if (!data.success) {
          setError(data.error || 'Failed to redeem reward')
          return
        }
        setCode(data.code)
        setReward(data.reward)

        const bizData = await fetch(`/api/business/public?bizId=${bizId}`).then((r) => r.json())
        setBusinessName(bizData.business?.name ?? '')
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false))
  }, [bizId, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-100 is-dot-grid">
        <Spinner size="lg" className="text-amber-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 text-zinc-100 is-dot-grid">
        <div className="text-center max-w-sm space-y-4">
          <p className="text-rose-400 text-sm">{error}</p>
          <Button onClick={toCard} size="sm">Back to Card</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 text-zinc-100 is-dot-grid">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto is-reward-glow">
          <Gift size={32} weight="duotone" />
        </div>

        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-amber-400 flex items-center justify-center gap-1.5">
            <CheckCircle size={20} weight="fill" className="text-emerald-400" />
            <span>Reward redeemed</span>
          </h1>
          {businessName && (
            <p className="text-xs text-zinc-400">{businessName}</p>
          )}
        </div>
        
        <div>
          <p className="text-2xl font-bold text-zinc-100 tracking-tight">{reward}</p>
          <p className="text-xs text-zinc-400 mt-1">Show this redemption code to staff at the counter</p>
        </div>

        {/* Voucher Ticket Box */}
        <div className="border border-dashed border-amber-500/40 bg-zinc-900/60 rounded-xl p-5 shadow-xs relative">
          <p className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">Redemption Code</p>
          <p className="text-3xl font-mono font-bold text-amber-400 tracking-widest selection:bg-amber-500 selection:text-zinc-950">{code}</p>
        </div>

        <Button onClick={() => router.push('/cards')} variant="secondary" size="sm" className="w-full">
          Back to My Cards
        </Button>
      </div>
    </div>
  )
}
