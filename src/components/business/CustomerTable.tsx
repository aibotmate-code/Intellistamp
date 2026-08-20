import { timeSince } from '@/lib/utils'
import type { BusinessCustomer, Customer } from '@/types'
import { Badge } from '@/components/ui/Badge'
import { Users } from 'lucide-react'

interface CustomerRow extends BusinessCustomer {
  customer: Customer
  total_stamps: number
  card_stamps: number
  can_stamp: boolean
  cooldown_hours?: number
  last_stamp?: string
}

interface CustomerTableProps {
  customers: CustomerRow[]
  stampsRequired: number
}

const COLORS = [
  'bg-blue-500/20 text-blue-300 border-blue-500/30',
  'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  'bg-purple-500/20 text-purple-300 border-purple-500/30',
  'bg-pink-500/20 text-pink-300 border-pink-500/30',
  'bg-amber-500/20 text-amber-300 border-amber-500/30',
  'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  'bg-rose-500/20 text-rose-300 border-rose-500/30',
  'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
]

export default function CustomerTable({ customers, stampsRequired }: CustomerTableProps) {
  if (customers.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-12 text-center">
        <div className="mx-auto w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 mb-3">
          <Users size={18} />
        </div>
        <h3 className="text-sm font-semibold text-zinc-100">No customers yet</h3>
        <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
          Share your QR code or counter display to start enrolling loyalty members.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/70 text-xs font-medium text-zinc-400">
              <th className="py-3 px-4">Customer</th>
              <th className="py-3 px-4 hidden sm:table-cell">Current Card</th>
              <th className="py-3 px-4">Total Stamps</th>
              <th className="py-3 px-4 hidden sm:table-cell">Last Visit</th>
              <th className="py-3 px-4 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {customers.map((c, i) => {
              const initials = (c.customer.name || c.customer.phone).slice(0, 2).toUpperCase()
              const colorClass = COLORS[i % COLORS.length]
              const cardsCompleted = Math.floor(c.total_stamps / stampsRequired)

              return (
                <tr key={c.id} className="hover:bg-zinc-850/40 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-full border ${colorClass} flex items-center justify-center text-[11px] font-semibold shrink-0`}
                      >
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-zinc-100 text-xs truncate max-w-[140px]">
                          {c.customer.name || 'Unknown'}
                        </p>
                        <p className="text-[11px] text-zinc-500">••••{c.customer.phone.slice(-4)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 hidden sm:table-cell">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(stampsRequired, 8) }).map((_, j) => (
                        <div
                          key={j}
                          className={`w-2.5 h-2.5 rounded-full ${
                            j < c.card_stamps ? 'bg-amber-400' : 'bg-zinc-800 border border-zinc-700'
                          }`}
                        />
                      ))}
                      {stampsRequired > 8 && <span className="text-[10px] text-zinc-500 ml-1">+{stampsRequired - 8}</span>}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      <span className="text-zinc-100 font-semibold text-xs">{c.total_stamps}</span>
                      {cardsCompleted > 0 && (
                        <span className="text-[11px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                          {cardsCompleted} reward{cardsCompleted > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-xs text-zinc-400 hidden sm:table-cell">
                    {c.last_stamp ? timeSince(c.last_stamp) : 'Never'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {c.can_stamp ? (
                      <Badge variant="success">Ready</Badge>
                    ) : (
                      <Badge variant="secondary">
                        {c.cooldown_hours ? `${c.cooldown_hours}h cooldown` : 'Cooling down'}
                      </Badge>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
