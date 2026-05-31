import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Stamp, StampCardState } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calculateCardState(
  stamps: Stamp[],
  stampsRequired: number
): StampCardState {
  const total = stamps.length
  const cardStamps = total % stampsRequired
  const cardsCompleted = Math.floor(total / stampsRequired)

  const sortedStamps = [...stamps].sort(
    (a, b) => new Date(b.stamped_at).getTime() - new Date(a.stamped_at).getTime()
  )
  const lastStamp = sortedStamps[0]
  let canStamp = true
  let cooldownHours: number | undefined

  if (lastStamp) {
    const diffMs = Date.now() - new Date(lastStamp.stamped_at).getTime()
    const fourHours = 4 * 60 * 60 * 1000
    if (diffMs < fourHours) {
      canStamp = false
      cooldownHours = Math.ceil((fourHours - diffMs) / (60 * 60 * 1000))
    }
  }

  return {
    total_stamps: total,
    card_stamps: cardStamps,
    cards_completed: cardsCompleted,
    can_stamp: canStamp,
    cooldown_remaining_hours: cooldownHours,
    redeemable: total > 0 && cardStamps === 0,
  }
}

export function formatPhone(phone: string): string {
  return `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`
}

export function timeSince(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  return 'Just now'
}
