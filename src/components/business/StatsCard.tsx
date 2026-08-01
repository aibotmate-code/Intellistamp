import React from 'react'

interface StatsCardProps {
  icon: React.ReactNode
  label: string
  value: number | string
}

export default function StatsCard({ icon, label, value }: StatsCardProps) {
  return (
    <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 flex items-center gap-4">
      <div className="text-zinc-400 flex items-center justify-center" aria-hidden="true">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-black text-white leading-tight">{value}</p>
        <p className="text-xs text-zinc-400 mt-0.5">{label}</p>
      </div>
    </div>
  )
}
