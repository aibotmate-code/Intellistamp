'use client'

import React, { useState, useEffect } from 'react'
import type { BusinessAnalyticsPayload, AnalyticsPeriod } from '@/lib/server/analytics'
import AnalyticsKpiCards from './analytics/AnalyticsKpiCards'
import CustomerActivityChart from './analytics/CustomerActivityChart'
import NewVsReturningChart from './analytics/NewVsReturningChart'
import CustomerSegmentsChart from './analytics/CustomerSegmentsChart'
import AdminExportMenu from './AdminExportMenu'
import Spinner from '@/components/ui/Spinner'
import Alert from '@/components/ui/Alert'
import { Sparkle, ChartLineUp } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface AdminAnalyticsViewProps {
  businessId: string
}

export default function AdminAnalyticsView({ businessId }: AdminAnalyticsViewProps) {
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d')
  const [data, setData] = useState<BusinessAnalyticsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const fetchAnalytics = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await fetch(`/api/admin/business/${businessId}/analytics?period=${period}`, {
          cache: 'no-store',
        })
        if (!res.ok) {
          throw new Error('Failed to load business analytics')
        }
        const json = await res.json()
        if (active) {
          setData(json.analytics)
        }
      } catch (err: unknown) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Error loading analytics')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchAnalytics()
    return () => { active = false }
  }, [businessId, period])

  const periodLabel = period === '7d' ? '7 days' : period === '90d' ? '90 days' : '30 days'

  if (loading && !data) {
    return (
      <div className="py-16 flex flex-col items-center justify-center space-y-3">
        <Spinner />
        <p className="text-xs text-zinc-400">Aggregating business analytics...</p>
      </div>
    )
  }

  if (error) {
    return <Alert type="error" message={error} />
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      {/* Top Controls: Period Selection, Export Menu & Health Summary */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <ChartLineUp size={20} className="text-amber-500" />
            <h2 className="text-base font-semibold text-zinc-100">Loyalty Performance</h2>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Customer adoption, retention, and engagement metrics vs previous {periodLabel}
          </p>
        </div>

        {/* Period Selector Tabs & Export Menu */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-1 text-xs">
            {(['7d', '30d', '90d'] as AnalyticsPeriod[]).map((p) => {
              const isSel = period === p
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={cn(
                    'px-3 py-1 rounded-md font-medium cursor-pointer transition-colors',
                    isSel
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200'
                  )}
                >
                  {p.toUpperCase()}
                </button>
              )
            })}
          </div>

          <AdminExportMenu businessId={businessId} period={period} />
        </div>
      </div>

      {/* Deterministic Business Health Summary Callout */}
      <div className="bg-zinc-900/70 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3 shadow-xs">
        <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-400 shrink-0 mt-0.5">
          <Sparkle size={16} weight="fill" />
        </div>
        <div>
          <span className="text-[10px] uppercase font-semibold text-amber-500 tracking-wider">
            Loyalty Intelligence Summary
          </span>
          <p className="text-xs text-zinc-200 font-medium mt-0.5 leading-relaxed">
            {data.summaryStatement}
          </p>
        </div>
      </div>

      {/* KPI Cards Row */}
      <AnalyticsKpiCards kpis={data.kpis} periodLabel={periodLabel} />

      {/* Main Chart: Customer Activity */}
      <CustomerActivityChart data={data.timeSeries} />

      {/* Second Row: New vs Returning Customers + Customer Segments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <NewVsReturningChart data={data.timeSeries} />
        <CustomerSegmentsChart
          segments={data.customerSegments}
          totalCustomers={data.kpis.totalCustomers.current}
        />
      </div>
    </div>
  )
}
