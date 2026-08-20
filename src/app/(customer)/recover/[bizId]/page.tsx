'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Alert from '@/components/ui/Alert'
import { MagnifyingGlass } from '@phosphor-icons/react'

type RecoverState = 'form' | 'not_found'

interface PageParams {
  params: Promise<{ bizId: string }>
}

export default function RecoverPage({ params }: PageParams) {
  const { bizId } = use(params)
  const router = useRouter()

  const [phone, setPhone] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [loading, setLoading] = useState(false)
  const [state, setState] = useState<RecoverState>('form')

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
    <div className="min-h-screen bg-zinc-950 p-4 flex flex-col items-center justify-center text-zinc-100 is-dot-grid">
      <div className="w-full max-w-sm">
        <div className="bg-zinc-900/60 rounded-xl p-6 border border-zinc-800 space-y-4 shadow-xs">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-amber-500">
              <MagnifyingGlass size={18} weight="duotone" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">Recover Loyalty Card</h2>
              <p className="text-[11px] text-zinc-400">Enter your registered mobile number</p>
            </div>
          </div>

          {state === 'form' && (
            <div className="space-y-4 pt-1">
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
              <Button onClick={handleRecover} loading={loading} size="sm" className="w-full">
                Find My Card →
              </Button>
            </div>
          )}

          {state === 'not_found' && (
            <div className="space-y-4">
              <Alert type="info" message="No loyalty card found for this mobile number." />
              <Button onClick={() => router.push(`/scan/${bizId}`)} size="sm" className="w-full">
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
      </div>
    </div>
  )
}
