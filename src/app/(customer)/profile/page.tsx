'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Alert from '@/components/ui/Alert'

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
    <div className="min-h-screen bg-zinc-950 p-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-md">
        {/* Step dots */}
        <div className="flex justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="w-3 h-3 rounded-full bg-yellow-400" />
          ))}
        </div>

        <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 space-y-4">
          <div>
            <h1 className="text-xl font-black text-white">Complete Your Profile</h1>
            <p className="text-sm text-zinc-400 mt-1">Get personalised offers and reward reminders</p>
          </div>

          <Input
            label="Your Name"
            placeholder="e.g. Rahul Sharma"
            value={name}
            onChange={(e) => { setName(e.target.value); setNameError('') }}
            error={nameError}
          />

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              Birthday 🎂 <span className="text-zinc-500 text-xs">(optional — for surprise offers)</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <select
                value={birthdayMonth}
                onChange={(e) => setBirthdayMonth(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
              >
                <option value="">Month</option>
                {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <select
                value={birthdayDay}
                onChange={(e) => setBirthdayDay(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
              >
                <option value="">Day</option>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          <div
            className={`p-4 rounded-xl border-2 cursor-pointer transition-colors ${
              whatsappOptin ? 'border-green-500 bg-green-500/10' : 'border-zinc-700'
            }`}
            onClick={() => setWhatsappOptin(!whatsappOptin)}
          >
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={whatsappOptin}
                onChange={(e) => setWhatsappOptin(e.target.checked)}
                className="w-5 h-5 accent-green-500"
              />
              <div>
                <p className="text-sm font-semibold text-white">📲 Send me offers on WhatsApp</p>
                <p className="text-xs text-zinc-400">Get reward reminders, birthday surprises & exclusive deals</p>
              </div>
            </div>
          </div>

          {error && <Alert type="error" message={error} />}

          <Button onClick={handleSubmit} loading={loading} className="w-full" size="lg">
            JOIN REWARDS CLUB →
          </Button>

          <button
            onClick={handleSkip}
            className="text-sm text-zinc-500 hover:text-zinc-300 w-full text-center"
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
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">Loading...</div>}>
      <ProfileForm />
    </Suspense>
  )
}
