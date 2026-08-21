'use client'

import React, { useState, useEffect } from 'react'
import type { TenantCustomerDetail } from '@/lib/server/analytics'
import Input from '@/components/ui/Input'
import Spinner from '@/components/ui/Spinner'
import Alert from '@/components/ui/Alert'
import { MagnifyingGlass, Users, Gift } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface AdminCustomersTableProps {
  businessId: string
}

function StatusBadge({ status }: { status: TenantCustomerDetail['status'] }) {
  const styles = {
    'Reward Ready': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    'Near Reward': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    'Active': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'New': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    'Inactive': 'bg-zinc-800 text-zinc-400 border-zinc-700',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border',
        styles[status] || styles['Active']
      )}
    >
      {status}
    </span>
  )
}

function formatRelativeTime(dateIso: string | null): string {
  if (!dateIso) return 'Never'
  const ms = new Date(dateIso).getTime()
  if (isNaN(ms)) return 'Never'
  const diffDays = Math.floor((Date.now() - ms) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 30) return `${diffDays}d ago`
  return new Date(dateIso).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
}

export default function AdminCustomersTable({ businessId }: AdminCustomersTableProps) {
  const [customers, setCustomers] = useState<TenantCustomerDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    let active = true
    const loadCustomers = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await fetch(`/api/admin/business/${businessId}/customers`, { cache: 'no-store' })
        if (!res.ok) {
          throw new Error('Failed to load customer list')
        }
        const data = await res.json()
        if (active) {
          setCustomers(data.customers || [])
        }
      } catch (err: unknown) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Error loading customers')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadCustomers()
    return () => { active = false }
  }, [businessId])

  const filtered = customers.filter((c) => {
    const matchesSearch =
      search.trim() === '' ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      c.maskedPhone.includes(search)

    const matchesStatus = statusFilter === 'all' || c.status === statusFilter

    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center space-y-3">
        <Spinner />
        <p className="text-xs text-zinc-400">Loading tenant customers...</p>
      </div>
    )
  }

  if (error) {
    return <Alert type="error" message={error} />
  }

  return (
    <div className="space-y-4">
      {/* Table Header Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Input
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
          <MagnifyingGlass size={15} className="absolute left-3 top-2.5 text-zinc-400" />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
          {['all', 'Reward Ready', 'Near Reward', 'Active', 'New', 'Inactive'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={cn(
                'px-2.5 py-1 rounded-md cursor-pointer transition-colors whitespace-nowrap',
                statusFilter === st
                  ? 'bg-zinc-800 text-zinc-100 font-semibold border border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              )}
            >
              {st === 'all' ? `All (${customers.length})` : st}
            </button>
          ))}
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950/70 border-b border-zinc-800 text-zinc-400 uppercase tracking-wider font-semibold text-[10px]">
              <tr>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Total Stamps</th>
                <th className="py-3 px-4">Card Progress</th>
                <th className="py-3 px-4">Rewards Claimed</th>
                <th className="py-3 px-4">Last Visit</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-zinc-500">
                    <Users size={24} className="mx-auto mb-2 opacity-50" />
                    <p className="text-xs">No customers match the current filter.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((cust) => (
                  <tr key={cust.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-zinc-100">{cust.name}</div>
                      <div className="text-[11px] font-mono text-zinc-400 mt-0.5">{cust.maskedPhone}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-amber-400">
                      {cust.totalStamps}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-zinc-100">
                          {cust.cardStamps} / {cust.stampsRequired}
                        </span>
                        <div className="w-16 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                          <div
                            className="h-full bg-amber-500 rounded-full"
                            style={{
                              width: `${Math.min(100, (cust.cardStamps / cust.stampsRequired) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {cust.cardsRedeemed > 0 ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-mono font-semibold">
                          <Gift size={13} />
                          <span>{cust.cardsRedeemed}</span>
                        </span>
                      ) : (
                        <span className="text-zinc-500 font-mono">0</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-400 font-mono text-[11px]">
                      {formatRelativeTime(cust.lastVisit)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <StatusBadge status={cust.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
