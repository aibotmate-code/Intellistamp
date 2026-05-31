'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Alert from '@/components/ui/Alert'

const CATEGORIES = ['Cafe', 'Salon', 'Gym', 'Restaurant', 'Jewellery', 'Spa', 'Bakery', 'Other'] as const
const EMOJIS = ['☕', '✂️', '💪', '🍽️', '💎', '🧖', '🥐', '🏪', '🌸', '🎯', '⭐', '🏆']

interface FormData {
  name: string
  category: string
  emoji: string
  owner_phone: string
  stamps_required: number
  reward: string
  staff_pin: string
  gmb_link: string
  security_mode: 'basic' | 'smart' | 'strict'
}

const initialForm: FormData = {
  name: '',
  category: '',
  emoji: '🏪',
  owner_phone: '',
  stamps_required: 8,
  reward: '',
  staff_pin: '',
  gmb_link: '',
  security_mode: 'smart',
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormData>(initialForm)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (key: keyof FormData, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: '' }))
  }

  const validateStep1 = () => {
    const errs: typeof errors = {}
    if (!form.name.trim() || form.name.length < 2) errs.name = 'Business name is required (min 2 chars)'
    if (!form.category) errs.category = 'Please select a category'
    if (!form.emoji) errs.emoji = 'Please select an emoji'
    if (!/^[6-9]\d{9}$/.test(form.owner_phone)) errs.owner_phone = 'Enter a valid 10-digit Indian mobile number'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const validateStep2 = () => {
    const errs: typeof errors = {}
    if (form.stamps_required < 3 || form.stamps_required > 20) errs.stamps_required = 'Must be between 3 and 20'
    if (!form.reward.trim() || form.reward.length < 3) errs.reward = 'Reward description required'
    if (!/^\d{4}$/.test(form.staff_pin)) errs.staff_pin = 'PIN must be exactly 4 digits'
    if (form.gmb_link && !/^https?:\/\/.+/.test(form.gmb_link)) errs.gmb_link = 'Enter a valid URL'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return
    if (step === 2 && !validateStep2()) return
    setStep((s) => s + 1)
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/business/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          category: form.category,
          emoji: form.emoji,
          stamps_required: form.stamps_required,
          reward: form.reward,
          staff_pin: form.staff_pin,
          gmb_link: form.gmb_link || '',
          dynamic_qr_enabled: form.security_mode !== 'basic',
          staff_pin_enabled: form.security_mode === 'strict',
          owner_phone: form.owner_phone,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to create business')
        return
      }
      localStorage.setItem('business_session', JSON.stringify({
        ownerPhone: form.owner_phone,
        bizId: data.business.id,
      }))
      setStep(4)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🏷️</div>
          <h1 className="text-2xl font-black text-white">IntelliStamp</h1>
          <p className="text-zinc-400 text-sm">Set up your loyalty card in 3 steps</p>
        </div>

        {/* Step indicator */}
        {step < 4 && (
          <div className="flex items-center justify-center gap-2 mb-8">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  s < step ? 'bg-yellow-400 text-black' :
                  s === step ? 'bg-yellow-400 text-black' :
                  'bg-zinc-800 text-zinc-500'
                }`}>
                  {s < step ? '✓' : s}
                </div>
                {s < 3 && <div className={`w-12 h-0.5 ${s < step ? 'bg-yellow-400' : 'bg-zinc-800'}`} />}
              </div>
            ))}
          </div>
        )}

        {/* Step 1 — Business Details */}
        {step === 1 && (
          <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 space-y-4">
            <h2 className="text-lg font-bold text-white">Business Details</h2>

            <Input
              label="Business Name"
              placeholder="e.g. Brew & Co Cafe"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              error={errors.name}
              maxLength={50}
            />

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Category</label>
              <div className="grid grid-cols-4 gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => set('category', cat)}
                    className={`py-2 px-1 text-xs rounded-lg border font-medium transition-colors ${
                      form.category === cat
                        ? 'border-yellow-400 bg-yellow-400/10 text-yellow-400'
                        : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              {errors.category && <p className="mt-1 text-sm text-red-400">{errors.category}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Emoji Icon</label>
              <div className="grid grid-cols-6 gap-2">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => set('emoji', e)}
                    className={`text-2xl p-2 rounded-lg border transition-colors ${
                      form.emoji === e
                        ? 'border-yellow-400 bg-yellow-400/10'
                        : 'border-zinc-700 hover:border-zinc-500'
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="Your Phone Number"
              placeholder="9876543210"
              value={form.owner_phone}
              onChange={(e) => set('owner_phone', e.target.value)}
              error={errors.owner_phone}
              inputMode="numeric"
              maxLength={10}
            />

            <Button onClick={handleNext} className="w-full">Next →</Button>
          </div>
        )}

        {/* Step 2 — Stamp Card Setup */}
        {step === 2 && (
          <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 space-y-4">
            <h2 className="text-lg font-bold text-white">Stamp Card Setup</h2>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Stamps Required (3–20)
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => set('stamps_required', Math.max(3, form.stamps_required - 1))}
                  className="w-10 h-10 bg-zinc-800 rounded-lg text-white text-xl font-bold hover:bg-zinc-700"
                >
                  −
                </button>
                <span className="text-3xl font-black text-yellow-400 w-16 text-center">
                  {form.stamps_required}
                </span>
                <button
                  type="button"
                  onClick={() => set('stamps_required', Math.min(20, form.stamps_required + 1))}
                  className="w-10 h-10 bg-zinc-800 rounded-lg text-white text-xl font-bold hover:bg-zinc-700"
                >
                  +
                </button>
              </div>
              {errors.stamps_required && <p className="mt-1 text-sm text-red-400">{errors.stamps_required}</p>}
            </div>

            <Input
              label="Reward Name"
              placeholder="e.g. 1 Free Coffee"
              value={form.reward}
              onChange={(e) => set('reward', e.target.value)}
              error={errors.reward}
              maxLength={100}
            />

            <Input
              label="Staff PIN (4 digits)"
              placeholder="e.g. 1234"
              value={form.staff_pin}
              onChange={(e) => set('staff_pin', e.target.value)}
              error={errors.staff_pin}
              inputMode="numeric"
              maxLength={4}
              type="password"
            />

            <Input
              label="Google My Business Link (optional)"
              placeholder="https://g.page/your-business"
              value={form.gmb_link}
              onChange={(e) => set('gmb_link', e.target.value)}
              error={errors.gmb_link}
            />

            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setStep(1)} className="flex-1">← Back</Button>
              <Button onClick={handleNext} className="flex-1">Next →</Button>
            </div>
          </div>
        )}

        {/* Step 3 — Security Mode */}
        {step === 3 && (
          <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 space-y-4">
            <h2 className="text-lg font-bold text-white">Security Mode</h2>
            <p className="text-xs text-zinc-400">94% of IntelliStamp businesses use Smart mode</p>

            {[
              {
                id: 'basic' as const,
                label: 'Basic',
                desc: 'Static behaviour, 4-hour cooldown only',
                badge: 'FREE',
                badgeColor: 'bg-zinc-700 text-zinc-300',
              },
              {
                id: 'smart' as const,
                label: 'Smart',
                desc: 'Dynamic QR rotates every 30s',
                badge: '⚡ RECOMMENDED',
                badgeColor: 'bg-yellow-400/20 text-yellow-400',
              },
              {
                id: 'strict' as const,
                label: 'Strict',
                desc: 'Dynamic QR + Staff PIN required',
                badge: '🔒 PRO — ₹2,499/mo',
                badgeColor: 'bg-purple-500/20 text-purple-400',
              },
            ].map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => set('security_mode', mode.id)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-colors ${
                  form.security_mode === mode.id
                    ? 'border-yellow-400 bg-yellow-400/5'
                    : 'border-zinc-700 hover:border-zinc-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    form.security_mode === mode.id ? 'border-yellow-400' : 'border-zinc-600'
                  }`}>
                    {form.security_mode === mode.id && (
                      <div className="w-2 h-2 rounded-full bg-yellow-400" />
                    )}
                  </div>
                  <span className="font-semibold text-white">{mode.label}</span>
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${mode.badgeColor}`}>
                    {mode.badge}
                  </span>
                </div>
                <p className="text-sm text-zinc-400 mt-1 ml-7">{mode.desc}</p>
              </button>
            ))}

            {form.security_mode === 'strict' && (
              <Alert
                type="info"
                message="Staff PIN Validator requires IntelliStamp Pro. You can still complete setup and upgrade later."
              />
            )}

            {error && <Alert type="error" message={error} />}

            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setStep(2)} className="flex-1">← Back</Button>
              <Button onClick={handleSubmit} loading={loading} className="flex-1">
                Create Stamp Card
              </Button>
            </div>
          </div>
        )}

        {/* Step 4 — Ready */}
        {step === 4 && (
          <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 text-center space-y-4">
            <div className="text-5xl mb-2">✅</div>
            <h2 className="text-xl font-black text-white">Your stamp card is ready!</h2>
            <div className="text-5xl">{form.emoji}</div>
            <p className="text-xl font-bold text-white">{form.name}</p>

            <Button onClick={() => router.push('/dashboard')} className="w-full" size="lg">
              Enter Dashboard →
            </Button>

            <p className="text-xs text-zinc-500 mt-4">
              Tip: Open your dashboard on your counter device and tap Kiosk Mode for customers to scan
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
