/* eslint-disable @typescript-eslint/no-explicit-any */
import { calculateCardState } from '../utils'
import type { Stamp } from '@/types'
import StampCard from '@/components/customer/StampCard'
import React from 'react'
import { resolveBrandingColors } from '../branding/palette'
import type { BusinessBranding } from '@/types'

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
    const stamps = [makeStamp(2)]
    const state = calculateCardState(stamps, STAMPS_REQUIRED)
    expect(state.can_stamp).toBe(false)
  })

  test('cooldown: stamp more than 4 hours ago → can_stamp=true', () => {
    const stamps = [makeStamp(5)]
    const state = calculateCardState(stamps, STAMPS_REQUIRED)
    expect(state.can_stamp).toBe(true)
  })

  test('cooldown: no stamps ever → can_stamp=true', () => {
    const state = calculateCardState([], STAMPS_REQUIRED)
    expect(state.can_stamp).toBe(true)
  })

  test('cooldown_remaining_hours is correct value', () => {
    const stamps = [makeStamp(1)]
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

// ── resolveBrandingColors Resolver Tests ──────────────────────────────────────

describe('resolveBrandingColors – resolver', () => {
  const darkBase: BusinessBranding = {
    business_id: 'biz-1',
    primary_color: '#3A7874',
    primary_dark_color: '#2B5A57',
    primary_light_color: '#E1EAEA',
    secondary_color: '#99BFBD',
    accent_color: '#5D8F90',
    surface_color: '#18181B',
    background_color: '#09090B',
    text_on_primary: '#FFFFFF',
    is_enabled: true,
  }

  const lightBase: BusinessBranding = {
    business_id: 'biz-2',
    primary_color: '#3A7874',
    primary_dark_color: '#2B5A57',
    primary_light_color: '#E1EAEA',
    secondary_color: '#99BFBD',
    accent_color: '#5D8F90',
    surface_color: '#F9FAFB',
    background_color: '#FFFFFF',
    text_on_primary: '#FFFFFF',
    is_enabled: true,
  }

  test('dark surface card: falls back to light heading and muted light text', () => {
    const resolved = resolveBrandingColors(darkBase, true)
    expect(resolved.card_text_color).toBe('#F5F5F5')
    expect(resolved.card_muted_text_color).toBe('#A1A1AA')
    expect(resolved.empty_stamp_color).toBe('#18181B')
    expect(resolved.empty_stamp_border_color).toBe('#3F3F46')
  })

  test('light surface card: falls back to dark heading and muted dark text', () => {
    const resolved = resolveBrandingColors(lightBase, true)
    expect(resolved.card_text_color).toBe('#111827')
    expect(resolved.card_muted_text_color).toBe('#6B7280')
    expect(resolved.empty_stamp_color).toBe('#E7EFEE')
    expect(resolved.empty_stamp_border_color).toBe('#99BFBD')
  })

  test('explicit user override for dark surface: overrides automatic fallbacks', () => {
    const brandingWithOverrides: BusinessBranding = {
      ...darkBase,
      card_text_color: '#AABBCC',
      card_muted_text_color: '#DDEEFF',
      empty_stamp_color: '#112233',
      empty_stamp_border_color: '#445566',
    }
    const resolved = resolveBrandingColors(brandingWithOverrides, true)
    expect(resolved.card_text_color).toBe('#AABBCC')
    expect(resolved.card_muted_text_color).toBe('#DDEEFF')
    expect(resolved.empty_stamp_color).toBe('#112233')
    expect(resolved.empty_stamp_border_color).toBe('#445566')
  })

  test('explicit user override for light surface: overrides automatic fallbacks', () => {
    const brandingWithOverrides: BusinessBranding = {
      ...lightBase,
      card_text_color: '#173B39',
      card_muted_text_color: '#6B7C7A',
      empty_stamp_color: '#E7EFEE',
      empty_stamp_border_color: '#99BFBD',
    }
    const resolved = resolveBrandingColors(brandingWithOverrides, true)
    expect(resolved.card_text_color).toBe('#173B39')
    expect(resolved.card_muted_text_color).toBe('#6B7C7A')
    expect(resolved.empty_stamp_color).toBe('#E7EFEE')
    expect(resolved.empty_stamp_border_color).toBe('#99BFBD')
  })

  test('branding disabled: returns theme CSS variable strings', () => {
    const resolved = resolveBrandingColors(darkBase, false)
    expect(resolved.card_text_color).toBe('var(--color-text)')
    expect(resolved.card_muted_text_color).toBe('var(--color-text-muted)')
    expect(resolved.empty_stamp_color).toBe('var(--color-elevated)')
    expect(resolved.empty_stamp_border_color).toBe('var(--color-border)')
  })

  test('null branding: returns theme CSS variable strings', () => {
    const resolved = resolveBrandingColors(null, true)
    expect(resolved.card_text_color).toBe('var(--color-text)')
    expect(resolved.card_muted_text_color).toBe('var(--color-text-muted)')
    expect(resolved.empty_stamp_color).toBe('var(--color-elevated)')
    expect(resolved.empty_stamp_border_color).toBe('var(--color-border)')
  })
})

// ── StampCard Component Integration Tests ────────────────────────────────────

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

  test('branding enabled with dark surface → resolved empty stamp colors applied', () => {
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

    expect(element.props.style.background).toBe('#18181B')

    const gridChild = element.props.children.find(
      (child: any) => child && child.props && child.props.className && child.props.className.includes('grid')
    )
    expect(gridChild).toBeDefined()

    const stampDots = gridChild.props.children
    expect(stampDots).toHaveLength(5)

    const filledDot = stampDots[0].props.children[0]
    expect(filledDot.props.style.background).toBe('#3A7874')
    expect(filledDot.props.style.color).toBe('#FFFFFF')

    // Third stamp dot is empty — dark surface → dark fill + dark border
    const emptyDot = stampDots[2].props.children[0]
    expect(emptyDot.props.style.background).toBe('#18181B')
    expect(emptyDot.props.style.border).toBe('2px solid #3F3F46')
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

    expect(element.props.style.background).toBe('var(--color-surface)')

    const gridChild = element.props.children.find(
      (child: any) => child && child.props && child.props.className && child.props.className.includes('grid')
    )
    const filledDot = gridChild.props.children[0].props.children[0]
    expect(filledDot.props.style.background).toBe('var(--color-gold)')
    expect(filledDot.props.style.color).toBe('#000000')
  })

  test('explicit card colors on light surface → override fallbacks in rendered stamp dots', () => {
    const mockBranding = {
      id: 'brand-3',
      business_id: 'biz-3',
      primary_color: '#3A7874',
      primary_dark_color: '#2B5A57',
      primary_light_color: '#E1EAEA',
      surface_color: '#F9FAFB',
      text_on_primary: '#FFFFFF',
      is_enabled: true,
      card_text_color: '#173B39',
      card_muted_text_color: '#6B7C7A',
      empty_stamp_color: '#E7EFEE',
      empty_stamp_border_color: '#99BFBD',
    }

    const element = StampCard({
      stampsRequired: 5,
      cardStamps: 1,
      businessName: 'Coffea',
      businessEmoji: '☕',
      reward: 'Free Coffee',
      businessBranding: mockBranding,
    })

    const gridChild = element.props.children.find(
      (child: any) => child && child.props && child.props.className && child.props.className.includes('grid')
    )
    const emptyDot = gridChild.props.children[1].props.children[0]
    expect(emptyDot.props.style.background).toBe('#E7EFEE')
    expect(emptyDot.props.style.border).toBe('2px solid #99BFBD')
  })

  test('loyalty card attribution: powered by Intellical Labs', () => {
    const element = StampCard({
      stampsRequired: 5,
      cardStamps: 2,
      businessName: 'Staging Cafe',
      businessEmoji: '☕',
      reward: 'Free Cookie',
    })

    const attributionDiv = element.props.children.find(
      (child: any) => child && child.props && child.props.className && child.props.className.includes('border-t')
    )
    expect(attributionDiv).toBeDefined()

    const pText = attributionDiv.props.children
    expect(pText.props.children[0]).toContain('Powered by')

    const link = pText.props.children[2]
    expect(link.type).toBe('a')
    expect(link.props.href).toBe('https://intellicallabs.com')
    expect(link.props.target).toBe('_blank')
    expect(link.props.rel).toBe('noopener noreferrer')
    expect(link.props.children).toBe('Intellical Labs')
  })
})
