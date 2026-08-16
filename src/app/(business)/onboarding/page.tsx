'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/auth-helpers-nextjs'
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
  '✅ Business profile created',
  '✅ Stamp card configured',
  '✅ Security mode set',
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

  // Step 5 — ready screen animations
  const [visibleChecks, setVisibleChecks] = useState([false, false, false, false])
  const [showPulse, setShowPulse] = useState(false)

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

  // Stagger checklist items + trigger pulse on ready screen
  useEffect(() => {
    if (step !== 5) return
    const timers: ReturnType<typeof setTimeout>[] = []
    ;[0, 1, 2, 3].forEach((i) => {
      timers.push(
        setTimeout(() => {
          setVisibleChecks((prev) => {
            const next = [...prev]
            next[i] = true
            return next
          })
        }, 200 + i * 100)
      )
    })
    timers.push(setTimeout(() => setShowPulse(true), 200 + 4 * 100 + 200))
    return () => timers.forEach(clearTimeout)
  }, [step])

  return (
    <div className="min-h-screen bg-zinc-950 p-4 flex flex-col items-center justify-center">
      <style>{`
        @keyframes _ob_scaleIn { from { transform: scale(0.3); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes _ob_fadeUp { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes _ob_pulseOnce { 0%,100% { transform: scale(1); } 50% { transform: scale(1.04); box-shadow: 0 0 0 10px rgba(250,204,21,0.15); } }
        ._ob_emoji { animation: _ob_scaleIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both; }
        ._ob_check { animation: _ob_fadeUp 0.3s ease both; }
        ._ob_pulse { animation: _ob_pulseOnce 0.6s ease both; }
      `}</style>

      <div className="w-full max-w-md">
        {/* Header */}
        <div className="relative text-center mb-8">
          <button 
            onClick={() => {
              createBrowserClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
              ).auth.signOut().then(() => router.push('/login'))
            }}
            className="absolute right-0 top-0 text-xs font-medium text-zinc-500 hover:text-white px-2 py-1 rounded hover:bg-zinc-800 transition-colors"
          >
            Sign Out
          </button>
          <div className="text-4xl mb-2 mt-4">🏷️</div>
          <h1 className="text-2xl font-black text-white">IntelliStamp</h1>
          <p className="text-zinc-400 text-sm">Set up your loyalty card in 5 steps</p>
        </div>

        {/* Step indicator — always visible */}
        <div className="flex items-center justify-center gap-1.5 mb-8">
          {[1, 2, 3, 4, 5].map((s) => (
            <div key={s} className="flex items-center gap-1.5">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                s < step ? 'bg-yellow-400 text-black' :
                s === step ? 'bg-yellow-400 text-black' :
                'bg-zinc-800 text-zinc-500'
              }`}>
                {s < step ? '✓' : s}
              </div>
              {s < 5 && <div className={`w-7 h-0.5 ${s < step ? 'bg-yellow-400' : 'bg-zinc-800'}`} />}
            </div>
          ))}
        </div>

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
              label="Google Review Link (optional)"
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
            <h2 className="text-lg font-bold text-white">Stamp Verification</h2>
            <p className="text-xs text-zinc-400">94% of IntelliStamp businesses use Auto-Refresh QR mode</p>

            {[
              {
                id: 'basic' as const,
                label: 'Simple',
                desc: 'Basic QR code. 4-hour time between stamps.',
                badge: 'FREE',
                badgeColor: 'bg-zinc-700 text-zinc-300',
              },
              {
                id: 'smart' as const,
                label: 'Auto-Refresh QR',
                desc: 'QR refreshes automatically to prevent sharing',
                badge: '⚡ RECOMMENDED',
                badgeColor: 'bg-yellow-400/20 text-yellow-400',
              },
              {
                id: 'strict' as const,
                label: 'Staff Verified',
                desc: 'Auto-Refresh QR + Staff PIN required',
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
                message="Staff PIN Verification requires IntelliStamp Pro. You can still complete setup and upgrade later."
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

        {/* Step 4 — Milestone Rewards (optional) */}
        {step === 4 && (
          <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 space-y-5">
            <div>
              <h2
                className="text-3xl text-white tracking-wide"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                ADD MILESTONE REWARDS
              </h2>
              <p className="text-sm text-zinc-400 mt-1">
                Reward customers for reaching visit milestones.
                <br />
                You can always add these later from Settings.
              </p>
            </div>

            {milestones.length > 0 && (
              <div className="space-y-3">
                {milestones.map((m, i) => (
                  <div key={i} className="bg-zinc-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-zinc-300">Milestone {i + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeMilestone(i)}
                        className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
                      >
                        ✕ Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">At visit #</label>
                        <input
                          type="number"
                          value={m.visit_number}
                          min={1}
                          onChange={(e) => updateMilestone(i, 'visit_number', parseInt(e.target.value) || 1)}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Badge emoji</label>
                        <input
                          type="text"
                          value={m.badge}
                          maxLength={4}
                          onChange={(e) => updateMilestone(i, 'badge', e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Reward description</label>
                      <input
                        type="text"
                        value={m.reward}
                        placeholder="e.g. Free birthday drink"
                        maxLength={100}
                        onChange={(e) => updateMilestone(i, 'reward', e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={addMilestone}
              className="w-full py-3 rounded-xl border-2 border-dashed border-zinc-700 text-zinc-400 text-sm font-medium hover:border-zinc-500 hover:text-zinc-300 transition-colors"
            >
              + Add Milestone
            </button>

            {milestonesError && <Alert type="error" message={milestonesError} />}

            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setStep(3)} className="flex-1">← Back</Button>
              <Button onClick={handleMilestoneContinue} loading={milestonesLoading} className="flex-1">
                CONTINUE →
              </Button>
            </div>

            <button
              type="button"
              onClick={() => setStep(5)}
              className="w-full text-center text-sm text-zinc-500 hover:text-zinc-300 transition-colors py-1"
            >
              Skip — set up later
            </button>
          </div>
        )}

        {/* Step 5 — Ready */}
        {step === 5 && (
          <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 text-center space-y-6">
            <div className="text-6xl _ob_emoji">{form.emoji}</div>

            <h2
              className="text-white tracking-wide"
              style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem' }}
            >
              SETUP COMPLETE!
            </h2>

            <div className="space-y-3 text-left bg-zinc-800/50 p-4 rounded-xl">
              {CHECKLIST_ITEMS.map((item, i) => (
                <div
                  key={i}
                  className={`text-zinc-300 font-medium text-sm ${visibleChecks[i] ? '_ob_check' : 'opacity-0'}`}
                >
                  {item}
                </div>
              ))}
            </div>
            
            <div className={`space-y-2 ${visibleChecks[3] ? '_ob_check' : 'opacity-0'}`}>
              <div className="bg-yellow-400/10 text-yellow-400 text-sm font-semibold py-2 px-4 rounded-lg inline-block mb-2">
                ⏳ Review in progress
              </div>
              <p className="text-sm text-zinc-400">
                Your setup is complete. Intellical Labs is reviewing your account.
              </p>
              <p className="text-xs text-zinc-500">
                Once approved, you can start using your stamp QR and loyalty features.
              </p>
            </div>

            <div className={`space-y-3 ${showPulse ? '_ob_check' : 'opacity-0'}`}>
              <Button
                onClick={() => router.push('/dashboard')}
                className={`w-full ${showPulse ? '_ob_pulse' : ''}`}
                size="lg"
              >
                Go to Dashboard →
              </Button>
              <p className="text-xs text-zinc-500">
                Need help? <a href="mailto:support@intellical.com" className="text-yellow-400 hover:underline">Contact Intellical Labs</a>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
