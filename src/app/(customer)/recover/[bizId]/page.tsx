'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Alert from '@/components/ui/Alert'

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
    <div className="min-h-screen bg-zinc-950 p-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-md">
        <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 space-y-4">
          <h2 className="text-lg font-bold text-white">Recover my card</h2>
          <p className="text-sm text-zinc-400">
            Enter the mobile number you used to enroll — we&apos;ll find your loyalty card.
          </p>

          {state === 'form' && (
            <>
              <Input
                label="Enter mobile number"
                placeholder="9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                error={phoneError}
                inputMode="numeric"
                maxLength={15}
                autoFocus
              />
              <Button onClick={handleRecover} loading={loading} className="w-full">
                Find My Card →
              </Button>
            </>
          )}

          {state === 'not_found' && (
            <div className="space-y-4">
              <Alert type="info" message="No loyalty card found for this number." />
              <Button onClick={() => router.push(`/scan/${bizId}`)} className="w-full">
                Enroll with this number
              </Button>
              <button
                onClick={() => setState('form')}
                className="text-sm text-zinc-500 hover:text-zinc-300 w-full text-center"
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
