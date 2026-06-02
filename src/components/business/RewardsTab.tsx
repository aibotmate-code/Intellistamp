'use client'

import { useEffect, useRef, useState } from 'react'
import type { Business, ConflictPriority, Milestone } from '@/types'

// ── Local milestone type — animation flags + optional DB id ──────────────────
interface LocalMilestone {
  localId: string   // DB id for saved rows; `new-{timestamp}` for new ones
  id?: string       // only present after persisted to DB
  visit_number: number
  badge: string
  reward: string
  is_active: boolean
  mounted: boolean  // true once rAF fires — triggers enter animation
  removing: boolean // phase 1: slide out (200ms)
  collapsing: boolean // phase 2: height collapse (200ms)
}

interface RewardsTabProps {
  business: Business
  milestones: Milestone[]
  onSave: (updated: Business, milestones: Milestone[]) => void
}

type SaveStatus = 'idle' | 'saving' | 'success' | 'error'

const conflictOptions: Array<{
  value: ConflictPriority
  icon: string
  label: string
  sub: string
}> = [
  { value: 'stamp',     icon: '🔖', label: 'Stamp reward first', sub: 'Milestone fires next visit' },
  { value: 'milestone', icon: '🏆', label: 'Milestone first',    sub: 'Stamp fires next visit'    },
]

function toLocal(ms: Milestone[]): LocalMilestone[] {
  return ms
    .slice()
    .sort((a, b) => a.visit_number - b.visit_number)
    .map(m => ({
      localId: m.id,
      id: m.id,
      visit_number: m.visit_number,
      badge: m.badge,
      reward: m.reward,
      is_active: m.is_active,
      mounted: true,    // already on screen — no enter animation
      removing: false,
      collapsing: false,
    }))
}

export default function RewardsTab({
  business,
  milestones: initialMilestones,
  onSave,
}: RewardsTabProps) {
  // ── Form state ─────────────────────────────────────────────────────────────
  const [stampsRequired, setStampsRequired] = useState(business.stamps_required)
  const [reward, setReward] = useState(business.reward)
  const [conflictPriority, setConflictPriority] = useState<ConflictPriority>(
    business.conflict_priority
  )
  const [stampsFocused, setStampsFocused] = useState(false)

  // ── Milestone state ────────────────────────────────────────────────────────
  const [localMilestones, setLocalMilestones] = useState<LocalMilestone[]>(() =>
    toLocal(initialMilestones)
  )

  // ── Save state ─────────────────────────────────────────────────────────────
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [saveError, setSaveError] = useState('')

  // ── Field-level validation errors ─────────────────────────────────────────
  const [rewardError, setRewardError] = useState('')
  const [stampsError, setStampsError] = useState('')
  const [milestoneErrors, setMilestoneErrors] = useState<Record<string, string>>({})

  // ── Refs ───────────────────────────────────────────────────────────────────
  const saveBtnRef = useRef<HTMLButtonElement>(null)
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Derived ────────────────────────────────────────────────────────────────
  const activeMilestones = localMilestones.filter(m => !m.removing && !m.collapsing)
  const visitNumbers = activeMilestones.map(m => m.visit_number)
  const duplicateVisits = new Set(
    visitNumbers.filter((v, i) => visitNumbers.indexOf(v) !== i)
  )
  const hasDuplicates = duplicateVisits.size > 0

  // ── Enter animation: fire rAF after mount so CSS class sees the transition ─
  useEffect(() => {
    const unMounted = localMilestones.filter(m => !m.mounted)
    if (unMounted.length === 0) return
    const raf = requestAnimationFrame(() => {
      setLocalMilestones(prev =>
        prev.map(m => (!m.mounted ? { ...m, mounted: true } : m))
      )
    })
    return () => cancelAnimationFrame(raf)
  }, [localMilestones])

  // ── Next suggested visit number ────────────────────────────────────────────
  const nextVisit = () => {
    if (activeMilestones.length === 0) return 15
    return Math.max(...activeMilestones.map(m => m.visit_number)) + 15
  }

  // ── Add milestone ──────────────────────────────────────────────────────────
  const addMilestone = () => {
    const localId = `new-${Date.now()}`
    setLocalMilestones(prev => [
      ...prev,
      {
        localId,
        visit_number: nextVisit(),
        badge: 'Loyal Member',
        reward: '',
        is_active: true,
        mounted: false,   // rAF will flip this → triggers enter animation
        removing: false,
        collapsing: false,
      },
    ])
  }

  // ── Remove: slide → collapse → unmount (400ms total) ──────────────────────
  const removeMilestone = (localId: string) => {
    setLocalMilestones(prev =>
      prev.map(m => (m.localId === localId ? { ...m, removing: true } : m))
    )
    setTimeout(() => {
      setLocalMilestones(prev =>
        prev.map(m => (m.localId === localId ? { ...m, collapsing: true } : m))
      )
    }, 200)
    setTimeout(() => {
      setLocalMilestones(prev => prev.filter(m => m.localId !== localId))
    }, 400)
  }

  // ── Field update; resort by visit_number on blur ───────────────────────────
  const updateField = (
    localId: string,
    field: 'badge' | 'reward' | 'visit_number',
    value: string | number
  ) => {
    setLocalMilestones(prev =>
      prev.map(m => (m.localId === localId ? { ...m, [field]: value } : m))
    )
    // Clear field-level error when user edits
    setMilestoneErrors(prev => {
      const next = { ...prev }
      delete next[`${localId}-${field}`]
      return next
    })
  }

  const sortByVisit = () => {
    setLocalMilestones(prev => {
      const exiting = prev.filter(m => m.removing || m.collapsing)
      const active = prev
        .filter(m => !m.removing && !m.collapsing)
        .sort((a, b) => a.visit_number - b.visit_number)
      return [...exiting, ...active]
    })
  }

  // ── Shake animation (DOM ref — no key remount needed) ─────────────────────
  const triggerShake = () => {
    const btn = saveBtnRef.current
    if (!btn) return
    btn.classList.remove('_rwd-shake')
    void btn.offsetWidth // force reflow
    btn.classList.add('_rwd-shake')
    setTimeout(() => btn.classList.remove('_rwd-shake'), 450)
  }

  // ── Validate — sets per-field errors, returns false if invalid ─────────────
  const validate = (): boolean => {
    let ok = true
    const msErrs: Record<string, string> = {}

    setRewardError('')
    setStampsError('')

    if (!reward.trim()) {
      setRewardError('Stamp reward cannot be empty.')
      ok = false
    }

    const sr = Number(stampsRequired)
    if (isNaN(sr) || sr < 3 || sr > 20) {
      setStampsError('Must be between 3 and 20.')
      ok = false
    }

    if (hasDuplicates) {
      // Errors shown inline on the cards via the isDuplicate flag
      ok = false
    }

    for (const m of activeMilestones) {
      if (!m.badge.trim()) {
        msErrs[`${m.localId}-badge`] = 'Badge title is required.'
        ok = false
      }
      if (!m.reward.trim()) {
        msErrs[`${m.localId}-reward`] = 'Reward is required.'
        ok = false
      }
      if (!Number.isInteger(m.visit_number) || m.visit_number < 1) {
        msErrs[`${m.localId}-visit_number`] = 'Must be a whole number ≥ 1.'
        ok = false
      }
    }

    setMilestoneErrors(msErrs)
    return ok
  }

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!validate()) {
      triggerShake()
      return
    }

    setSaveStatus('saving')
    setSaveError('')

    try {
      const res = await fetch('/api/milestones/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: business.id,
          stamps_required: Number(stampsRequired),
          reward: reward.trim(),
          conflict_priority: conflictPriority,
          milestones: activeMilestones.map(m => ({
            visit_number: m.visit_number,
            badge: m.badge.trim(),
            reward: m.reward.trim(),
          })),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setSaveError(data.error ?? 'Failed to save. Please try again.')
        setSaveStatus('idle')
        triggerShake()
        return
      }

      const savedMs: Milestone[] = data.milestones ?? []
      setLocalMilestones(toLocal(savedMs))
      setSaveStatus('success')
      onSave(data.business, savedMs)

      if (successTimer.current) clearTimeout(successTimer.current)
      successTimer.current = setTimeout(() => setSaveStatus('idle'), 2000)
    } catch {
      setSaveError('Network error. Please try again.')
      setSaveStatus('idle')
      triggerShake()
    }
  }

  const saveBtnLabel = () => {
    if (saveStatus === 'saving') return null
    if (saveStatus === 'success') return '✓ SAVED'
    return 'SAVE REWARD CONFIGURATION'
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* Scoped keyframes — only affects this component */}
      <style>{`
        @keyframes _rwd-shake {
          0%,  100% { transform: translateX(0); }
          20%, 60%  { transform: translateX(-6px); }
          40%, 80%  { transform: translateX(6px); }
        }
        ._rwd-shake { animation: _rwd-shake 400ms ease-in-out; }

        @keyframes _rwd-ms-in {
          from { transform: translateY(16px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        ._rwd-ms-in {
          animation: _rwd-ms-in 250ms var(--ease-out, cubic-bezier(0.23,1,0.32,1)) forwards;
        }

        @keyframes _rwd-ms-out {
          from { transform: translateX(0);     opacity: 1; }
          to   { transform: translateX(-20px); opacity: 0; }
        }
        ._rwd-ms-out { animation: _rwd-ms-out 200ms ease-out forwards; }
      `}</style>

      {/* ══════════════════════════════════════════════
          SECTION 1 — STAMP CARD CONFIGURATION
      ══════════════════════════════════════════════ */}
      <section>
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Stamp Card Configuration
        </p>

        <div
          className="rounded-xl border p-4 space-y-3"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <div className="flex gap-3">
            {/* Visits Required */}
            <div className="flex-1">
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Visits Required
              </label>
              <input
                type="number"
                min={3}
                max={20}
                value={stampsRequired}
                onChange={e => {
                  const v = parseInt(e.target.value)
                  if (!isNaN(v)) setStampsRequired(v)
                  setStampsError('')
                }}
                onFocus={() => setStampsFocused(true)}
                onBlur={() => setStampsFocused(false)}
                className="input-field w-full rounded-lg px-4 py-3 text-base font-medium"
                style={{
                  background: 'var(--color-elevated)',
                  border: `1px solid ${stampsError ? 'var(--color-red)' : 'var(--color-border)'}`,
                  color: 'var(--color-text)',
                  minHeight: 48,
                }}
              />
              {stampsError && (
                <p className="text-xs mt-1" style={{ color: 'var(--color-red)' }}>
                  {stampsError}
                </p>
              )}
            </div>

            {/* Stamp Reward */}
            <div className="flex-1">
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Stamp Reward
              </label>
              <input
                type="text"
                maxLength={100}
                value={reward}
                onChange={e => {
                  setReward(e.target.value)
                  setRewardError('')
                }}
                placeholder="e.g. 1 Free Coffee"
                className="input-field w-full rounded-lg px-4 py-3 text-base"
                style={{
                  background: 'var(--color-elevated)',
                  border: `1px solid ${rewardError ? 'var(--color-red)' : 'var(--color-border)'}`,
                  color: 'var(--color-text)',
                  minHeight: 48,
                }}
              />
              {rewardError && (
                <p className="text-xs mt-1" style={{ color: 'var(--color-red)' }}>
                  {rewardError}
                </p>
              )}
            </div>
          </div>

          {/* Warning box — grid-template-rows expand (no height animation) */}
          <div
            style={{
              display: 'grid',
              gridTemplateRows: stampsFocused ? '1fr' : '0fr',
              transition: 'grid-template-rows 250ms ease-out',
            }}
          >
            <div style={{ overflow: 'hidden', minHeight: 0 }}>
              <div
                className="rounded-lg px-3 py-2.5 text-sm mt-1"
                style={{
                  background: 'oklch(0.18 0.06 55 / 0.5)',
                  border: '1px solid var(--color-gold-border)',
                  color: 'oklch(0.82 0.10 55)',
                }}
              >
                ⚠️ Changing visits required affects all active customers and may cause dissatisfaction.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          SECTION 2 — CONFLICT RESOLUTION
      ══════════════════════════════════════════════ */}
      <section>
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-1"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Conflict Resolution
        </p>
        <p className="text-xs mb-3" style={{ color: 'var(--color-text-dim)' }}>
          When stamp reward &amp; milestone fall on the same visit
        </p>

        <div className="flex gap-3">
          {conflictOptions.map(opt => {
            const active = conflictPriority === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => setConflictPriority(opt.value)}
                className="btn flex-1 rounded-xl p-4 text-left"
                style={{
                  background: active ? 'var(--color-purple-bg)' : 'var(--color-surface)',
                  border: `2px solid ${active ? 'var(--color-purple)' : 'var(--color-border)'}`,
                  transition: 'border-color 150ms ease, background-color 150ms ease',
                  minHeight: 48,
                }}
              >
                <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
                  {opt.icon} {opt.label}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  {opt.sub}
                </p>
              </button>
            )
          })}
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          SECTION 3 — MILESTONE REWARDS
      ══════════════════════════════════════════════ */}
      <section>
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-1"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Milestone Rewards
        </p>
        <p className="text-xs mb-4" style={{ color: 'var(--color-text-dim)' }}>
          One-time rewards based on total lifetime visits
        </p>

        {/* Empty state */}
        {activeMilestones.length === 0 && (
          <p className="text-sm py-4 text-center" style={{ color: 'var(--color-text-dim)' }}>
            No milestones yet. Add your first below.
          </p>
        )}

        {/* Milestone cards */}
        <div>
          {localMilestones.map(m => {
            const isDuplicate =
              !m.removing && !m.collapsing && duplicateVisits.has(m.visit_number)

            return (
              <div
                key={m.localId}
                // mounted=false → enter animation; removing → exit; collapsing → collapse
                className={
                  !m.mounted ? '_rwd-ms-in' : m.removing ? '_rwd-ms-out' : ''
                }
                style={{
                  display: 'grid',
                  gridTemplateRows: m.collapsing ? '0fr' : '1fr',
                  transition: m.collapsing ? 'grid-template-rows 200ms ease-out' : undefined,
                  marginBottom: m.collapsing ? 0 : '0.75rem',
                }}
              >
                {/* Inner wrapper — required for grid collapse */}
                <div style={{ overflow: 'hidden', minHeight: 0 }}>
                  <div
                    className="rounded-xl border p-4"
                    style={{
                      background: 'var(--color-surface)',
                      borderColor: isDuplicate ? 'var(--color-red)' : 'var(--color-border)',
                      transition: 'border-color 150ms ease',
                    }}
                  >
                    {/* Card header — badge pill + remove button */}
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className="text-xs font-bold px-2.5 py-1 rounded-md"
                        style={{
                          background: 'var(--color-purple-bg)',
                          color: 'var(--color-purple)',
                        }}
                      >
                        Visit {m.visit_number || '?'}
                      </span>
                      <button
                        onClick={() => removeMilestone(m.localId)}
                        className="btn btn-ghost text-xs rounded-md px-2 py-1"
                        style={{
                          color: 'var(--color-text-muted)',
                          minHeight: 32,
                          minWidth: 44,
                        }}
                        aria-label={`Remove milestone at visit ${m.visit_number}`}
                      >
                        ✕ Remove
                      </button>
                    </div>

                    {/* Fields */}
                    <div className="space-y-2.5">
                      {/* Badge Title */}
                      <div>
                        <label
                          className="block text-xs font-medium mb-1"
                          style={{ color: 'var(--color-text-muted)' }}
                        >
                          Badge Title
                        </label>
                        <input
                          type="text"
                          maxLength={30}
                          value={m.badge}
                          onChange={e => updateField(m.localId, 'badge', e.target.value)}
                          placeholder="e.g. Loyal Member"
                          className="input-field w-full rounded-lg px-3 py-2.5 text-sm"
                          style={{
                            background: 'var(--color-elevated)',
                            border: `1px solid ${milestoneErrors[`${m.localId}-badge`] ? 'var(--color-red)' : 'var(--color-border)'}`,
                            color: 'var(--color-text)',
                            minHeight: 44,
                          }}
                        />
                        {milestoneErrors[`${m.localId}-badge`] && (
                          <p className="text-xs mt-1" style={{ color: 'var(--color-red)' }}>
                            {milestoneErrors[`${m.localId}-badge`]}
                          </p>
                        )}
                      </div>

                      {/* Reward */}
                      <div>
                        <label
                          className="block text-xs font-medium mb-1"
                          style={{ color: 'var(--color-text-muted)' }}
                        >
                          Reward
                        </label>
                        <input
                          type="text"
                          maxLength={100}
                          value={m.reward}
                          onChange={e => updateField(m.localId, 'reward', e.target.value)}
                          placeholder="e.g. Free treat on us"
                          className="input-field w-full rounded-lg px-3 py-2.5 text-sm"
                          style={{
                            background: 'var(--color-elevated)',
                            border: `1px solid ${milestoneErrors[`${m.localId}-reward`] ? 'var(--color-red)' : 'var(--color-border)'}`,
                            color: 'var(--color-text)',
                            minHeight: 44,
                          }}
                        />
                        {milestoneErrors[`${m.localId}-reward`] && (
                          <p className="text-xs mt-1" style={{ color: 'var(--color-red)' }}>
                            {milestoneErrors[`${m.localId}-reward`]}
                          </p>
                        )}
                      </div>

                      {/* Visit Number */}
                      <div>
                        <label
                          className="block text-xs font-medium mb-1"
                          style={{ color: 'var(--color-text-muted)' }}
                        >
                          Visit Number
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={999}
                          value={m.visit_number}
                          onChange={e => {
                            const v = parseInt(e.target.value)
                            if (!isNaN(v) && v > 0) {
                              updateField(m.localId, 'visit_number', v)
                            }
                          }}
                          onBlur={sortByVisit}
                          className="input-field w-full rounded-lg px-3 py-2.5 text-sm"
                          style={{
                            background: 'var(--color-elevated)',
                            border: `1px solid ${
                              isDuplicate || milestoneErrors[`${m.localId}-visit_number`]
                                ? 'var(--color-red)'
                                : 'var(--color-border)'
                            }`,
                            color: 'var(--color-text)',
                            minHeight: 44,
                          }}
                        />
                        {isDuplicate && (
                          <p className="text-xs mt-1" style={{ color: 'var(--color-red)' }}>
                            Visit number must be unique
                          </p>
                        )}
                        {!isDuplicate && milestoneErrors[`${m.localId}-visit_number`] && (
                          <p className="text-xs mt-1" style={{ color: 'var(--color-red)' }}>
                            {milestoneErrors[`${m.localId}-visit_number`]}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Add Milestone button */}
        <AddMilestoneButton onClick={addMilestone} />
      </section>

      {/* ══════════════════════════════════════════════
          SECTION 4 — SAVE
      ══════════════════════════════════════════════ */}
      <section>
        {hasDuplicates && (
          <p className="text-sm mb-3" style={{ color: 'var(--color-red)' }}>
            Two milestones cannot have the same visit number.
          </p>
        )}
        {saveError && (
          <p className="text-sm mb-3" style={{ color: 'var(--color-red)' }}>
            {saveError}
          </p>
        )}

        <button
          ref={saveBtnRef}
          onClick={handleSave}
          disabled={saveStatus === 'saving' || hasDuplicates}
          className="btn btn-primary w-full flex items-center justify-center gap-2 rounded-xl py-4 font-bold text-base"
          style={{
            background:
              saveStatus === 'success' ? 'var(--color-green)' : 'var(--color-gold)',
            color: '#000',
            opacity: saveStatus === 'saving' ? 0.7 : 1,
            filter: saveStatus === 'saving' ? 'blur(2px)' : 'none',
            minHeight: 48,
            transition: 'background-color 200ms ease, opacity 150ms ease, filter 150ms ease',
          }}
          aria-busy={saveStatus === 'saving'}
        >
          {saveStatus === 'saving' ? (
            <>
              <svg
                className="animate-spin h-4 w-4 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Saving...
            </>
          ) : (
            saveBtnLabel()
          )}
        </button>
      </section>
    </div>
  )
}

// ── Extracted to avoid inline event handler recreation ────────────────────────
function AddMilestoneButton({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="btn w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold"
      style={{
        border: `2px dashed ${hovered ? 'var(--color-gold)' : 'var(--color-border)'}`,
        color: hovered ? 'var(--color-gold)' : 'var(--color-text-muted)',
        background: 'transparent',
        minHeight: 48,
        transition: 'border-color 150ms ease, color 150ms ease',
      }}
    >
      <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>+</span>
      Add Milestone
    </button>
  )
}
