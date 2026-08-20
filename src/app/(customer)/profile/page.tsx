'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Alert from '@/components/ui/Alert'
import Spinner from '@/components/ui/Spinner'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function ProfileForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const bizId = searchParams.get('bizId')

  const [name, setName] = useState('')
  const [birthdayMonth, setBirthdayMonth] = useState('')
  const [birthdayDay, setBirthdayDay] = useState('')
  const [whatsappOptin, setWhatsappOptin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [nameError, setNameError] = useState('')

  const customerId = (() => {
    try {
      const s = localStorage.getItem('customer_session')
      return s ? JSON.parse(s).id : null
    } catch {
      return null
    }
  })()

  useEffect(() => {
    if (!customerId) router.push('/')
  }, [customerId, router])

  const handleSubmit = async () => {
    if (!name.trim() || name.length < 2) {
      setNameError('Name is required (min 2 chars)')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/customer/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customerId,
          name: name.trim(),
          birthday_month: birthdayMonth || undefined,
          birthday_day: birthdayDay ? parseInt(birthdayDay) : undefined,
          whatsapp_optin: whatsappOptin,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to save profile')
        return
      }
      router.push(bizId ? `/review/${bizId}` : '/cards')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = () => {
    router.push(bizId ? `/review/${bizId}` : '/cards')
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-4 flex flex-col items-center justify-center text-zinc-100">
      <div className="w-full max-w-sm">
        <div className="bg-zinc-900/50 rounded-lg p-6 border border-zinc-800 space-y-4 shadow-xs">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Complete Your Profile</h1>
            <p className="text-xs text-zinc-400 mt-1">Get personalized offers and birthday rewards.</p>
          </div>

          <Input
            label="Your Name"
            placeholder="e.g. Rahul Sharma"
            value={name}
            onChange={(e) => { setName(e.target.value); setNameError('') }}
            error={nameError}
          />

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Birthday <span className="text-zinc-500 font-normal">(optional — for surprise offers)</span>
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <Select
                value={birthdayMonth}
                onChange={(e) => setBirthdayMonth(e.target.value)}
              >
                <option value="">Month</option>
                {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
              </Select>
              <Select
                value={birthdayDay}
                onChange={(e) => setBirthdayDay(e.target.value)}
              >
                <option value="">Day</option>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </Select>
            </div>
          </div>

          <div
            className={`p-3.5 rounded-md border cursor-pointer transition-colors ${
              whatsappOptin ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-zinc-800 bg-zinc-900/40'
            }`}
            onClick={() => setWhatsappOptin(!whatsappOptin)}
          >
            <div className="flex items-start gap-2.5">
              <input
                type="checkbox"
                checked={whatsappOptin}
                onChange={(e) => setWhatsappOptin(e.target.checked)}
                className="w-4 h-4 mt-0.5 accent-emerald-500 cursor-pointer"
              />
              <div>
                <p className="text-xs font-medium text-zinc-200">Send offers on WhatsApp</p>
                <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                  Receive stamp receipts, milestone rewards &amp; exclusive deals.
                </p>
              </div>
            </div>
          </div>

          {error && <Alert type="error" message={error} />}

          <Button onClick={handleSubmit} loading={loading} className="w-full" size="sm">
            Join Rewards Club →
          </Button>

          <button
            onClick={handleSkip}
            className="text-xs text-zinc-500 hover:text-zinc-300 w-full text-center py-1 cursor-pointer"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center"><Spinner size="md" /></div>}>
      <ProfileForm />
    </Suspense>
  )
}
