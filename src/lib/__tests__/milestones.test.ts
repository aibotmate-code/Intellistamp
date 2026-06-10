import { resolveReward } from '../milestones'
import type { Milestone } from '@/types'

const STAMPS_REQUIRED = 8

function makeMilestone(visitNumber: number): Milestone {
  return {
    id: `milestone-${visitNumber}`,
    business_id: 'biz-1',
    visit_number: visitNumber,
    badge: '🥈 Silver',
    reward: 'Free latte',
    is_active: true,
    created_at: new Date().toISOString(),
  }
}

describe('resolveReward', () => {
  test('no completion, no milestone → null', () => {
    // 4 stamps, needs 8 — not complete, no milestone
    expect(resolveReward(4, STAMPS_REQUIRED, null, false, 'stamp')).toBeNull()
  })

  test('stamp completes, no milestone → type:stamp', () => {
    // 8 stamps, needs 8 — card complete
    const result = resolveReward(8, STAMPS_REQUIRED, null, false, 'stamp')
    expect(result).not.toBeNull()
    expect(result?.type).toBe('stamp')
    expect(result?.milestone).toBeUndefined()
  })

  test('milestone hit, no stamp completion → type:milestone', () => {
    // 5 stamps — not complete, but milestone at visit 5
    const m = makeMilestone(5)
    const result = resolveReward(5, STAMPS_REQUIRED, m, false, 'stamp')
    expect(result?.type).toBe('milestone')
    expect(result?.milestone?.id).toBe(m.id)
    expect(result?.deferred_milestone).toBeUndefined()
  })

  test('both hit, priority=stamp → type:stamp, deferred_milestone set', () => {
    const m = makeMilestone(8)
    const result = resolveReward(8, STAMPS_REQUIRED, m, false, 'stamp')
    expect(result?.type).toBe('stamp')
    expect(result?.deferred_milestone?.id).toBe(m.id)
    expect(result?.deferred_stamp).toBeUndefined()
  })

  test('both hit, priority=milestone → type:milestone, deferred_stamp=true', () => {
    const m = makeMilestone(8)
    const result = resolveReward(8, STAMPS_REQUIRED, m, false, 'milestone')
    expect(result?.type).toBe('milestone')
    expect(result?.milestone?.id).toBe(m.id)
    expect(result?.deferred_stamp).toBe(true)
  })

  test('milestone already claimed → treated as no milestone', () => {
    const m = makeMilestone(5)
    const result = resolveReward(5, STAMPS_REQUIRED, m, true, 'stamp')
    // claimed → no milestone, no stamp completion → null
    expect(result).toBeNull()
  })

  test('stamp complete, milestone claimed → type:stamp only', () => {
    const m = makeMilestone(8)
    const result = resolveReward(8, STAMPS_REQUIRED, m, true, 'stamp')
    expect(result?.type).toBe('stamp')
    expect(result?.deferred_milestone).toBeUndefined()
  })

  test('neither complete → null', () => {
    expect(resolveReward(3, STAMPS_REQUIRED, null, false, 'stamp')).toBeNull()
    expect(resolveReward(1, STAMPS_REQUIRED, null, false, 'milestone')).toBeNull()
  })

  test('stamp at visit 8, milestone at 8, priority=stamp → stamp fires', () => {
    const m = makeMilestone(8)
    const result = resolveReward(8, 8, m, false, 'stamp')
    expect(result?.type).toBe('stamp')
    expect(result?.deferred_milestone).toBeDefined()
  })

  test('stamp at visit 8, milestone at 8, priority=milestone → milestone fires', () => {
    const m = makeMilestone(8)
    const result = resolveReward(8, 8, m, false, 'milestone')
    expect(result?.type).toBe('milestone')
    expect(result?.deferred_stamp).toBe(true)
  })
})
