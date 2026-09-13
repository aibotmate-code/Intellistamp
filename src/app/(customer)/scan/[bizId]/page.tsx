'use client'

import { startTransition, useCallback, useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Alert from '@/components/ui/Alert'
import Spinner from '@/components/ui/Spinner'
import StampCard from '@/components/customer/StampCard'
import BusinessVisual from '@/components/branding/BusinessVisual'
import { resolveBrandingColors } from '@/lib/branding/palette'
import { CheckCircle } from '@phosphor-icons/react'
import type { Business, StampCardState } from '@/types'

type FlowState = 'loading' | 'login' | 'name' | 'waiting_approval' | 'approval_timeout' | 'stamping' | 'success' | 'error' | 'cooldown'

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
  const [checkinId, setCheckinId] = useState<string | null>(null)
  const [phoneError, setPhoneError] = useState('')
  const [nameError, setNameError] = useState('')
  const [loadingIdentify, setLoadingIdentify] = useState(false)
  const [loadingStamp, setLoadingStamp] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [cooldownHours, setCooldownHours] = useState(0)

  // Load business
  useEffect(() => {
    fetch(`/api/business/public?bizId=${bizId}`, { cache: 'no-store' })
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
            if (!business.dynamic_qr_enabled && business.staff_pin_enabled) {
              setFlowState('waiting_approval')
            } else {
              setFlowState('stamping')
            }
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

  const activeBranding = business?.branding
  const isBrandingEnabled = !!(activeBranding && activeBranding.is_enabled !== false)
  const resolved = resolveBrandingColors(activeBranding, isBrandingEnabled)
  const targetBizId = business?.id || bizId

  const doStamp = useCallback(async () => {
    if (!customer || !business) return
    setLoadingStamp(true)
    try {
      const res = await fetch('/api/stamp/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customer.id,
          business_id: targetBizId,
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
  }, [customer, business, targetBizId, qrToken])

  useEffect(() => {
    if (flowState === 'stamping' && customer && business) {
      const timer = setTimeout(() => {
        doStamp()
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [flowState, customer, business, doStamp])

  // Mode C: Initiate check-in request when in waiting_approval
  useEffect(() => {
    if (flowState !== 'waiting_approval' || !customer || !business || checkinId) return

    let cancelled = false

    const initiateCheckin = async () => {
      try {
        const res = await fetch('/api/customer/checkin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            business_id: targetBizId,
            customer_id: customer.id,
            phone: customer.phone,
            name: customer.name,
          }),
        })
        const data = await res.json()
        if (!cancelled && data.checkin_id) {
          setCheckinId(data.checkin_id)
        }
      } catch {
        // non-critical
      }
    }

    initiateCheckin()

    return () => {
      cancelled = true
    }
  }, [flowState, customer, business, targetBizId, checkinId])

  // Mode C: Poll for approval status (stops after 24 attempts / 60 seconds)
  useEffect(() => {
    if (flowState !== 'waiting_approval' || !checkinId) return

    const MAX_POLLS = 24 // 24 * 2.5s = 60s
    let pollCount = 0

    const pollStatus = async () => {
      try {
        const res = await fetch(`/api/customer/checkin-status?checkinId=${checkinId}&businessId=${targetBizId}`)
        const data = await res.json()
        if (data.status === 'approved') {
          setCardState(data.card_state)
          setNewStampIndex(data.new_stamp_index ?? data.card_state.card_stamps - 1)
          if (data.reward_result) {
            try {
              sessionStorage.setItem('intellistamp_pending_reward', JSON.stringify(data.reward_result))
            } catch {}
          }
          if (data.access_grant) {
            setAccessGrant(data.access_grant)
          }
          setFlowState('success')
          return
        }

        pollCount += 1
        if (pollCount >= MAX_POLLS) {
          setFlowState('approval_timeout')
        }
      } catch {
        // continue polling until timeout
      }
    }

    pollStatus()
    const timer = setInterval(pollStatus, 2500)
    return () => clearInterval(timer)
  }, [flowState, checkinId, targetBizId])

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
          business_id: targetBizId,
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
          if (!business?.dynamic_qr_enabled && business?.staff_pin_enabled) {
            setFlowState('waiting_approval')
          } else {
            setFlowState('stamping')
          }
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
        if (!business?.dynamic_qr_enabled && business?.staff_pin_enabled) {
          setFlowState('waiting_approval')
        } else {
          setFlowState('stamping')
        }
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
          business_id: targetBizId,
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
        if (!business?.dynamic_qr_enabled && business?.staff_pin_enabled) {
          setFlowState('waiting_approval')
        } else {
          setFlowState('stamping')
        }
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
    <div className="min-h-screen bg-zinc-950 p-4 flex flex-col items-center justify-center text-zinc-100 is-dot-grid relative overflow-hidden">
      {/* Subtle ambient merchant background layer if configured */}
      {isBrandingEnabled && resolved.card_background_image_url && (
        <>
          <div
            className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url(${resolved.card_background_image_url})`,
            }}
            aria-hidden="true"
          />
          <div
            className="fixed inset-0 pointer-events-none z-0 bg-zinc-950/85 backdrop-blur-xs"
            style={{
              backgroundColor: activeBranding?.background_color
                ? `${activeBranding.background_color}D9`
                : 'rgba(9, 9, 11, 0.88)',
            }}
            aria-hidden="true"
          />
        </>
      )}

      <div className="w-full max-w-sm relative z-10">
        {business && flowState !== 'success' && (
          <div className="text-center mb-6 flex flex-col items-center">
            <BusinessVisual
              logoUrl={business.branding?.logo_url}
              emoji={business.emoji}
              name={business.name}
              className="mx-auto"
            />
            <h1 className="text-lg font-semibold tracking-tight text-zinc-100">{business.name}</h1>
            <p className="text-xs text-zinc-400 mt-0.5">Earn: {business.reward}</p>
          </div>
        )}

        {flowState === 'login' && (
          <div
            className="rounded-xl p-6 border space-y-4 shadow-xs backdrop-blur-md transition-colors"
            style={{
              backgroundColor: isBrandingEnabled ? resolved.surface_color : 'rgba(24, 24, 27, 0.6)',
              borderColor: isBrandingEnabled ? resolved.empty_stamp_border_color : '#27272a',
            }}
          >
            <div>
              <h2
                className="text-sm font-semibold"
                style={{ color: isBrandingEnabled ? resolved.card_text_color : undefined }}
              >
                Collect Your Stamp
              </h2>
              <p
                className="text-xs mt-0.5"
                style={{ color: isBrandingEnabled ? resolved.card_muted_text_color : undefined }}
              >
                Enter your mobile number to check in.
              </p>
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
            <Button
              onClick={handleContinue}
              loading={loadingIdentify}
              size="sm"
              className="w-full transition-opacity hover:opacity-90"
              style={isBrandingEnabled ? {
                backgroundColor: resolved.primary_color,
                color: resolved.text_on_primary,
                borderColor: 'transparent',
              } : undefined}
            >
              Continue →
            </Button>
            <button
              onClick={() => router.push(`/recover/${targetBizId}`)}
              className="text-xs text-zinc-500 hover:text-zinc-300 w-full text-center py-1 cursor-pointer"
            >
              Already enrolled? Recover my card
            </button>
          </div>
        )}

        {flowState === 'name' && (
          <div
            className="rounded-xl p-6 border space-y-4 shadow-xs backdrop-blur-md transition-colors"
            style={{
              backgroundColor: isBrandingEnabled ? resolved.surface_color : 'rgba(24, 24, 27, 0.6)',
              borderColor: isBrandingEnabled ? resolved.empty_stamp_border_color : '#27272a',
            }}
          >
            <div>
              <h2
                className="text-sm font-semibold"
                style={{ color: isBrandingEnabled ? resolved.card_text_color : undefined }}
              >
                Welcome! What is your name?
              </h2>
              <p
                className="text-xs mt-0.5"
                style={{ color: isBrandingEnabled ? resolved.card_muted_text_color : undefined }}
              >
                First visit — just your name to get started.
              </p>
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
            <Button
              onClick={handleJoin}
              loading={loadingIdentify}
              size="sm"
              className="w-full transition-opacity hover:opacity-90"
              style={isBrandingEnabled ? {
                backgroundColor: resolved.primary_color,
                color: resolved.text_on_primary,
                borderColor: 'transparent',
              } : undefined}
            >
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

        {flowState === 'waiting_approval' && (
          <div
            className="rounded-xl p-6 border space-y-4 shadow-xs backdrop-blur-md transition-colors text-center"
            style={{
              backgroundColor: isBrandingEnabled ? resolved.surface_color : 'rgba(24, 24, 27, 0.6)',
              borderColor: isBrandingEnabled ? resolved.empty_stamp_border_color : '#27272a',
            }}
          >
            <div>
              <h2
                className="text-base font-semibold"
                style={{ color: isBrandingEnabled ? resolved.card_text_color : undefined }}
              >
                Waiting for Staff Approval
              </h2>
              <p
                className="text-xs mt-1 text-zinc-400"
                style={{ color: isBrandingEnabled ? resolved.card_muted_text_color : undefined }}
              >
                Check-in received for +91 {customer?.phone}. Please let the staff member know at the counter to approve your visit.
              </p>
            </div>

            <div className="flex items-center justify-center py-4">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
                <Spinner size="sm" />
                <span>Waiting for counter approval...</span>
              </div>
            </div>

            <button
              onClick={() => {
                localStorage.removeItem('customer_session')
                setCustomer(null)
                setCheckinId(null)
                setFlowState('login')
              }}
              className="text-xs text-zinc-500 hover:text-zinc-300 w-full text-center py-1 cursor-pointer"
            >
              ← Change mobile number
            </button>
          </div>
        )}

        {flowState === 'approval_timeout' && (
          <div
            className="rounded-xl p-6 border space-y-4 shadow-xs backdrop-blur-md transition-colors text-center"
            style={{
              backgroundColor: isBrandingEnabled ? resolved.surface_color : 'rgba(24, 24, 27, 0.6)',
              borderColor: isBrandingEnabled ? resolved.empty_stamp_border_color : '#27272a',
            }}
          >
            <div>
              <h2
                className="text-base font-semibold text-zinc-100"
                style={{ color: isBrandingEnabled ? resolved.card_text_color : undefined }}
              >
                Approval Timed Out
              </h2>
              <p
                className="text-xs mt-1 text-zinc-400"
                style={{ color: isBrandingEnabled ? resolved.card_muted_text_color : undefined }}
              >
                We haven&apos;t received approval yet. If you are still at the counter, tap below to check again or ask staff directly.
              </p>
            </div>

            <Button
              onClick={() => {
                setFlowState('waiting_approval')
              }}
              size="sm"
              className="w-full"
              style={isBrandingEnabled ? {
                backgroundColor: resolved.primary_color,
                color: resolved.text_on_primary,
              } : undefined}
            >
              Check Again
            </Button>

            <button
              onClick={() => {
                localStorage.removeItem('customer_session')
                setCustomer(null)
                setCheckinId(null)
                setFlowState('login')
              }}
              className="text-xs text-zinc-500 hover:text-zinc-300 w-full text-center py-1 cursor-pointer"
            >
              ← Change mobile number
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
                  router.push(`/card/${token}?biz=${targetBizId}`)
                } else if (accessGrant) {
                  router.push(`/api/customer/grant-exchange?grant=${accessGrant}&bizId=${targetBizId}`)
                }
              }}
              businessBranding={business.branding}
              hideRewardDetails={business.hide_reward_details}
              hiddenRewardText={business.branding?.hidden_reward_text}
            />

            <Button
              onClick={() => {
                const token = customer?.customer_token
                if (token) {
                  router.push(`/card/${token}?biz=${targetBizId}`)
                } else if (accessGrant) {
                  router.push(`/api/customer/grant-exchange?grant=${accessGrant}&bizId=${targetBizId}`)
                } else {
                  router.push('/cards')
                }
              }}
              size="sm"
              className="w-full transition-opacity hover:opacity-90"
              style={isBrandingEnabled ? {
                backgroundColor: resolved.primary_color,
                color: resolved.text_on_primary,
                borderColor: 'transparent',
              } : undefined}
            >
              View My Loyalty Card →
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

        <div className="mt-8 text-center relative z-10">
          <p className="text-[11px] text-zinc-500 flex items-center justify-center gap-1.5">
            <span>Powered by</span>
            <span className="font-medium text-zinc-400">IntelliStamp</span>
          </p>
        </div>
      </div>
    </div>
  )
}
