/* eslint-disable @typescript-eslint/no-explicit-any */
import { calculateCardState } from '../utils'
import type { Stamp } from '@/types'
import StampCard from '@/components/customer/StampCard'
import React from 'react'

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

describe('StampCard Branding Integration', () => {
  let originalUseState: any
  let originalUseEffect: any
  let originalUseRef: any

  beforeAll(() => {
    const reactAny = React as any
    originalUseState = reactAny.useState
    originalUseEffect = reactAny.useEffect
    originalUseRef = reactAny.useRef

    reactAny.useState = (init: any) => [typeof init === 'function' ? init() : init, jest.fn()] as any
    reactAny.useEffect = jest.fn() as any
    reactAny.useRef = (init: any) => ({ current: init }) as any
  })

  afterAll(() => {
    const reactAny = React as any
    reactAny.useState = originalUseState
    reactAny.useEffect = originalUseEffect
    reactAny.useRef = originalUseRef
  })

  test('branding enabled → applies custom cardBgColor, primaryBrandColor, and textOnPrimaryBrandColor', () => {
    const mockBranding = {
      id: 'brand-1',
      business_id: 'biz-1',
      primary_color: '#3A7874',
      primary_dark_color: '#2B5A57',
      primary_light_color: '#E1EAEA',
      secondary_color: '#99BFBD',
      accent_color: '#5D8F90',
      surface_color: '#18181B',
      text_on_primary: '#FFFFFF',
      is_enabled: true,
    }

    const element = StampCard({
      stampsRequired: 5,
      cardStamps: 2,
      businessName: 'Staging Cafe',
      businessEmoji: '☕',
      reward: 'Free Cookie',
      businessBranding: mockBranding,
    })

    // Container background should use surfaceColor
    expect(element.props.style.background).toBe('#18181B')

    // Find the stamp grid container (it should be the child with grid layout className)
    const gridChild = element.props.children.find(
      (child: any) => child && child.props && child.props.className && child.props.className.includes('grid')
    )
    expect(gridChild).toBeDefined()

    // Retrieve children of the grid (individual stamp dots)
    const stampDots = gridChild.props.children
    expect(stampDots).toHaveLength(5)

    // First two stamp dots are filled (index 0 and 1)
    const filledDot = stampDots[0].props.children[0]
    expect(filledDot.props.style.background).toBe('#3A7874')
    expect(filledDot.props.style.color).toBe('#FFFFFF')

    // Third stamp dot is empty (index 2)
    const emptyDot = stampDots[2].props.children[0]
    expect(emptyDot.props.style.background).toBe('var(--color-elevated)')
    expect(emptyDot.props.style.color).toBe('var(--color-text-dim)')
  })

  test('branding disabled → falls back to theme defaults', () => {
    const mockBranding = {
      id: 'brand-1',
      business_id: 'biz-1',
      primary_color: '#3A7874',
      primary_dark_color: '#2B5A57',
      primary_light_color: '#E1EAEA',
      secondary_color: '#99BFBD',
      accent_color: '#5D8F90',
      surface_color: '#18181B',
      text_on_primary: '#FFFFFF',
      is_enabled: false,
    }

    const element = StampCard({
      stampsRequired: 5,
      cardStamps: 2,
      businessName: 'Staging Cafe',
      businessEmoji: '☕',
      reward: 'Free Cookie',
      businessBranding: mockBranding,
    })

    // Should fall back to default colors
    expect(element.props.style.background).toBe('var(--color-surface)')

    const gridChild = element.props.children.find(
      (child: any) => child && child.props && child.props.className && child.props.className.includes('grid')
    )
    const filledDot = gridChild.props.children[0].props.children[0]
    expect(filledDot.props.style.background).toBe('var(--color-gold)')
    expect(filledDot.props.style.color).toBe('#000')
  })
})
