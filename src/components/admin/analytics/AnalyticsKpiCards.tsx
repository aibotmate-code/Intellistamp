'use client'

import React from 'react'
import type { BusinessAnalyticsKPIs } from '@/lib/server/analytics'
import {
  Users,
  UserPlus,
  UserCheck,
  ArrowClockwise,
  Stamp,
  Percent,
  TrendUp,
  TrendDown,
  Minus,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface AnalyticsKpiCardsProps {
  kpis: BusinessAnalyticsKPIs
  periodLabel: string
}

function DeltaBadge({
  percent,
  direction,
  periodLabel,
}: {
  percent: number | null
  direction: 'up' | 'down' | 'neutral'
  periodLabel: string
}) {
  if (percent === null) {
    return <span className="text-[11px] text-zinc-500">Lifetime metric</span>
  }

  const isPositive = direction === 'up'
  const isNegative = direction === 'down'

  return (
    <div className="flex items-center gap-1 text-[11px]">
      <span
        className={cn(
          'inline-flex items-center gap-0.5 font-medium px-1.5 py-0.5 rounded-sm',
          isPositive && 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
          isNegative && 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
          !isPositive && !isNegative && 'bg-zinc-800 text-zinc-400 border border-zinc-700'
        )}
      >
        {isPositive && <TrendUp size={12} weight="bold" />}
        {isNegative && <TrendDown size={12} weight="bold" />}
        {!isPositive && !isNegative && <Minus size={12} />}
        <span>{percent > 0 ? `+${percent}%` : `${percent}%`}</span>
      </span>
      <span className="text-zinc-500">vs prev {periodLabel}</span>
    </div>
  )
}

export default function AnalyticsKpiCards({ kpis, periodLabel }: AnalyticsKpiCardsProps) {
  const cards = [
    {
      label: 'Total Customers',
      value: kpis.totalCustomers.current.toLocaleString(),
      icon: <Users size={18} className="text-zinc-400" />,
      delta: (
        <DeltaBadge
          percent={kpis.totalCustomers.percentChange}
          direction={kpis.totalCustomers.direction}
          periodLabel={periodLabel}
        />
      ),
      subtitle: `${kpis.nearRewardCount} near reward`,
    },
    {
      label: `New Customers (${periodLabel})`,
      value: kpis.newCustomers.current.toLocaleString(),
      icon: <UserPlus size={18} className="text-amber-400" />,
      delta: (
        <DeltaBadge
          percent={kpis.newCustomers.percentChange}
          direction={kpis.newCustomers.direction}
          periodLabel={periodLabel}
        />
      ),
      subtitle: 'First enrolled during period',
    },
    {
      label: `Active Customers (${periodLabel})`,
      value: kpis.activeCustomers.current.toLocaleString(),
      icon: <UserCheck size={18} className="text-blue-400" />,
      delta: (
        <DeltaBadge
          percent={kpis.activeCustomers.percentChange}
          direction={kpis.activeCustomers.direction}
          periodLabel={periodLabel}
        />
      ),
      subtitle: 'Unique visitors with activity',
    },
    {
      label: `Returning Customers (${periodLabel})`,
      value: kpis.returningCustomers.current.toLocaleString(),
      icon: <ArrowClockwise size={18} className="text-indigo-400" />,
      delta: (
        <DeltaBadge
          percent={kpis.returningCustomers.percentChange}
          direction={kpis.returningCustomers.direction}
          periodLabel={periodLabel}
        />
      ),
      subtitle: 'Repeat qualifying loyalty activity',
    },
    {
      label: `Stamps Issued (${periodLabel})`,
      value: kpis.stampsIssued.current.toLocaleString(),
      icon: <Stamp size={18} className="text-amber-500" />,
      delta: (
        <DeltaBadge
          percent={kpis.stampsIssued.percentChange}
          direction={kpis.stampsIssued.direction}
          periodLabel={periodLabel}
        />
      ),
      subtitle: `${kpis.rewardsRedeemed.current} lifetime rewards claimed`,
    },
    {
      label: 'Return Rate',
      value: `${kpis.returnRate.rate}%`,
      icon: <Percent size={18} className="text-emerald-400" />,
      delta: (
        <DeltaBadge
          percent={kpis.returnRate.percentChange}
          direction={
            kpis.returnRate.percentChange && kpis.returnRate.percentChange > 0
              ? 'up'
              : kpis.returnRate.percentChange && kpis.returnRate.percentChange < 0
              ? 'down'
              : 'neutral'
          }
          periodLabel={periodLabel}
        />
      ),
      subtitle: 'Customers who returned during period',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
      {cards.map((c, i) => (
        <div
          key={i}
          className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between shadow-xs transition-colors hover:border-zinc-700"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-zinc-400">{c.label}</span>
            <div className="p-1.5 bg-zinc-800/80 rounded-md shrink-0">{c.icon}</div>
          </div>

          <div className="mt-2.5 mb-2">
            <div className="text-2xl font-bold text-zinc-100 tracking-tight">{c.value}</div>
          </div>

          <div className="pt-2 border-t border-zinc-800/60 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
            {c.delta}
            <span className="text-[11px] text-zinc-500">{c.subtitle}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
