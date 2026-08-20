'use client'

import { startTransition, useCallback, useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Alert from '@/components/ui/Alert'
import Spinner from '@/components/ui/Spinner'
import StampCard from '@/components/customer/StampCard'
import type { Business, StampCardState } from '@/types'

type FlowState = 'loading' | 'login' | 'name' | 'stamping' | 'success' | 'error' | 'cooldown'

export default function ScanPage() {
  const { bizId } = useParams<{ bizId: string }>()
  const searchParams = useSearchParams()
  const qrToken = searchParams.get('t') || searchParams.get('token')
  const router = useRouter()

  const [flowState, setFlowState] = useState<FlowState>('loading')
  const [business, setBusiness] = useState<Business | null>(null)
  const [customer, setCustomer] = useState<{ id: string; phone: string; customer_token?: string; name?: string } | null>(null)
  const [cardState, setCardState] = useState<StampCardState | null>(null)
  const [newStampIndex, setNewStampIndex] = useState<number | undefined>()
  const [accessGrant, setAccessGrant] = useState<string | null>(null)

  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [nameError, setNameError] = useState('')
  const [loadingIdentify, setLoadingIdentify] = useState(false)
  const [loadingStamp, setLoadingStamp] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [cooldownHours, setCooldownHours] = useState(0)

  // Load business
  useEffect(() => {
    fetch(`/api/business/public?bizId=${bizId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.business) setBusiness(data.business)
        else setFlowState('error')
      })
      .catch(() => setFlowState('error'))
  }, [bizId])

  // Check existing session
  useEffect(() => {
    if (!business) return
    const stored = localStorage.getItem('customer_session')
    startTransition(() => {
      if (stored) {
        try {
          setCustomer(JSON.parse(stored))
          setFlowState('stamping')
        } catch {
          setFlowState('login')
        }
      } else {
        setFlowState('login')
      }
    })
  }, [business])

  const doStamp = useCallback(async () => {
    if (!customer || !business) return
    setLoadingStamp(true)
    try {
      const res = await fetch('/api/stamp/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customer.id,
          business_id: bizId,
          token: qrToken,
          type: 'regular',
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 429) {
          setCooldownHours(data.cooldown_hours ?? 4)
          setFlowState('cooldown')
        } else {
          setErrorMsg(data.error || 'Failed to issue stamp')
          setFlowState('error')
        }
        return
      }
      setCardState(data.card_state)
      setNewStampIndex(data.card_state.card_stamps - 1)
      if (data.reward_result) {
        try {
          sessionStorage.setItem('intellistamp_pending_reward', JSON.stringify(data.reward_result))
        } catch {
          // ignore
        }
      }
      if (data.access_grant) {
        setAccessGrant(data.access_grant)
      }
      setFlowState('success')
    } catch {
      setErrorMsg('Network error. Please try again.')
      setFlowState('error')
    } finally {
      setLoadingStamp(false)
    }
  }, [customer, business, bizId, qrToken])

  useEffect(() => {
    if (flowState === 'stamping' && customer && business) {
      const timer = setTimeout(() => {
        doStamp()
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [flowState, customer, business, doStamp])

  const handleContinue = async () => {
    setPhoneError('')
    const digits = phone.replace(/\D/g, '').replace(/^91/, '')
    if (digits.length !== 10) {
      setPhoneError('Enter a valid 10-digit mobile number')
      return
    }
    setLoadingIdentify(true)
    try {
      const res = await fetch('/api/customer/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: digits, business_id: bizId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setPhoneError(data.error || 'Failed to identify customer')
        return
      }
      if (data.is_new) {
        setFlowState('name')
        return
      }
      const c = data.customer
      localStorage.setItem('customer_session', JSON.stringify({
        id: c.id,
        phone: c.phone,
        customer_token: c.customer_token,
        name: c.name,
      }))
      setCustomer(c)
      setFlowState('stamping')
    } catch {
      setPhoneError('Network error. Please try again.')
    } finally {
      setLoadingIdentify(false)
    }
  }

  const handleJoin = async () => {
    setNameError('')
    if (!name.trim() || name.length < 2) {
      setNameError('Please enter your name')
      return
    }
    setLoadingIdentify(true)
    try {
      const digits = phone.replace(/\D/g, '').replace(/^91/, '')
      const res = await fetch('/api/customer/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: digits, name: name.trim(), business_id: bizId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setNameError(data.error || 'Failed to create customer account')
        return
      }
      const c = data.customer
      localStorage.setItem('customer_session', JSON.stringify({
        id: c.id,
        phone: c.phone,
        customer_token: c.customer_token,
        name: c.name,
      }))
      setCustomer(c)
      setFlowState('stamping')
    } catch {
      setNameError('Network error. Please try again.')
    } finally {
      setLoadingIdentify(false)
    }
  }

  if (flowState === 'loading' || loadingStamp) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-100">
        <div className="text-center">
          <Spinner size="md" className="mx-auto mb-3" />
          <p className="text-zinc-400 text-xs">
            {loadingStamp ? 'Adding your loyalty stamp...' : 'Loading...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-4 flex flex-col items-center justify-center text-zinc-100">
      <div className="w-full max-w-sm">
        {business && (
          <div className="text-center mb-6">
            <div className="text-3xl mb-1">{business.emoji}</div>
            <h1 className="text-lg font-semibold tracking-tight text-zinc-100">{business.name}</h1>
          </div>
        )}

        {flowState === 'login' && (
          <div className="bg-zinc-900/50 rounded-lg p-6 border border-zinc-800 space-y-4 shadow-xs">
            <div>
              <h2 className="text-sm font-semibold text-zinc-200">Collect Loyalty Stamp</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Enter your mobile number to add your stamp.</p>
            </div>
            <Input
              label="Mobile Number"
              placeholder="9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              error={phoneError}
              inputMode="numeric"
              maxLength={10}
            />
            <Button onClick={handleContinue} loading={loadingIdentify} size="sm" className="w-full">
              Continue →
            </Button>
            <button
              onClick={() => router.push(`/recover/${bizId}`)}
              className="text-xs text-zinc-500 hover:text-zinc-300 w-full text-center py-1 cursor-pointer"
            >
              Already enrolled? Recover my card
            </button>
          </div>
        )}

        {flowState === 'name' && (
          <div className="bg-zinc-900/50 rounded-lg p-6 border border-zinc-800 space-y-4 shadow-xs">
            <div>
              <h2 className="text-sm font-semibold text-zinc-200">Welcome! What&apos;s your name?</h2>
              <p className="text-xs text-zinc-400 mt-0.5">First visit — just your name to get started.</p>
            </div>
            <Input
              label="Your Name"
              placeholder="Rahul Sharma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={nameError}
              autoFocus
            />
            <Button onClick={handleJoin} loading={loadingIdentify} size="sm" className="w-full">
              Join &amp; Get Stamp →
            </Button>
            <button
              onClick={() => setFlowState('login')}
              className="text-xs text-zinc-500 hover:text-zinc-300 w-full text-center py-1 cursor-pointer"
            >
              ← Change number
            </button>
          </div>
        )}

        {flowState === 'success' && business && cardState && (
          <div className="space-y-4">
            <StampCard
              stampsRequired={business.stamps_required}
              cardStamps={cardState.card_stamps}
              businessName={business.name}
              businessEmoji={business.emoji}
              reward={business.reward}
              newStampIndex={newStampIndex}
              redeemable={cardState.redeemable}
              onClaim={() => {
                const token = customer?.customer_token
                if (token) {
                  router.push(`/card/${token}?biz=${bizId}`)
                } else if (accessGrant) {
                  router.push(`/api/customer/grant-exchange?grant=${accessGrant}&bizId=${bizId}`)
                }
              }}
              businessBranding={business.branding}
            />
            <Button
              onClick={() => {
                const token = customer?.customer_token
                if (token) {
                  router.push(`/card/${token}?biz=${bizId}`)
                } else if (accessGrant) {
                  router.push(`/api/customer/grant-exchange?grant=${accessGrant}&bizId=${bizId}`)
                }
              }}
              variant="outline"
              size="sm"
              className="w-full"
            >
              View My Loyalty Card
            </Button>
          </div>
        )}

        {flowState === 'cooldown' && (
          <div className="space-y-4">
            <Alert
              type="warning"
              message={`You already collected a stamp recently. Next stamp available in ${cooldownHours}h.`}
            />
            <Button onClick={() => router.push('/cards')} variant="secondary" size="sm" className="w-full">
              View My Cards
            </Button>
          </div>
        )}

        {flowState === 'error' && (
          <div className="space-y-4">
            <Alert type="error" message={errorMsg || 'Something went wrong. Please try again.'} />
            <Button onClick={() => setFlowState('login')} variant="secondary" size="sm" className="w-full">
              Try Again
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
