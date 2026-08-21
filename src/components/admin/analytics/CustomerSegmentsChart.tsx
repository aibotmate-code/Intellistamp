'use client'

import React from 'react'
import type { CustomerSegment } from '@/lib/server/analytics'

interface CustomerSegmentsChartProps {
  segments: CustomerSegment[]
  totalCustomers: number
}

export default function CustomerSegmentsChart({
  segments,
  totalCustomers,
}: CustomerSegmentsChartProps) {
  if (totalCustomers === 0) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 text-center space-y-2 h-full flex flex-col justify-center">
        <h3 className="text-sm font-semibold text-zinc-300">Loyalty Customer Segments</h3>
        <p className="text-xs text-zinc-500">
          Customer lifecycle breakdown will appear after first enrollments.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-100">Loyalty Customer Segments</h3>
          <span className="text-xs text-zinc-400 font-mono">{totalCustomers} total</span>
        </div>
        <p className="text-xs text-zinc-400 mt-0.5">
          Distribution across mutually exclusive lifecycle stages
        </p>
      </div>

      {/* Segment Distribution Bar */}
      <div className="space-y-3">
        <div className="h-3 w-full rounded-full bg-zinc-800 overflow-hidden flex">
          {segments.map((seg, i) =>
            seg.percentage > 0 ? (
              <div
                key={i}
                style={{ width: `${seg.percentage}%`, background: seg.color }}
                title={`${seg.name}: ${seg.count} (${seg.percentage}%)`}
                className="h-full first:rounded-l-full last:rounded-r-full transition-all"
              />
            ) : null
          )}
        </div>

        {/* Detailed Legend & Counts */}
        <div className="space-y-2 pt-1">
          {segments.map((seg, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-xs" style={{ background: seg.color }} />
                <span className="text-zinc-300 font-medium">{seg.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-zinc-100 font-semibold">{seg.count}</span>
                <span className="text-zinc-500 w-9 text-right font-mono">{seg.percentage}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-2 border-t border-zinc-800/60 text-[11px] text-zinc-500">
        Stages update continuously as customers stamp and redeem cards.
      </div>
    </div>
  )
}
