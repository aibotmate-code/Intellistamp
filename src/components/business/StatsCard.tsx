import React from 'react'

interface StatsCardProps {
  icon: React.ReactNode
  label: string
  value: number | string
}

export default function StatsCard({ icon, label, value }: StatsCardProps) {
  return (
    <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800/90 flex items-center justify-between">
      <div>
        <p className="text-xs font-medium text-zinc-400">{label}</p>
        <p className="text-2xl font-semibold tracking-tight text-zinc-100 mt-1">{value}</p>
      </div>
      <div className="text-zinc-500 bg-zinc-800/40 p-2.5 rounded-md border border-zinc-800 flex items-center justify-center shrink-0" aria-hidden="true">
        {icon}
      </div>
    </div>
  )
}
