'use client'

import { use, useEffect, useRef, useState } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import type { Business } from '@/types'

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
    fetch(`/api/business/get?slug=${businessSlug}`)
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
          ? `🎉 Stamp added! Card complete — ${business.reward} ready to claim!`
          : `✅ Stamp added! ${card_state.card_stamps}/${business.stamps_required} stamps`
      )

      // Store customer info for potential GMB bonus
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
      // silent — bonus stamp failure shouldn't block UI
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
        <div className="text-4xl animate-pulse" style={{ color: 'var(--color-gold)' }}>●</div>
      </div>
    )
  }

  if (kioskState === 'not_found') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--color-bg)' }}>
        <div className="text-center">
          <p className="text-5xl mb-4">🔍</p>
          <p className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Business not found</p>
          <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>Check the URL or contact support.</p>
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

      <div
        className="min-h-screen flex flex-col items-center justify-center p-6 page-enter"
        style={{ background: 'var(--color-bg)' }}
      >
        <div className="w-full max-w-sm space-y-6">
          {/* Business header */}
          <div className="text-center">
            <div className="text-5xl mb-2">{business?.emoji}</div>
            <h1 className="text-2xl text-white" style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>
              {business?.name}
            </h1>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>KIOSK MODE</p>
          </div>

          {/* PIN entry */}
          {kioskState === 'pin' && (
            <div className="rounded-2xl p-6 border space-y-4" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <p className="font-semibold text-center" style={{ color: 'var(--color-text)' }}>Staff PIN required</p>
              <Input
                type="password"
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                onKeyDown={handlePinKey}
                error={pinError}
                inputMode="numeric"
                maxLength={4}
                className="text-center text-2xl tracking-widest"
                autoFocus
              />
              <Button ref={pinBtnRef} onClick={handlePinSubmit} className="w-full">Unlock Kiosk →</Button>
            </div>
          )}

          {/* Stamp by phone */}
          {kioskState === 'ready' && (
            <div className="rounded-2xl p-6 border space-y-4" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="text-center space-y-1">
                <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full" style={{ background: 'var(--color-elevated)', color: 'var(--color-green)' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current inline-block" />
                  Kiosk unlocked
                </div>
                <p className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>Enter customer phone</p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Free {business?.reward} after {business?.stamps_required} stamps
                </p>
              </div>
              <Input
                ref={phoneInputRef}
                label="Customer phone number"
                placeholder="9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                onKeyDown={handlePhoneKey}
                error={phoneError}
                inputMode="numeric"
                maxLength={10}
              />
              <Button onClick={handleStamp} className="w-full">Issue Stamp →</Button>
              <button
                onClick={() => { setPin(''); setKioskState('pin') }}
                className="w-full text-xs text-center py-1 transition-colors"
                style={{ color: 'var(--color-text-dim)' }}
              >
                Lock kiosk
              </button>
            </div>
          )}

          {/* Stamping spinner */}
          {kioskState === 'stamping' && (
            <div className="text-center py-8 space-y-3">
              <div className="text-4xl animate-spin inline-block" style={{ color: 'var(--color-gold)' }}>◌</div>
              <p style={{ color: 'var(--color-text-muted)' }}>Issuing stamp…</p>
            </div>
          )}

          {/* Success */}
          {kioskState === 'success' && (
            <div className="space-y-4">
              <div className="rounded-2xl p-6 border text-center space-y-4 scale-in" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <p className="text-4xl">🎉</p>
                <p className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>
                  {bonusDone
                    ? `🎁 Bonus stamp added! ${bonusCardStamps !== null ? `${bonusCardStamps}/${business?.stamps_required} stamps` : ''}`
                    : resultMsg}
                </p>
                {!bonusDone && (
                  <Button onClick={resetForNext} className="w-full">Next Customer →</Button>
                )}
                {bonusDone && (
                  <Button onClick={resetForNext} className="w-full">Next Customer →</Button>
                )}
              </div>

              {/* GMB review prompt */}
              {showGmbPrompt && (
                <div className="rounded-2xl p-5 border space-y-3" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-gold)', borderWidth: '1.5px' }}>
                  <p className="font-bold text-center" style={{ color: 'var(--color-text)' }}>
                    Enjoying {business?.name}? ⭐
                  </p>
                  <p className="text-sm text-center" style={{ color: 'var(--color-text-muted)' }}>
                    Leave a quick Google review and get a <strong style={{ color: 'var(--color-gold)' }}>BONUS STAMP</strong> as a thank you 🎁
                  </p>
                  {!gmbClicked ? (
                    <Button onClick={handleGmbClick} variant="outline" className="w-full">
                      Open Google Review →
                    </Button>
                  ) : (
                    <Button onClick={handleClaimBonus} loading={bonusLoading} className="w-full">
                      Claim Bonus Stamp 🎁
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Cooldown */}
          {kioskState === 'cooldown' && (
            <div className="rounded-2xl p-6 border text-center space-y-4" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <p className="text-4xl">⏳</p>
              <p className="font-bold" style={{ color: 'var(--color-text)' }}>Stamp cooldown active</p>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                This customer already received a stamp recently. Next stamp available in {cooldownHours}h.
              </p>
              <Button onClick={resetForNext} variant="secondary" className="w-full">Next Customer →</Button>
            </div>
          )}

          {/* Error */}
          {kioskState === 'error' && (
            <div className="rounded-2xl p-6 border text-center space-y-4" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <p className="text-4xl">⚠️</p>
              <p className="font-bold" style={{ color: 'var(--color-text)' }}>{resultMsg || 'Something went wrong'}</p>
              <Button onClick={resetForNext} variant="secondary" className="w-full">Try Again</Button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
