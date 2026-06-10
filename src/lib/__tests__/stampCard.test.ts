import { calculateCardState } from '../utils'
import type { Stamp } from '@/types'

const STAMPS_REQUIRED = 8

function makeStamp(hoursAgo: number, id = '1'): Stamp {
  return {
    id,
    customer_id: 'cust-1',
    business_id: 'biz-1',
    type: 'regular',
    stamped_at: new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString(),
  }
}

function makeStamps(count: number, lastStampHoursAgo = 24): Stamp[] {
  return Array.from({ length: count }, (_, i) =>
    makeStamp(lastStampHoursAgo + i, String(i))
  )
}

describe('calculateCardState', () => {
  test('0 stamps: card_stamps=0, redeemable=false, can_stamp=true', () => {
    const state = calculateCardState([], STAMPS_REQUIRED)
    expect(state.total_stamps).toBe(0)
    expect(state.card_stamps).toBe(0)
    expect(state.redeemable).toBe(false)
    expect(state.can_stamp).toBe(true)
  })

  test('4 stamps out of 8: card_stamps=4, redeemable=false', () => {
    const state = calculateCardState(makeStamps(4), STAMPS_REQUIRED)
    expect(state.card_stamps).toBe(4)
    expect(state.redeemable).toBe(false)
    expect(state.total_stamps).toBe(4)
  })

  test('8 stamps out of 8: card_stamps=0, redeemable=true', () => {
    const state = calculateCardState(makeStamps(8), STAMPS_REQUIRED)
    expect(state.card_stamps).toBe(0)
    expect(state.redeemable).toBe(true)
    expect(state.total_stamps).toBe(8)
  })

  test('9 stamps out of 8: card_stamps=1, cards_completed=1', () => {
    const state = calculateCardState(makeStamps(9), STAMPS_REQUIRED)
    expect(state.card_stamps).toBe(1)
    expect(state.cards_completed).toBe(1)
    expect(state.total_stamps).toBe(9)
  })

  test('16 stamps out of 8: card_stamps=0, redeemable=true, cards_completed=2', () => {
    const state = calculateCardState(makeStamps(16), STAMPS_REQUIRED)
    expect(state.card_stamps).toBe(0)
    expect(state.redeemable).toBe(true)
    expect(state.cards_completed).toBe(2)
  })

  test('cooldown: stamp within 4 hours → can_stamp=false', () => {
    const stamps = [makeStamp(2)] // 2 hours ago — within cooldown
    const state = calculateCardState(stamps, STAMPS_REQUIRED)
    expect(state.can_stamp).toBe(false)
  })

  test('cooldown: stamp more than 4 hours ago → can_stamp=true', () => {
    const stamps = [makeStamp(5)] // 5 hours ago — outside cooldown
    const state = calculateCardState(stamps, STAMPS_REQUIRED)
    expect(state.can_stamp).toBe(true)
  })

  test('cooldown: no stamps ever → can_stamp=true', () => {
    const state = calculateCardState([], STAMPS_REQUIRED)
    expect(state.can_stamp).toBe(true)
  })

  test('cooldown_remaining_hours is correct value', () => {
    const stamps = [makeStamp(1)] // 1 hour ago → 3 hours remaining
    const state = calculateCardState(stamps, STAMPS_REQUIRED)
    expect(state.cooldown_remaining_hours).toBe(3)
  })

  test('total_stamps matches input array length', () => {
    for (const count of [0, 1, 5, 13, 24]) {
      const state = calculateCardState(makeStamps(count), STAMPS_REQUIRED)
      expect(state.total_stamps).toBe(count)
    }
  })
})
