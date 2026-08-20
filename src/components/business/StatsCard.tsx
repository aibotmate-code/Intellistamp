import React from 'react'

interface StatsCardProps {
  icon: React.ReactNode
  label: string
  value: number | string
}

export default function StatsCard({ icon, label, value }: StatsCardProps) {
  return (
    <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800/90 hover:border-amber-500/30 transition-colors flex items-center justify-between group shadow-xs">
      <div>
        <p className="text-xs font-medium text-zinc-400">{label}</p>
        <p className="text-2xl font-semibold tracking-tight text-zinc-100 mt-1 font-mono">{value}</p>
      </div>
      <div
        className="text-amber-400 bg-amber-500/10 p-2.5 rounded-md border border-amber-500/20 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
        aria-hidden="true"
      >
        {icon}
      </div>
    </div>
  )
}
