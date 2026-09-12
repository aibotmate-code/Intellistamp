'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Alert from '@/components/ui/Alert'
import BusinessVisual from '@/components/branding/BusinessVisual'
import { resolveBrandingColors } from '@/lib/branding/palette'
import { MagnifyingGlass } from '@phosphor-icons/react'
import type { Business } from '@/types'

type RecoverState = 'form' | 'not_found'

export default function RecoverPage() {
  const routeParams = useParams<{ bizId: string }>()
  const bizId = routeParams?.bizId || ''
  const router = useRouter()

  const [business, setBusiness] = useState<Business | null>(null)
  const [phone, setPhone] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [loading, setLoading] = useState(false)
  const [state, setState] = useState<RecoverState>('form')

  useEffect(() => {
    fetch(`/api/business/public?bizId=${bizId}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (data.business) setBusiness(data.business)
      })
      .catch(() => {})
  }, [bizId])

  const activeBranding = business?.branding
  const isBrandingEnabled = !!(activeBranding && activeBranding.is_enabled !== false)
  const resolved = resolveBrandingColors(activeBranding, isBrandingEnabled)

  const handleRecover = async () => {
    setPhoneError('')
    if (!phone.trim()) {
      setPhoneError('Enter your mobile number')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/customer/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_id: bizId, phone }),
      })
      const data = await res.json()
      if (!res.ok) {
        setPhoneError(data.error || 'Something went wrong')
        return
      }
      if (!data.found) {
        setState('not_found')
        return
      }
      const c = data.customer
      localStorage.setItem('customer_session', JSON.stringify({
        id: c.id,
        phone: c.phone,
        customer_token: c.customer_token,
        name: c.name,
      }))
      router.push(`/card/${c.customer_token}?biz=${bizId}`)
    } catch {
      setPhoneError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-4 flex flex-col items-center justify-center text-zinc-100 is-dot-grid relative overflow-hidden">
      {/* Subtle ambient merchant background layer if configured */}
      {isBrandingEnabled && resolved.card_background_image_url && (
        <>
          <div
            className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${resolved.card_background_image_url})` }}
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
        {business && (
          <div className="text-center mb-5 flex flex-col items-center">
            <BusinessVisual
              logoUrl={activeBranding?.logo_url}
              emoji={business.emoji}
              name={business.name}
              className="text-3xl mb-2"
            />
            <h1 className="text-lg font-semibold tracking-tight text-zinc-100">{business.name}</h1>
            <p className="text-xs text-zinc-400 mt-0.5">Recover Loyalty Card</p>
          </div>
        )}

        <div
          className="rounded-xl p-6 border space-y-4 shadow-xs backdrop-blur-md transition-colors"
          style={{
            backgroundColor: isBrandingEnabled ? resolved.surface_color : 'rgba(24, 24, 27, 0.6)',
            borderColor: isBrandingEnabled ? resolved.empty_stamp_border_color : '#27272a',
          }}
        >
          {!business && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-amber-500">
                <MagnifyingGlass size={18} weight="duotone" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-zinc-100">Recover Loyalty Card</h2>
                <p className="text-[11px] text-zinc-400">Enter your registered mobile number</p>
              </div>
            </div>
          )}

          {state === 'form' && (
            <div className="space-y-4 pt-1">
              {business && (
                <div>
                  <h2
                    className="text-sm font-semibold"
                    style={{ color: isBrandingEnabled ? resolved.card_text_color : undefined }}
                  >
                    Enter registered mobile number
                  </h2>
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: isBrandingEnabled ? resolved.card_muted_text_color : undefined }}
                  >
                    We&apos;ll restore access to your loyalty card.
                  </p>
                </div>
              )}
              <Input
                label="Mobile Number"
                placeholder="9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                error={phoneError}
                inputMode="numeric"
                maxLength={15}
                autoFocus
              />
              <Button
                onClick={handleRecover}
                loading={loading}
                size="sm"
                className="w-full transition-opacity hover:opacity-90"
                style={isBrandingEnabled ? {
                  backgroundColor: resolved.primary_color,
                  color: resolved.text_on_primary,
                  borderColor: 'transparent',
                } : undefined}
              >
                Find My Card →
              </Button>
            </div>
          )}

          {state === 'not_found' && (
            <div className="space-y-4">
              <Alert type="info" message="No loyalty card found for this mobile number." />
              <Button
                onClick={() => router.push(`/scan/${bizId}`)}
                size="sm"
                className="w-full transition-opacity hover:opacity-90"
                style={isBrandingEnabled ? {
                  backgroundColor: resolved.primary_color,
                  color: resolved.text_on_primary,
                  borderColor: 'transparent',
                } : undefined}
              >
                Enroll with this number
              </Button>
              <button
                onClick={() => setState('form')}
                className="text-xs text-zinc-500 hover:text-zinc-300 w-full text-center py-1 cursor-pointer"
              >
                ← Try a different number
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/cards')}
            className="text-xs text-zinc-500 hover:text-zinc-300 cursor-pointer"
          >
            Back to my cards
          </button>
        </div>

        <div className="mt-8 text-center">
          <p className="text-[11px] text-zinc-500 flex items-center justify-center gap-1.5">
            <span>Powered by</span>
            <span className="font-medium text-zinc-400">IntelliStamp</span>
          </p>
        </div>
      </div>
    </div>
  )
}
