'use client'

import { cn } from '@/lib/utils'

interface StampCardProps {
  stampsRequired: number
  cardStamps: number
  businessName: string
  businessEmoji: string
  reward: string
  newStampIndex?: number
  onClaim?: () => void
  redeemable?: boolean
}

export default function StampCard({
  stampsRequired,
  cardStamps,
  businessName,
  businessEmoji,
  reward,
  newStampIndex,
  onClaim,
  redeemable,
}: StampCardProps) {
  return (
    <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800">
      <div className="flex items-center gap-3 mb-5">
        <span className="text-3xl">{businessEmoji}</span>
        <div>
          <h3 className="font-bold text-white text-lg leading-tight">{businessName}</h3>
          <p className="text-xs text-zinc-400">Collect {stampsRequired} stamps → {reward}</p>
        </div>
      </div>

      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(5, stampsRequired)}, 1fr)` }}>
        {Array.from({ length: stampsRequired }).map((_, i) => {
          const filled = i < cardStamps
          const isNew = i === newStampIndex
          return (
            <div
              key={i}
              className={cn(
                'aspect-square rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300',
                filled
                  ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20'
                  : 'bg-zinc-800 border-2 border-zinc-700 text-zinc-600',
                isNew && 'animate-bounce scale-110'
              )}
            >
              {filled ? '✓' : ''}
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-between mt-4">
        <span className="text-sm text-zinc-400 font-medium">
          {cardStamps}/{stampsRequired} stamps
        </span>
        {redeemable && onClaim && (
          <button
            onClick={onClaim}
            className="flex items-center gap-1.5 bg-yellow-400 text-black text-sm font-bold px-4 py-2 rounded-lg hover:bg-yellow-300 transition-colors"
          >
            🎁 CLAIM REWARD
          </button>
        )}
      </div>
    </div>
  )
}
