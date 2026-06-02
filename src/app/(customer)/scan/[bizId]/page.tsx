'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Alert from '@/components/ui/Alert'
import Spinner from '@/components/ui/Spinner'
import StampCard from '@/components/customer/StampCard'
import { generateToken } from '@/lib/token'
import type { Business, StampCardState } from '@/types'

type FlowState = 'loading' | 'login' | 'otp' | 'stamping' | 'success' | 'error' | 'cooldown'

export default function ScanPage() {
  const { bizId } = useParams<{ bizId: string }>()
  const router = useRouter()

  const [flowState, setFlowState] = useState<FlowState>('loading')
  const [business, setBusiness] = useState<Business | null>(null)
  const [customer, setCustomer] = useState<{ id: string; phone: string; customer_token?: string; name?: string } | null>(null)
  const [cardState, setCardState] = useState<StampCardState | null>(null)
  const [newStampIndex, setNewStampIndex] = useState<number | undefined>()

  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [otpError, setOtpError] = useState('')
  const [loadingOtp, setLoadingOtp] = useState(false)
  const [loadingVerify, setLoadingVerify] = useState(false)
  const [loadingStamp, setLoadingStamp] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [toast, setToast] = useState('')
  const [cooldownHours, setCooldownHours] = useState(0)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  // Load business
  useEffect(() => {
    fetch(`/api/business/get?bizId=${bizId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.business) setBusiness(data.business)
        else setFlowState('error')
      })
      .catch(() => setFlowState('error'))
  }, [bizId])

  // Check session
  useEffect(() => {
    if (!business) return
    const stored = localStorage.getItem('customer_session')
    if (stored) {
      try {
        const session = JSON.parse(stored)
        setCustomer(session)
        setFlowState('stamping')
      } catch {
        setFlowState('login')
      }
    } else {
      setFlowState('login')
    }
  }, [business])

  // Auto-stamp when customer is set and flow is stamping
  useEffect(() => {
    if (flowState === 'stamping' && customer && business) {
      doStamp()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowState, customer])

  const doStamp = async () => {
    if (!customer || !business) return
    setLoadingStamp(true)
    try {
      const token = generateToken(bizId, 0)
      const res = await fetch('/api/stamp/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customer.id,
          business_id: bizId,
          token,
          type: 'regular',
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 429) {
          setCooldownHours(data.cooldown_hours ?? 4)
          setFlowState('cooldown')
        } else {
          setErrorMsg(data.error || 'Failed to stamp')
          setFlowState('error')
        }
        return
      }
      setCardState(data.card_state)
      setNewStampIndex(data.card_state.card_stamps - 1)
      setFlowState('success')
      showToast('Stamp added! 🎉')
    } catch {
      setErrorMsg('Network error. Please try again.')
      setFlowState('error')
    } finally {
      setLoadingStamp(false)
    }
  }

  const handleSendOtp = async () => {
    setPhoneError('')
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setPhoneError('Enter a valid 10-digit Indian mobile number')
      return
    }
    setLoadingOtp(true)
    try {
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })
      const data = await res.json()
      if (!res.ok) {
        setPhoneError(data.error)
        return
      }
      if (data.otp) showToast(`Dev OTP: ${data.otp}`)
      setFlowState('otp')
    } catch {
      setPhoneError('Network error. Please try again.')
    } finally {
      setLoadingOtp(false)
    }
  }

  const handleVerifyOtp = async () => {
    setOtpError('')
    if (otp.length !== 4) {
      setOtpError('Enter the 4-digit OTP')
      return
    }
    setLoadingVerify(true)
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp }),
      })
      const data = await res.json()
      if (!res.ok) {
        setOtpError(data.error)
        return
      }
      localStorage.setItem('customer_session', JSON.stringify({ id: data.customer.id, phone: data.customer.phone, customer_token: data.customer.customer_token }))
      setCustomer(data.customer)
      if (data.isNewCustomer) {
        router.push(`/profile?bizId=${bizId}&token=${data.customer.customer_token}`)
        return
      }
      setFlowState('stamping')
    } catch {
      setOtpError('Network error. Please try again.')
    } finally {
      setLoadingVerify(false)
    }
  }

  if (flowState === 'loading' || loadingStamp) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="text-zinc-400 mt-4">
            {loadingStamp ? 'Issuing your stamp...' : 'Loading...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-4 flex flex-col items-center justify-center">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-full font-semibold z-50 animate-bounce">
          {toast}
        </div>
      )}

      <div className="w-full max-w-md">
        {business && (
          <div className="text-center mb-6">
            <div className="text-4xl mb-1">{business.emoji}</div>
            <h1 className="text-xl font-black text-white">{business.name}</h1>
          </div>
        )}

        {flowState === 'login' && (
          <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 space-y-4">
            <h2 className="text-lg font-bold text-white">Enter your phone to collect a stamp</h2>
            <Input
              label="Phone Number"
              placeholder="9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              error={phoneError}
              inputMode="numeric"
              maxLength={10}
            />
            <Button onClick={handleSendOtp} loading={loadingOtp} className="w-full">
              Get OTP →
            </Button>
          </div>
        )}

        {flowState === 'otp' && (
          <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 space-y-4">
            <h2 className="text-lg font-bold text-white">Enter OTP</h2>
            <p className="text-sm text-zinc-400">Sent to +91 {phone}</p>
            <Input
              label="4-digit OTP"
              placeholder="1234"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              error={otpError}
              inputMode="numeric"
              maxLength={4}
            />
            <Button onClick={handleVerifyOtp} loading={loadingVerify} className="w-full">
              Verify OTP →
            </Button>
            <button
              onClick={() => setFlowState('login')}
              className="text-sm text-zinc-500 hover:text-zinc-300 w-full text-center"
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
                if (token) router.push(`/card/${token}?biz=${bizId}`)
              }}
            />
            <Button
              onClick={() => {
                const token = customer?.customer_token
                if (token) router.push(`/card/${token}?biz=${bizId}`)
              }}
              variant="outline"
              className="w-full"
            >
              View My Card
            </Button>
          </div>
        )}

        {flowState === 'cooldown' && (
          <Alert
            type="warning"
            message={`You already collected a stamp recently. Next stamp available in ${cooldownHours}h.`}
          />
        )}

        {flowState === 'error' && (
          <div className="space-y-4">
            <Alert type="error" message={errorMsg || 'Something went wrong. Please try again.'} />
            <Button onClick={() => setFlowState('login')} variant="secondary" className="w-full">
              Try Again
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
