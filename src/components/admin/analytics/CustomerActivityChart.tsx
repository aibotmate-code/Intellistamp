'use client'

import React from 'react'
import type { ActivityDataPoint } from '@/lib/server/analytics'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'

interface CustomerActivityChartProps {
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

export default function CustomerActivityChart({ data }: CustomerActivityChartProps) {
  const hasActivity = data.some((d) => d.stampsIssued > 0 || d.activeCustomers > 0)

  if (!hasActivity) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 text-center space-y-2">
        <h3 className="text-sm font-semibold text-zinc-300">Customer Activity</h3>
        <div className="h-48 flex flex-col items-center justify-center text-xs text-zinc-500">
          <p className="font-medium text-zinc-400">Not enough activity yet</p>
          <p className="text-[11px] text-zinc-500 mt-1">
            Analytics and trend lines will appear as customers begin scanning and receiving stamps.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">Customer Activity</h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Daily unique active customers vs stamps issued
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-zinc-400 text-[11px]">Stamps Issued</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
            <span className="text-zinc-400 text-[11px]">Active Customers</span>
          </div>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
            <Legend wrapperStyle={{ display: 'none' }} />
            <Line
              type="monotone"
              dataKey="stampsIssued"
              name="Stamps Issued"
              stroke="#F59E0B"
              strokeWidth={2.5}
              dot={{ fill: '#F59E0B', r: 3 }}
              activeDot={{ r: 5, stroke: '#FDE68A', strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="activeCustomers"
              name="Active Customers"
              stroke="#60A5FA"
              strokeWidth={2}
              dot={{ fill: '#60A5FA', r: 2.5 }}
              activeDot={{ r: 5, stroke: '#BFDBFE', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
