import { timeSince } from '@/lib/utils'
import type { BusinessCustomer, Customer } from '@/types'

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
  'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
  'bg-orange-500', 'bg-teal-500', 'bg-red-500', 'bg-indigo-500',
]

export default function CustomerTable({ customers, stampsRequired }: CustomerTableProps) {
  if (customers.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-3">👥</div>
        <h3 className="text-lg font-bold text-white">No customers yet</h3>
        <p className="text-sm text-zinc-400 mt-1">Share your QR code to start collecting loyalty members</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800">
            <th className="text-left text-xs text-zinc-500 font-medium pb-3 px-4 sm:px-0">Customer</th>
            <th className="text-left text-xs text-zinc-500 font-medium pb-3 px-2 hidden sm:table-cell">Progress</th>
            <th className="text-left text-xs text-zinc-500 font-medium pb-3 px-2">Stamps</th>
            <th className="text-left text-xs text-zinc-500 font-medium pb-3 px-2 hidden sm:table-cell">Last Visit</th>
            <th className="text-left text-xs text-zinc-500 font-medium pb-3 px-4 sm:px-0">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/50">
          {customers.map((c, i) => {
            const initials = (c.customer.name || c.customer.phone).slice(0, 2).toUpperCase()
            const colorClass = COLORS[i % COLORS.length]
            const cardsCompleted = Math.floor(c.total_stamps / stampsRequired)

            return (
              <tr key={c.id} className="hover:bg-zinc-900/50">
                <td className="py-3 px-4 sm:px-0">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-full ${colorClass} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-white truncate max-w-[120px]">
                        {c.customer.name || 'Unknown'}
                      </p>
                      <p className="text-xs text-zinc-500">••••{c.customer.phone.slice(-4)}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-2 hidden sm:table-cell">
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(stampsRequired, 8) }).map((_, j) => (
                      <div
                        key={j}
                        className={`w-3 h-3 rounded-full ${
                          j < c.card_stamps ? 'bg-yellow-400' : 'bg-zinc-700'
                        }`}
                      />
                    ))}
                    {stampsRequired > 8 && <span className="text-xs text-zinc-500">...</span>}
                  </div>
                </td>
                <td className="py-3 px-2">
                  <div>
                    <span className="text-yellow-400 font-bold">{c.total_stamps}</span>
                    {cardsCompleted > 0 && (
                      <span className="text-xs text-green-400 ml-1">({cardsCompleted}🎁)</span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-2 text-zinc-400 hidden sm:table-cell">
                  {c.last_stamp ? timeSince(c.last_stamp) : 'Never'}
                </td>
                <td className="py-3 px-4 sm:px-0">
                  {c.can_stamp ? (
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                      Ready
                    </span>
                  ) : (
                    <span className="text-xs bg-zinc-700/50 text-zinc-400 px-2 py-0.5 rounded-full">
                      {c.cooldown_hours ? `${c.cooldown_hours}h` : 'Cooling down'}
                    </span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
