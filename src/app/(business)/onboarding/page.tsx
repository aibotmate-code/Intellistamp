'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/auth-helpers-nextjs'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Alert from '@/components/ui/Alert'
import Logo from '@/components/brand/Logo'

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

interface MilestoneInput {
  visit_number: number
  badge: string
  reward: string
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

const CHECKLIST_ITEMS = [
  'Business profile created',
  'Stamp card configured',
  'Security mode set',
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)

  // Redirect to dashboard if user already has a business
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      fetch(`/api/business/get?ownerId=${session.user.id}`)
        .then((r) => r.json())
        .then((data) => { if (data.business) router.replace('/dashboard') })
        .catch(() => {})
    })
  }, [router])

  const [form, setForm] = useState<FormData>(initialForm)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Step 4 — milestone setup
  const [bizId, setBizId] = useState<string | null>(null)
  const [milestones, setMilestones] = useState<MilestoneInput[]>([])
  const [milestonesLoading, setMilestonesLoading] = useState(false)
  const [milestonesError, setMilestonesError] = useState('')

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
        const msg = data._debug
          ? `${data.error} [${data._code ?? ''}] ${data._debug}`
          : (data.error || 'Failed to create business')
        setError(msg)
        return
      }
      setBizId(data.business.id)
      setStep(4)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const addMilestone = () =>
    setMilestones((prev) => {
      const visitNumber = prev.length === 0 ? 15 : prev[prev.length - 1].visit_number + 15
      return [...prev, { visit_number: visitNumber, badge: '🎯', reward: '' }]
    })

  const removeMilestone = (index: number) =>
    setMilestones((prev) => prev.filter((_, i) => i !== index))

  const updateMilestone = (index: number, key: keyof MilestoneInput, value: string | number) =>
    setMilestones((prev) => prev.map((m, i) => i === index ? { ...m, [key]: value } : m))

  const handleMilestoneContinue = async () => {
    if (milestones.length === 0) {
      setStep(5)
      return
    }
    if (!bizId) return
    setMilestonesLoading(true)
    setMilestonesError('')
    try {
      const res = await fetch('/api/milestones/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: bizId,
          conflict_priority: 'stamp',
          milestones: milestones.map((m) => ({ ...m, is_active: true })),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMilestonesError(data.error || 'Failed to save milestones')
        return
      }
      setStep(5)
    } catch {
      setMilestonesError('Network error. Please try again.')
    } finally {
      setMilestonesLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-4 flex flex-col items-center justify-center text-zinc-100">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="relative text-center mb-6 flex flex-col items-center">
          <button 
            onClick={() => {
              createBrowserClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
              ).auth.signOut().then(() => router.push('/login'))
            }}
            className="absolute right-0 top-0 text-xs font-medium text-zinc-500 hover:text-zinc-200 px-2 py-1 rounded hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            Sign Out
          </button>
          <Logo size="md" withAttribution={true} className="mb-3" />
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">IntelliStamp Setup</h1>
          <p className="text-xs text-zinc-400 mt-1">Configure your digital loyalty card in 5 simple steps</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-1.5 mb-6">
          {[1, 2, 3, 4, 5].map((s) => (
            <div key={s} className="flex items-center gap-1.5">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold transition-colors ${
                s <= step ? 'bg-zinc-100 text-zinc-950' : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
              }`}>
                {s < step ? '✓' : s}
              </div>
              {s < 5 && <div className={`w-5 h-0.5 ${s < step ? 'bg-zinc-200' : 'bg-zinc-800'}`} />}
            </div>
          ))}
        </div>

        {/* Step 1 — Business Details */}
        {step === 1 && (
          <div className="bg-zinc-900/50 rounded-lg p-6 border border-zinc-800 space-y-4 shadow-xs">
            <h2 className="text-sm font-semibold text-zinc-200">Business Details</h2>

            <Input
              label="Business Name"
              placeholder="e.g. Brew & Co Cafe"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              error={errors.name}
              maxLength={50}
            />

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Category</label>
              <div className="grid grid-cols-4 gap-1.5">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => set('category', cat)}
                    className={`py-1.5 px-2 text-xs rounded-md border font-medium transition-colors cursor-pointer ${
                      form.category === cat
                        ? 'border-zinc-300 bg-zinc-800 text-zinc-100'
                        : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              {errors.category && <p className="mt-1 text-xs text-rose-400">{errors.category}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Emoji Icon</label>
              <div className="grid grid-cols-6 gap-1.5">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => set('emoji', e)}
                    className={`text-xl p-2 rounded-md border transition-colors cursor-pointer flex items-center justify-center ${
                      form.emoji === e
                        ? 'border-zinc-300 bg-zinc-800'
                        : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700'
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="Your Mobile Number (Owner)"
              placeholder="9876543210"
              value={form.owner_phone}
              onChange={(e) => set('owner_phone', e.target.value)}
              error={errors.owner_phone}
              inputMode="numeric"
              maxLength={10}
            />

            <Button onClick={handleNext} className="w-full" size="sm">Next Step →</Button>
          </div>
        )}

        {/* Step 2 — Stamp Card Setup */}
        {step === 2 && (
          <div className="bg-zinc-900/50 rounded-lg p-6 border border-zinc-800 space-y-4 shadow-xs">
            <h2 className="text-sm font-semibold text-zinc-200">Stamp Card Setup</h2>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Stamps Required for Reward (3–20)
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => set('stamps_required', Math.max(3, form.stamps_required - 1))}
                  className="w-8 h-8 bg-zinc-850 border border-zinc-700 rounded-md text-zinc-200 text-base font-semibold hover:bg-zinc-800 cursor-pointer"
                >
                  −
                </button>
                <span className="text-2xl font-semibold text-zinc-100 w-12 text-center">
                  {form.stamps_required}
                </span>
                <button
                  type="button"
                  onClick={() => set('stamps_required', Math.min(20, form.stamps_required + 1))}
                  className="w-8 h-8 bg-zinc-850 border border-zinc-700 rounded-md text-zinc-200 text-base font-semibold hover:bg-zinc-800 cursor-pointer"
                >
                  +
                </button>
              </div>
              {errors.stamps_required && <p className="mt-1 text-xs text-rose-400">{errors.stamps_required}</p>}
            </div>

            <Input
              label="Reward Description"
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
              label="Google Review Link (optional)"
              placeholder="https://g.page/your-business"
              value={form.gmb_link}
              onChange={(e) => set('gmb_link', e.target.value)}
              error={errors.gmb_link}
            />

            <div className="flex gap-2.5 pt-1">
              <Button variant="secondary" size="sm" onClick={() => setStep(1)} className="flex-1">← Back</Button>
              <Button size="sm" onClick={handleNext} className="flex-1">Next Step →</Button>
            </div>
          </div>
        )}

        {/* Step 3 — Security Mode */}
        {step === 3 && (
          <div className="bg-zinc-900/50 rounded-lg p-6 border border-zinc-800 space-y-4 shadow-xs">
            <div>
              <h2 className="text-sm font-semibold text-zinc-200">Stamp Verification Mode</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Choose how customer stamps are verified.</p>
            </div>

            {[
              {
                id: 'basic' as const,
                label: 'Simple QR',
                desc: 'Static QR code. 4-hour cooldown between stamps.',
                badge: 'Basic',
                badgeColor: 'bg-zinc-800 text-zinc-400 border-zinc-700',
              },
              {
                id: 'smart' as const,
                label: 'Auto-Refresh QR',
                desc: 'QR refreshes automatically every 30s to prevent sharing.',
                badge: 'Recommended',
                badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
              },
              {
                id: 'strict' as const,
                label: 'Staff Verified',
                desc: 'Auto-Refresh QR + Staff PIN required for every stamp.',
                badge: 'Pro',
                badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
              },
            ].map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => set('security_mode', mode.id)}
                className={`w-full text-left p-3.5 rounded-md border transition-colors cursor-pointer ${
                  form.security_mode === mode.id
                    ? 'border-zinc-400 bg-zinc-850/80'
                    : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      form.security_mode === mode.id ? 'border-zinc-100' : 'border-zinc-600'
                    }`}>
                      {form.security_mode === mode.id && (
                        <div className="w-1.5 h-1.5 rounded-full bg-zinc-100" />
                      )}
                    </div>
                    <span className="text-xs font-semibold text-zinc-100">{mode.label}</span>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded border font-medium ${mode.badgeColor}`}>
                    {mode.badge}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1 ml-6 leading-relaxed">{mode.desc}</p>
              </button>
            ))}

            {form.security_mode === 'strict' && (
              <Alert
                type="info"
                message="Staff PIN Verification requires IntelliStamp Pro. You can still complete setup and upgrade later."
              />
            )}

            {error && <Alert type="error" message={error} />}

            <div className="flex gap-2.5 pt-1">
              <Button variant="secondary" size="sm" onClick={() => setStep(2)} className="flex-1">← Back</Button>
              <Button size="sm" onClick={handleSubmit} loading={loading} className="flex-1">
                Create Stamp Card
              </Button>
            </div>
          </div>
        )}

        {/* Step 4 — Milestone Rewards */}
        {step === 4 && (
          <div className="bg-zinc-900/50 rounded-lg p-6 border border-zinc-800 space-y-4 shadow-xs">
            <div>
              <h2 className="text-sm font-semibold text-zinc-200">
                Milestone Rewards (Optional)
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Reward customers for reaching total lifetime visit counts. You can also configure this later in Settings.
              </p>
            </div>

            {milestones.length > 0 && (
              <div className="space-y-2.5">
                {milestones.map((m, i) => (
                  <div key={i} className="bg-zinc-850/60 rounded-md p-3.5 border border-zinc-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-300">Milestone {i + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeMilestone(i)}
                        className="text-xs text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                      >
                        ✕ Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] text-zinc-400 mb-1">At visit #</label>
                        <input
                          type="number"
                          value={m.visit_number}
                          min={1}
                          onChange={(e) => updateMilestone(i, 'visit_number', parseInt(e.target.value) || 1)}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-zinc-400 mb-1">Badge emoji</label>
                        <input
                          type="text"
                          value={m.badge}
                          maxLength={4}
                          onChange={(e) => updateMilestone(i, 'badge', e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">Reward description</label>
                      <input
                        type="text"
                        value={m.reward}
                        placeholder="e.g. Free birthday drink"
                        maxLength={100}
                        onChange={(e) => updateMilestone(i, 'reward', e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={addMilestone}
              className="w-full py-2.5 rounded-md border border-dashed border-zinc-700 text-zinc-400 text-xs font-medium hover:border-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer"
            >
              + Add Milestone
            </button>

            {milestonesError && <Alert type="error" message={milestonesError} />}

            <div className="flex gap-2.5 pt-1">
              <Button variant="secondary" size="sm" onClick={() => setStep(3)} className="flex-1">← Back</Button>
              <Button size="sm" onClick={handleMilestoneContinue} loading={milestonesLoading} className="flex-1">
                Continue →
              </Button>
            </div>

            <button
              type="button"
              onClick={() => setStep(5)}
              className="w-full text-center text-xs text-zinc-500 hover:text-zinc-300 transition-colors py-1 cursor-pointer"
            >
              Skip milestone setup
            </button>
          </div>
        )}

        {/* Step 5 — Ready */}
        {step === 5 && (
          <div className="bg-zinc-900/50 rounded-lg p-6 border border-zinc-800 text-center space-y-5 shadow-xs">
            <div className="text-4xl">{form.emoji}</div>

            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-zinc-100">Setup Complete!</h2>
              <p className="text-xs text-zinc-400">Your loyalty program structure is now created.</p>
            </div>

            <div className="space-y-2 text-left bg-zinc-850/60 p-3.5 rounded-md border border-zinc-800 text-xs text-zinc-300">
              {CHECKLIST_ITEMS.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-emerald-400 font-semibold">✓</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
            
            <div className="space-y-1.5 pt-1">
              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium py-1.5 px-3 rounded-full inline-block">
                Review in progress
              </div>
              <p className="text-xs text-zinc-400">
                Intellical Labs is reviewing your account for activation.
              </p>
            </div>

            <div className="pt-2 space-y-2">
              <Button
                onClick={() => router.push('/dashboard')}
                className="w-full"
                size="sm"
              >
                Go to Dashboard →
              </Button>
              <p className="text-[11px] text-zinc-500">
                Need help? <a href="mailto:hello@intellicallabs.com" className="text-zinc-400 hover:underline">Contact Support</a>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
