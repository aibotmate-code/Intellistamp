'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'

export default function RedeemPage() {
  const { bizId } = useParams<{ bizId: string }>()
  const router = useRouter()
  const [code, setCode] = useState('')
  const [reward, setReward] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
      body: JSON.stringify({ customer_id: session.id, business_id: bizId }),
    })
      .then((r) => r.json())
      .then(async (data) => {
        if (!data.success) {
          setError(data.error || 'Failed to redeem')
          return
        }
        setCode(data.code)
        setReward(data.reward)

        const bizData = await fetch(`/api/business/get?bizId=${bizId}`).then((r) => r.json())
        setBusinessName(bizData.business?.name ?? '')
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false))
  }, [bizId, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <Button onClick={() => router.push(`/card/${bizId}`)}>Back to Card</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="text-7xl animate-bounce">🎁</div>
        <h1 className="text-4xl font-black text-yellow-400">REWARD UNLOCKED!</h1>
        <p className="text-zinc-300 font-medium">{businessName}</p>
        <p className="text-2xl font-bold text-white">{reward}</p>
        <p className="text-zinc-400">Show this to the staff to claim your reward</p>

        <div className="border-2 border-dashed border-yellow-400 rounded-2xl p-6 animate-glow">
          <p className="text-xs text-zinc-400 mb-2">Redemption Code</p>
          <p className="text-4xl font-black text-yellow-400 tracking-widest">{code}</p>
        </div>

        <Button onClick={() => router.push('/cards')} variant="secondary" className="w-full">
          Back to Cards
        </Button>
      </div>
    </div>
  )
}
