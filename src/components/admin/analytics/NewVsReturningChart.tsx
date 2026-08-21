'use client'

import React from 'react'
import type { ActivityDataPoint } from '@/lib/server/analytics'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'

interface NewVsReturningChartProps {
  data: ActivityDataPoint[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-zinc-950 border border-zinc-700 p-3 rounded-lg shadow-xl text-xs space-y-1.5 min-w-[140px]">
        <p className="font-semibold text-zinc-200 pb-1 border-b border-zinc-800">{label}</p>
        {payload.map((entry: { name: string; value: number; color: string }, idx: number) => (
          <div key={idx} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-zinc-400">
              <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
              {entry.name}:
            </span>
            <span className="font-mono font-bold text-zinc-100">{entry.value}</span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

export default function NewVsReturningChart({ data }: NewVsReturningChartProps) {
  const hasActivity = data.some((d) => d.newCustomers > 0 || d.returningCustomers > 0)

  if (!hasActivity) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 text-center space-y-2 h-full flex flex-col justify-center">
        <h3 className="text-sm font-semibold text-zinc-300">New vs Returning Customers</h3>
        <p className="text-xs text-zinc-500">
          Repeat customer distribution will appear as customers return for multiple visits.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">New vs Returning Customers</h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Repeat visit trends over time
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
            <span className="text-zinc-400 text-[11px]">New</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500" />
            <span className="text-zinc-400 text-[11px]">Returning</span>
          </div>
        </div>
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272A" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="#71717A"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#3F3F46' }}
              minTickGap={20}
            />
            <YAxis
              stroke="#71717A"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#3F3F46' }}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="newCustomers"
              name="New Customers"
              stackId="a"
              fill="#F59E0B"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="returningCustomers"
              name="Returning Customers"
              stackId="a"
              fill="#6366F1"
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
