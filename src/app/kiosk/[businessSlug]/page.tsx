'use client'

import { use, useEffect, useRef, useState } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Spinner from '@/components/ui/Spinner'
import type { Business } from '@/types'
import {
  MagnifyingGlass,
  Trophy,
  Gift,
  Star,
  HourglassMedium,
  Warning,
  LockKey,
  ArrowRight,
} from '@phosphor-icons/react'

type KioskState = 'loading' | 'not_found' | 'pin' | 'ready' | 'stamping' | 'success' | 'cooldown' | 'error'

interface PageParams {
  params: Promise<{ businessSlug: string }>
}

export default function KioskPage({ params }: PageParams) {
  const { businessSlug } = use(params)

  const [kioskState, setKioskState] = useState<KioskState>('loading')
  const [business, setBusiness] = useState<Business | null>(null)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [phone, setPhone] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [resultMsg, setResultMsg] = useState('')
  const [cooldownHours, setCooldownHours] = useState(0)

  // GMB review state
  const [currentCustomerId, setCurrentCustomerId] = useState<string | null>(null)
  const [reviewClaimed, setReviewClaimed] = useState(false)
  const [gmbClicked, setGmbClicked] = useState(false)
  const [bonusLoading, setBonusLoading] = useState(false)
  const [bonusDone, setBonusDone] = useState(false)
  const [bonusCardStamps, setBonusCardStamps] = useState<number | null>(null)

  const pinBtnRef = useRef<HTMLButtonElement>(null)
  const phoneInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`/api/business/public?slug=${businessSlug}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.business) {
          setBusiness(data.business)
          setKioskState('pin')
        } else {
          setKioskState('not_found')
        }
      })
      .catch(() => setKioskState('not_found'))
  }, [businessSlug])

  const handlePinSubmit = async () => {
    setPinError('')
    if (pin.length !== 4) {
      setPinError('Enter the 4-digit staff PIN')
      return
    }
    if (!business) return
    setKioskState('ready')
    setTimeout(() => phoneInputRef.current?.focus(), 100)
  }

  const handleStamp = async () => {
    setPhoneError('')
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setPhoneError('Enter a valid 10-digit mobile number')
      return
    }
    if (!business) return

    setKioskState('stamping')
    try {
      const res = await fetch('/api/kiosk/stamp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_id: business.id, phone, pin }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (res.status === 401) {
          setPin('')
          setPinError('Incorrect PIN. Please try again.')
          setKioskState('pin')
          return
        }
        if (res.status === 429) {
          setCooldownHours(data.cooldown_hours ?? 4)
          setKioskState('cooldown')
          return
        }
        setResultMsg(data.error || 'Failed to issue stamp')
        setKioskState('error')
        return
      }

      const { card_state } = data
      setResultMsg(
        card_state.redeemable
          ? `Stamp added! Card complete — ${business.reward} ready to claim!`
          : `Stamp added! ${card_state.card_stamps}/${business.stamps_required} stamps`
      )

      setCurrentCustomerId(data.customer_id ?? null)
      setReviewClaimed(data.review_claimed ?? false)
      setGmbClicked(false)
      setBonusDone(false)
      setBonusCardStamps(null)

      setKioskState('success')
    } catch {
      setResultMsg('Network error. Please try again.')
      setKioskState('error')
    }
  }

  const handleGmbClick = () => {
    if (!business?.gmb_link) return
    window.open(business.gmb_link, '_blank')
    setTimeout(() => setGmbClicked(true), 1000)
  }

  const handleClaimBonus = async () => {
    if (!business || !currentCustomerId) return
    setBonusLoading(true)
    try {
      const res = await fetch('/api/kiosk/review-bonus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_id: business.id, customer_id: currentCustomerId, pin }),
      })
      const data = await res.json()
      if (res.ok) {
        setBonusDone(true)
        setBonusCardStamps(data.card_state?.card_stamps ?? null)
      }
    } catch {
      // silent
    } finally {
      setBonusLoading(false)
    }
  }

  const resetForNext = () => {
    setPhone('')
    setPhoneError('')
    setResultMsg('')
    setCurrentCustomerId(null)
    setReviewClaimed(false)
    setGmbClicked(false)
    setBonusDone(false)
    setBonusCardStamps(null)
    setKioskState('ready')
    setTimeout(() => phoneInputRef.current?.focus(), 100)
  }

  const shakePin = () => {
    const btn = pinBtnRef.current
    if (!btn) return
    btn.classList.remove('_kiosk-shake')
    void btn.offsetWidth
    btn.classList.add('_kiosk-shake')
  }

  const handlePinKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (pin.length !== 4) { shakePin(); setPinError('Enter the 4-digit staff PIN') }
      else handlePinSubmit()
    }
  }

  const handlePhoneKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleStamp()
  }

  const showGmbPrompt = business?.gmb_link && !reviewClaimed && !bonusDone

  if (kioskState === 'loading') {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-100">
        <Spinner size="md" />
      </div>
    )
  }

  if (kioskState === 'not_found') {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 text-zinc-100">
        <div className="text-center max-w-sm">
          <MagnifyingGlass size={36} weight="duotone" className="text-amber-500 mx-auto mb-3" />
          <p className="text-lg font-semibold text-zinc-100">Business not found</p>
          <p className="text-xs text-zinc-400 mt-1">Check the URL or contact the business manager.</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @keyframes _ksk-shake {
          0%,100% { transform: translateX(0) }
          20%      { transform: translateX(-6px) }
          40%      { transform: translateX(6px) }
          60%      { transform: translateX(-4px) }
          80%      { transform: translateX(4px) }
        }
        ._kiosk-shake { animation: _ksk-shake 400ms ease-in-out; }
      `}</style>

      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-zinc-100">
        <div className="w-full max-w-sm space-y-6">
          {/* Business header */}
          <div className="text-center">
            <div className="text-4xl mb-2">{business?.emoji}</div>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-100">
              {business?.name}
            </h1>
            <p className="text-[11px] text-zinc-400 mt-0.5 tracking-wider uppercase">Counter Kiosk</p>
          </div>

          {/* PIN entry */}
          {kioskState === 'pin' && (
            <div className="rounded-xl p-6 border border-zinc-800 bg-zinc-900/50 space-y-4 shadow-xs">
              <div className="flex items-center justify-center gap-1.5 text-zinc-300">
                <LockKey size={16} weight="duotone" className="text-amber-500" />
                <p className="font-semibold text-sm">Staff PIN Required</p>
              </div>
              <Input
                type="password"
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                onKeyDown={handlePinKey}
                error={pinError}
                inputMode="numeric"
                maxLength={4}
                className="text-center text-xl tracking-widest font-mono"
                autoFocus
              />
              <Button ref={pinBtnRef} onClick={handlePinSubmit} size="sm" className="w-full">
                Unlock Kiosk →
              </Button>
            </div>
          )}

          {/* Stamp by phone */}
          {kioskState === 'ready' && (
            <div className="rounded-xl p-6 border border-zinc-800 bg-zinc-900/50 space-y-4 shadow-xs">
              <div className="text-center space-y-1">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                  Kiosk Unlocked
                </div>
                <p className="font-semibold text-base text-zinc-100 pt-1">Enter Customer Phone</p>
                <p className="text-xs text-zinc-400">
                  Free {business?.reward} after {business?.stamps_required} stamps
                </p>
              </div>
              <Input
                ref={phoneInputRef}
                label="Customer mobile number"
                placeholder="9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                onKeyDown={handlePhoneKey}
                error={phoneError}
                inputMode="numeric"
                maxLength={10}
              />
              <Button onClick={handleStamp} size="sm" className="w-full">
                Issue Stamp →
              </Button>
              <button
                onClick={() => { setPin(''); setKioskState('pin') }}
                className="w-full text-xs text-center py-1 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
              >
                Lock Kiosk
              </button>
            </div>
          )}

          {/* Stamping spinner */}
          {kioskState === 'stamping' && (
            <div className="text-center py-8 space-y-3">
              <Spinner size="lg" className="mx-auto" />
              <p className="text-xs text-zinc-400">Issuing stamp…</p>
            </div>
          )}

          {/* Success */}
          {kioskState === 'success' && (
            <div className="space-y-4">
              <div className="rounded-xl p-6 border border-zinc-800 bg-zinc-900/50 text-center space-y-4 shadow-xs is-reward-glow">
                <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
                  <Trophy size={24} weight="duotone" />
                </div>
                <p className="font-semibold text-sm text-zinc-100">
                  {bonusDone
                    ? `Bonus stamp added! ${bonusCardStamps !== null ? `${bonusCardStamps}/${business?.stamps_required} stamps` : ''}`
                    : resultMsg}
                </p>
                <Button onClick={resetForNext} size="sm" className="w-full">Next Customer →</Button>
              </div>

              {/* GMB review prompt */}
              {showGmbPrompt && (
                <div className="rounded-xl p-5 border border-amber-500/30 bg-zinc-900/60 space-y-3 shadow-xs">
                  <div className="flex items-center justify-center gap-1 text-amber-400">
                    <Star size={16} weight="fill" />
                    <span className="font-semibold text-sm text-zinc-100 ml-1">Enjoying {business?.name}?</span>
                  </div>
                  <p className="text-xs text-center text-zinc-400 leading-relaxed">
                    Leave a quick Google review and get a <strong className="text-amber-400">BONUS STAMP</strong> as a thank you!
                  </p>
                  {!gmbClicked ? (
                    <Button onClick={handleGmbClick} variant="outline" size="sm" className="w-full">
                      <span>Open Google Review</span>
                      <ArrowRight size={14} />
                    </Button>
                  ) : (
                    <Button onClick={handleClaimBonus} loading={bonusLoading} size="sm" className="w-full">
                      <Gift size={16} weight="fill" />
                      <span>Claim Bonus Stamp</span>
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Cooldown */}
          {kioskState === 'cooldown' && (
            <div className="rounded-xl p-6 border border-zinc-800 bg-zinc-900/50 text-center space-y-3 shadow-xs">
              <HourglassMedium size={32} weight="duotone" className="text-amber-500 mx-auto" />
              <p className="font-semibold text-sm text-zinc-100">Stamp Cooldown Active</p>
              <p className="text-xs text-zinc-400 leading-relaxed">
                This customer already received a stamp recently. Next stamp available in {cooldownHours}h.
              </p>
              <Button onClick={resetForNext} variant="secondary" size="sm" className="w-full">Next Customer →</Button>
            </div>
          )}

          {/* Error */}
          {kioskState === 'error' && (
            <div className="rounded-xl p-6 border border-zinc-800 bg-zinc-900/50 text-center space-y-3 shadow-xs">
              <Warning size={32} weight="duotone" className="text-rose-400 mx-auto" />
              <p className="font-semibold text-sm text-zinc-100">{resultMsg || 'Something went wrong'}</p>
              <Button onClick={resetForNext} variant="secondary" size="sm" className="w-full">Try Again</Button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
