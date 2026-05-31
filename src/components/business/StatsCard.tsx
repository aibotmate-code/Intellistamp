interface StatsCardProps {
  icon: string
  label: string
  value: number | string
}

export default function StatsCard({ icon, label, value }: StatsCardProps) {
  return (
    <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 flex items-center gap-3">
      <div className="text-3xl">{icon}</div>
      <div>
        <p className="text-2xl font-black text-white">{value}</p>
        <p className="text-xs text-zinc-400">{label}</p>
      </div>
    </div>
  )
}
