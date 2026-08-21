'use client'

import React, { useState, useEffect } from 'react'
import type { TenantActivityEvent } from '@/lib/server/analytics'
import Spinner from '@/components/ui/Spinner'
import Alert from '@/components/ui/Alert'
import { Stamp, UserPlus, Gift, ShieldCheck, Clock } from '@phosphor-icons/react'

interface AdminActivityFeedProps {
  businessId: string
}

function EventIcon({ type }: { type: TenantActivityEvent['type'] }) {
  switch (type) {
    case 'stamp_issued':
      return (
        <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <Stamp size={16} />
        </div>
      )
    case 'customer_enrolled':
      return (
        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <UserPlus size={16} />
        </div>
      )
    case 'reward_redeemed':
    case 'milestone_claimed':
      return (
        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <Gift size={16} />
        </div>
      )
    default:
      return (
        <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
          <ShieldCheck size={16} />
        </div>
      )
  }
}

export default function AdminActivityFeed({ businessId }: AdminActivityFeedProps) {
  const [events, setEvents] = useState<TenantActivityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const loadActivity = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await fetch(`/api/admin/business/${businessId}/activity`, { cache: 'no-store' })
        if (!res.ok) {
          throw new Error('Failed to load activity feed')
        }
        const data = await res.json()
        if (active) {
          setEvents(data.activity || [])
        }
      } catch (err: unknown) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Error loading activity feed')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadActivity()
    return () => { active = false }
  }, [businessId])

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center space-y-3">
        <Spinner />
        <p className="text-xs text-zinc-400">Loading activity feed...</p>
      </div>
    )
  }

  if (error) {
    return <Alert type="error" message={error} />
  }

  if (events.length === 0) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-10 text-center space-y-2">
        <Clock size={28} className="mx-auto text-zinc-500 mb-2" />
        <h3 className="text-sm font-semibold text-zinc-300">No activity recorded yet</h3>
        <p className="text-xs text-zinc-500 max-w-sm mx-auto">
          Audit events, customer scans, and reward claims will appear in chronological order as customers interact with this business.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">Live Activity Feed</h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Chronological audit log for this tenant (newest first)
          </p>
        </div>
        <span className="text-xs text-zinc-400 font-mono">{events.length} events</span>
      </div>

      <div className="space-y-3">
        {events.map((ev) => (
          <div
            key={ev.id}
            className="flex items-start justify-between gap-4 p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700 transition-colors"
          >
            <div className="flex items-start gap-3 min-w-0">
              <EventIcon type={ev.type} />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-zinc-200">{ev.title}</span>
                  {ev.actor && (
                    <span className="text-[10px] text-zinc-500 bg-zinc-800/80 px-1.5 py-0.2 rounded font-mono">
                      {ev.actor}
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 mt-0.5 break-words">{ev.description}</p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[11px] font-mono text-zinc-500 whitespace-nowrap">
                {new Date(ev.timestamp).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
