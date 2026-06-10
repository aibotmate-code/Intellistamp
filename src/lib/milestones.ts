import type { Milestone, RewardResult } from '@/types'

/**
 * Pure function that determines the reward result for a stamp event.
 * Does not perform any DB operations — callers are responsible for persisting claims.
 */
export function resolveReward(
  totalStamps: number,
  stampsRequired: number,
  milestone: Milestone | null,
  milestoneAlreadyClaimed: boolean,
  conflictPriority: 'stamp' | 'milestone'
): RewardResult | null {
  const cardStamps = totalStamps % stampsRequired
  const stampComplete = cardStamps === 0 && totalStamps > 0
  const effectiveMilestone = milestone && !milestoneAlreadyClaimed ? milestone : null

  if (stampComplete && effectiveMilestone) {
    if (conflictPriority === 'stamp') {
      return { type: 'stamp', reward: '', deferred_milestone: effectiveMilestone }
    }
    return { type: 'milestone', milestone: effectiveMilestone, deferred_stamp: true }
  }

  if (stampComplete) {
    return { type: 'stamp', reward: '' }
  }

  if (effectiveMilestone) {
    return { type: 'milestone', milestone: effectiveMilestone }
  }

  return null
}
