/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react'
import DashboardPage from '@/app/(business)/dashboard/page'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}))

// Mock Supabase browser client
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createBrowserClient: () => ({
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
    },
  }),
}))

describe('Merchant Dashboard Co-Branding and Icons Integration', () => {
  let originalUseState: any
  let originalUseEffect: any
  let originalUseCallback: any
  let originalTenantBrandingEnabled: string | undefined

  const mockBusiness = {
    id: 'biz-123',
    name: 'Coffee Lab Staging',
    category: 'Coffee Shop',
    emoji: '☕',
    stamps_required: 8,
    branding: {
      id: 'brand-123',
      is_enabled: true,
      primary_color: '#3A7874',
      primary_dark_color: '#2B5A57',
      primary_light_color: '#E1EAEA',
      secondary_color: '#99BFBD',
      accent_color: '#5D8F90',
      surface_color: '#18181B',
      text_on_primary: '#FFFFFF',
      logo_url: 'https://test.supabase.co/logo.png',
    },
  }

  const mockStats = {
    total_customers: 24,
    total_stamps: 128,
    rewards_redeemed: 8,
  }

  const mockCustomers: any[] = []

  beforeAll(() => {
    const reactAny = React as any
    originalUseState = reactAny.useState
    originalUseEffect = reactAny.useEffect
    originalUseCallback = reactAny.useCallback

    // Enable tenant co-branding for tests
    originalTenantBrandingEnabled = process.env.NEXT_PUBLIC_TENANT_BRANDING_ENABLED
    process.env.NEXT_PUBLIC_TENANT_BRANDING_ENABLED = 'true'

    // Mock useEffect to do nothing
    reactAny.useEffect = jest.fn()
    reactAny.useCallback = (fn: any) => fn
  })

  afterAll(() => {
    const reactAny = React as any
    reactAny.useState = originalUseState
    reactAny.useEffect = originalUseEffect
    reactAny.useCallback = originalUseCallback
    process.env.NEXT_PUBLIC_TENANT_BRANDING_ENABLED = originalTenantBrandingEnabled as any
  })

  test('Co-branded dashboard header, badge, and tab accent colors are applied when co-branding is active', () => {
    const reactAny = React as any
    const mockSetState = jest.fn()

    // Mock state variables for DashboardPage:
    // loading = false
    // data = { business, stats, customers }
    // activeTab = 'qr'
    // kioskMode = false
    // error = ''
    // ownerEmail = 'merchant@test.com'
    let stateCalls = 0
    reactAny.useState = (init: any) => {
      stateCalls++
      if (stateCalls === 1) return [false, mockSetState] // loading = false
      if (stateCalls === 2) {
        return [{
          business: mockBusiness,
          stats: mockStats,
          customers: mockCustomers,
        }, mockSetState]
      }
      if (stateCalls === 3) return ['qr', mockSetState] // activeTab = 'qr'
      return [init, mockSetState]
    }

    const element = DashboardPage()

    // 1. Assert topbar does not use co-branding color (stays IntelliStamp branded)
    const headerNode = element.props.children[1]
    expect(headerNode.type).toBe('header')
    expect(headerNode.props.className).toContain('bg-zinc-950') // unchanged

    // 2. Find Business Header and co-branded badge
    const bodyContainer = element.props.children[2]
    const businessHeader = bodyContainer.props.children[0]
    
    // BusinessVisual is first child
    const visual = businessHeader.props.children[0]
    expect(visual.props.logoUrl).toBe('https://test.supabase.co/logo.png')
    expect(visual.props.emoji).toBe('☕')

    // Badge co-branded is rendered
    const titleBlock = businessHeader.props.children[1]
    const badge = titleBlock.props.children[0].props.children[1]
    expect(badge).toBeDefined()
    expect(badge.props.children).toBe('Co-Branded')
    expect(badge.props.style.color).toBe('#3A7874')

    // Preview Customer Card action exists
    const metaBlock = titleBlock.props.children[1]
    const previewBtn = metaBlock.props.children[1]
    expect(previewBtn).toBeDefined()
    expect(previewBtn.props.children).toContain('Preview Customer Card')

    // 3. Stats section check
    const statsContainer = bodyContainer.props.children[1]
    const customersCard = statsContainer.props.children[0]
    const stampsCard = statsContainer.props.children[1]
    const rewardsCard = statsContainer.props.children[2]

    expect(customersCard.props.label).toBe('Total Customers')
    expect(stampsCard.props.label).toBe('Stamps Issued')
    expect(rewardsCard.props.label).toBe('Rewards Redeemed')
    expect(typeof customersCard.props.icon).toBe('object') // Lucide icon React element

    // 4. Tabs navigation check
    const tabsContainer = bodyContainer.props.children[2]
    const qrTabBtn = tabsContainer.props.children[0]
    expect(qrTabBtn.props.style.color).toBe('#3A7874') // Uses client's primary color
    expect(qrTabBtn.props.style.borderColor).toBe('#3A7874')
  })

  test('Fallback is used when co-branding is disabled', () => {
    const reactAny = React as any
    const mockSetState = jest.fn()

    const disabledBusiness = {
      ...mockBusiness,
      branding: {
        ...mockBusiness.branding,
        is_enabled: false,
      },
    }

    let stateCalls = 0
    reactAny.useState = (init: any) => {
      stateCalls++
      if (stateCalls === 1) return [false, mockSetState] // loading = false
      if (stateCalls === 2) {
        return [{
          business: disabledBusiness,
          stats: mockStats,
          customers: mockCustomers,
        }, mockSetState]
      }
      if (stateCalls === 3) return ['qr', mockSetState] // activeTab = 'qr'
      return [init, mockSetState]
    }

    const element = DashboardPage()
    const bodyContainer = element.props.children[2]
    const businessHeader = bodyContainer.props.children[0]
    const titleBlock = businessHeader.props.children[1]
    
    // Co-branded badge should not render
    const badge = titleBlock.props.children[0].props.children[1]
    expect(badge).toBeFalsy()

    // Tabs should fall back to default color (#FACC15)
    const tabsContainer = bodyContainer.props.children[2]
    const qrTabBtn = tabsContainer.props.children[0]
    expect(qrTabBtn.props.style.color).toBe('#FACC15')
  })
})
