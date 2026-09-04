'use client'

import { startTransition, useCallback, useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Alert from '@/components/ui/Alert'
import Spinner from '@/components/ui/Spinner'
import StampCard from '@/components/customer/StampCard'
import BusinessVisual from '@/components/branding/BusinessVisual'
import { CheckCircle } from '@phosphor-icons/react'
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
          const parsed = JSON.parse(stored)
          if (parsed && parsed.id) {
            setCustomer(parsed)
            setFlowState('stamping')
            return
          }
          setFlowState('login')
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

    let res: Response
    try {
      res = await fetch('/api/customer/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: digits,
          business_id: bizId,
          ...(qrToken ? { qr_token: qrToken } : {}),
        }),
      })
    } catch {
      setPhoneError('Network error. Please try again.')
      setLoadingIdentify(false)
      return
    }

    try {
      const data = await res.json()
      if (!res.ok) {
        setPhoneError(data.error || 'Failed to identify customer')
        return
      }

      // Case 1: New customer needing name/onboarding
      if (data.isNew || data.needsName) {
        setFlowState('name')
        return
      }

      // Case 2: Returning customer who scanned valid QR and is ready to stamp
      if (data.readyToStamp) {
        const sessionData = {
          id: data.customer_id || data.customer?.id,
          phone: digits,
          name: data.name || data.customer?.name || '',
          ...(data.customer?.customer_token ? { customer_token: data.customer.customer_token } : {}),
        }
        if (sessionData.id) {
          localStorage.setItem('customer_session', JSON.stringify(sessionData))
          setCustomer(sessionData)
          setFlowState('stamping')
        } else {
          setPhoneError('Something went wrong. Please try again.')
        }
        return
      }

      // Case 3: Returning customer without valid QR (cannot auto recover)
      if (data.message) {
        setPhoneError(data.message)
        return
      }

      // Fallback if data.customer exists
      if (data.customer && data.customer.id) {
        const c = data.customer
        localStorage.setItem('customer_session', JSON.stringify({
          id: c.id,
          phone: c.phone || digits,
          customer_token: c.customer_token,
          name: c.name || '',
        }))
        setCustomer(c)
        setFlowState('stamping')
        return
      }

      setPhoneError('Something went wrong. Please try again.')
    } catch {
      setPhoneError('Something went wrong. Please try again.')
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

    const digits = phone.replace(/\D/g, '').replace(/^91/, '')
    let res: Response
    try {
      res = await fetch('/api/customer/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: digits,
          name: name.trim(),
          business_id: bizId,
          ...(qrToken ? { qr_token: qrToken } : {}),
        }),
      })
    } catch {
      setNameError('Network error. Please try again.')
      setLoadingIdentify(false)
      return
    }

    try {
      const data = await res.json()
      if (!res.ok) {
        setNameError(data.error || 'Failed to create customer account')
        return
      }

      const c = data.customer || {
        id: data.customer_id,
        phone: digits,
        name: name.trim(),
        customer_token: data.customer_token,
      }

      if (c && c.id) {
        localStorage.setItem('customer_session', JSON.stringify({
          id: c.id,
          phone: c.phone || digits,
          customer_token: c.customer_token,
          name: c.name || name.trim(),
        }))
        setCustomer(c)
        setFlowState('stamping')
      } else {
        setNameError('Something went wrong. Please try again.')
      }
    } catch {
      setNameError('Something went wrong. Please try again.')
    } finally {
      setLoadingIdentify(false)
    }
  }

  if (flowState === 'loading' || loadingStamp) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-100 is-dot-grid">
        <div className="text-center space-y-3">
          <Spinner size="md" className="mx-auto text-amber-500" />
          <p className="text-zinc-300 text-xs font-medium">
            {loadingStamp ? 'Adding your loyalty stamp...' : 'Connecting to counter...'}
          </p>
        </div>
      </div>
    )
  }

  const visitsRemaining =
    business && cardState ? Math.max(0, business.stamps_required - cardState.card_stamps) : 0

  return (
    <div className="min-h-screen bg-zinc-950 p-4 flex flex-col items-center justify-center text-zinc-100 is-dot-grid">
      <div className="w-full max-w-sm">
        {business && flowState !== 'success' && (
          <div className="text-center mb-6 flex flex-col items-center">
            <BusinessVisual
              logoUrl={business.branding?.logo_url}
              emoji={business.emoji}
              name={business.name}
              className="text-3xl mb-2"
            />
            <h1 className="text-lg font-semibold tracking-tight text-zinc-100">{business.name}</h1>
            <p className="text-xs text-zinc-400 mt-0.5">Earn: {business.reward}</p>
          </div>
        )}

        {flowState === 'login' && (
          <div className="bg-zinc-900/60 rounded-xl p-6 border border-zinc-800 space-y-4 shadow-xs backdrop-blur-xs">
            <div>
              <h2 className="text-sm font-semibold text-zinc-200">Collect Your Stamp</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Enter your mobile number to check in.</p>
            </div>
            <Input
              label="Mobile Number"
              placeholder="9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleContinue()}
              error={phoneError}
              inputMode="numeric"
              maxLength={10}
              autoFocus
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
          <div className="bg-zinc-900/60 rounded-xl p-6 border border-zinc-800 space-y-4 shadow-xs backdrop-blur-xs">
            <div>
              <h2 className="text-sm font-semibold text-zinc-200">Welcome! What is your name?</h2>
              <p className="text-xs text-zinc-400 mt-0.5">First visit — just your name to get started.</p>
            </div>
            <Input
              label="Your Name"
              placeholder="Rahul Sharma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              error={nameError}
              autoFocus
            />
            <Button onClick={handleJoin} loading={loadingIdentify} size="sm" className="w-full">
              Join &amp; Collect Stamp →
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
          <div className="space-y-3">
            {/* Compact Stamp Earned Pill */}
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 flex items-center justify-between text-xs shadow-xs">
              <div className="flex items-center gap-2">
                <CheckCircle size={16} weight="fill" className="text-emerald-400 shrink-0" />
                <span className="font-semibold text-emerald-300">Stamp added</span>
              </div>
              <span className="text-zinc-400 text-[11px]">
                {visitsRemaining === 0
                  ? 'Reward unlocked!'
                  : `${visitsRemaining} ${visitsRemaining === 1 ? 'visit' : 'visits'} to reward`}
              </span>
            </div>

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
              hideRewardDetails={business.hide_reward_details}
            />

            <Button
              onClick={() => {
                const token = customer?.customer_token
                if (token) {
                  router.push(`/card/${token}?biz=${bizId}`)
                } else if (accessGrant) {
                  router.push(`/api/customer/grant-exchange?grant=${accessGrant}&bizId=${bizId}`)
                } else {
                  router.push('/cards')
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
