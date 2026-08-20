'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { Business } from '@/types'
import BusinessVisual from '@/components/branding/BusinessVisual'
import { resolveBrandingColors } from '@/lib/branding/palette'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Spinner from '@/components/ui/Spinner'
import Logo from '@/components/brand/Logo'
import { cn } from '@/lib/utils'
import { CreditCard, Camera, Gift, Storefront, ArrowLeft, MagnifyingGlass } from '@phosphor-icons/react'

interface CardItem {
  business_id: string
  business: Business
  total_stamps: number
  card_stamps: number
  cards_completed: number
  cards_redeemed: number
}

type FlowState = 'loading' | 'phone' | 'cards' | 'not_found'

export default function CardsPage() {
  const [flow, setFlow] = useState<FlowState>('loading')
  const [phone, setPhone] = useState('')
  const [phoneLoading, setPhoneLoading] = useState(false)
  const [phoneError, setPhoneError] = useState('')
  const [cards, setCards] = useState<CardItem[]>([])
  const [customerToken, setCustomerToken] = useState<string | null>(null)

  const loadCards = async (customerId: string) => {
    const res = await fetch(`/api/customer/profile?customerId=${customerId}`)
    if (!res.ok) {
      setFlow('not_found')
      return
    }
    const data = await res.json()
    if (data.cards) setCards(data.cards)
    if (data.customer?.customer_token) setCustomerToken(data.customer.customer_token)
    setFlow('cards')
  }

  useEffect(() => {
    const stored = localStorage.getItem('customer_session')
    if (!stored) {
      queueMicrotask(() => setFlow('phone'))
      return
    }
    const session = JSON.parse(stored) as { id: string; phone: string; customer_token?: string }
    queueMicrotask(() => loadCards(session.id))
  }, [])

  const handlePhoneLookup = async () => {
    setPhoneError('')
    const digits = phone.replace(/\D/g, '').replace(/^91/, '')
    if (digits.length !== 10) {
      setPhoneError('Enter a valid 10-digit mobile number')
      return
    }
    setPhoneLoading(true)
    try {
      const res = await fetch(`/api/customer/profile?phone=${digits}`)
      if (res.status === 404) {
        setFlow('not_found')
        return
      }
      if (!res.ok) {
        setPhoneError('Something went wrong. Please try again.')
        return
      }
      const data = await res.json()
      localStorage.setItem('customer_session', JSON.stringify({
        id: data.customer.id,
        phone: digits,
        customer_token: data.customer.customer_token,
      }))
      if (data.cards) setCards(data.cards)
      if (data.customer?.customer_token) setCustomerToken(data.customer.customer_token)
      setFlow('cards')
    } catch {
      setPhoneError('Network error. Please try again.')
    } finally {
      setPhoneLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('customer_session')
    setCards([])
    setCustomerToken(null)
    setPhone('')
    setFlow('phone')
  }

  if (flow === 'loading') {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Spinner size="md" />
      </div>
    )
  }

  if (flow === 'phone') {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 text-zinc-100 is-dot-grid">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6 flex flex-col items-center">
            <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-amber-500 mx-auto mb-3 shadow-xs">
              <CreditCard size={22} weight="duotone" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-100">My Loyalty Cards</h1>
            <p className="text-xs text-zinc-400 mt-1">Enter your mobile number to view active cards</p>
          </div>

          <div className="bg-zinc-900/60 rounded-lg p-6 border border-zinc-800 space-y-4 shadow-xs">
            <Input
              label="Mobile Number"
              type="tel"
              inputMode="numeric"
              placeholder="9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePhoneLookup()}
              error={phoneError}
            />
            <Button
              onClick={handlePhoneLookup}
              loading={phoneLoading}
              disabled={phoneLoading}
              className="w-full"
              size="sm"
            >
              View My Cards →
            </Button>
            <p className="text-center text-[11px] text-zinc-500">
              New here? Scan a merchant QR code at the counter to start.
            </p>
          </div>

          <div className="text-center mt-6 flex flex-col items-center gap-2">
            <Link href="/login" className="text-xs text-zinc-400 hover:text-zinc-200 inline-flex items-center gap-1.5">
              <Storefront size={14} />
              <span>Business Portal</span>
            </Link>
            <Link href="/" className="text-[11px] text-zinc-600 hover:text-zinc-400 inline-flex items-center gap-1">
              <ArrowLeft size={12} />
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (flow === 'not_found') {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 text-zinc-100 is-dot-grid">
        <div className="text-center max-w-sm">
          <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-amber-500 mx-auto mb-3 shadow-xs">
            <MagnifyingGlass size={22} weight="duotone" />
          </div>
          <h2 className="text-lg font-semibold text-zinc-100 mb-2">No Account Found</h2>
          <p className="text-zinc-400 text-xs mb-6 leading-relaxed">
            We couldn&apos;t find loyalty cards for this number. Scan a merchant QR code at the counter first to create your account.
          </p>
          <div className="flex items-center justify-center gap-3 text-xs">
            <button
              onClick={() => { setFlow('phone'); setPhone('') }}
              className="text-zinc-100 hover:underline cursor-pointer font-medium"
            >
              Try another number
            </button>
            <span className="text-zinc-700">·</span>
            <Link href="/" className="text-zinc-400 hover:text-zinc-200">Home</Link>
          </div>
        </div>
      </div>
    )
  }

  // flow === 'cards'
  return (
    <div className="min-h-screen bg-zinc-950 p-4 text-zinc-100">
      <div className="max-w-md mx-auto py-4 space-y-5">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
          <Logo size="sm" />
          <button
            onClick={handleLogout}
            className="text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer"
          >
            Logout
          </button>
        </div>

        {cards.length === 0 ? (
          <div className="text-center py-12 text-zinc-400 rounded-lg border border-zinc-800 bg-zinc-900/30 p-6">
            <CreditCard size={36} weight="duotone" className="text-zinc-600 mx-auto mb-3" />
            <p className="font-semibold text-sm text-zinc-100">No active loyalty cards</p>
            <p className="text-xs text-zinc-400 mt-1">Scan a merchant QR code to earn your first stamp.</p>
            <Link
              href="/"
              className="mt-4 inline-block text-xs font-medium text-amber-500 hover:underline"
            >
              Back to Home →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {cards.map((card) => {
              const { business, card_stamps, cards_completed, cards_redeemed } = card
              const redeemable = cards_completed > (cards_redeemed ?? 0)
              const segCount = business.stamps_required

              const activeBranding = business.branding
              const isBrandingEnabled = !!(activeBranding && activeBranding.is_enabled !== false)
              const resolved = resolveBrandingColors(activeBranding, isBrandingEnabled)

              return (
                <Link
                  key={card.business_id}
                  href={customerToken ? `/card/${customerToken}?biz=${card.business_id}` : '#'}
                  className={cn(
                    'block rounded-xl p-4 border transition-all hover:border-zinc-700 shadow-xs',
                    redeemable && 'is-reward-glow'
                  )}
                  style={{
                    background: resolved.surface_color,
                    borderColor: resolved.empty_stamp_border_color,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <BusinessVisual
                      logoUrl={activeBranding?.logo_url}
                      emoji={business.emoji}
                      name={business.name}
                      className="text-2xl shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className="font-semibold text-sm truncate"
                        style={{ color: resolved.card_text_color }}
                      >
                        {business.name}
                      </p>
                      <p className="text-xs mt-0.5 truncate" style={{ color: resolved.card_muted_text_color }}>
                        {business.reward} ({business.stamps_required} stamps)
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-mono font-semibold" style={{ color: resolved.primary_color }}>
                        {card_stamps}/{business.stamps_required}
                      </p>
                      {cards_completed > 0 && (
                        <p className="text-[10px] text-emerald-400">{cards_completed} completed</p>
                      )}
                    </div>
                  </div>

                  {/* Punch trail dots */}
                  <div className="mt-3 flex gap-1">
                    {Array.from({ length: segCount }).map((_, i) => (
                      <div
                        key={i}
                        className="h-1.5 flex-1 rounded-full transition-colors"
                        style={{
                          background: i < card_stamps ? resolved.primary_color : resolved.empty_stamp_color,
                        }}
                      />
                    ))}
                  </div>

                  {redeemable && (
                    <div className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold" style={{ color: resolved.primary_color }}>
                      <Gift size={14} weight="fill" />
                      <span>Reward ready to redeem!</span>
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        )}

        <Link
          href="/scanner"
          className="flex items-center justify-center gap-2 border border-dashed border-zinc-800 rounded-lg p-3.5 text-xs font-medium text-zinc-400 hover:border-zinc-700 hover:text-zinc-200 transition-colors"
        >
          <Camera size={16} weight="duotone" className="text-amber-500" />
          <span>Scan a new business QR code</span>
        </Link>
      </div>
    </div>
  )
}
