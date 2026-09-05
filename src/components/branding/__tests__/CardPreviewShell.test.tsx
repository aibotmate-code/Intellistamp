/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom'
import React from 'react'
import { render, screen, act } from '@testing-library/react'
import CardPreviewShell from '@/components/branding/CardPreviewShell'
import StampCard from '@/components/customer/StampCard'
import type { MilestoneWithStatus, BusinessBranding } from '@/types'

describe('CardPreviewShell Responsive Scaling & StampCard Parity', () => {
  const mockMilestones: MilestoneWithStatus[] = [
    {
      id: 'ms-4',
      business_id: 'biz-1',
      visit_number: 4,
      badge: 'Bronze Tier',
      reward: 'Free Coffee',
      is_active: true,
      earned: false,
      visits_remaining: 2,
      created_at: '2026-01-01T00:00:00Z',
    },
  ]

  const mockBranding: BusinessBranding = {
    business_id: 'biz-1',
    logo_url: 'https://staging.intellistamp.com/logos/coffee_lab.png',
    card_background_image_url: null,
    card_bg_overlay_opacity: 0.6,
    card_background_overlay: 0.6,
    primary_color: '#3A7874',
    primary_dark_color: '#2B5A57',
    primary_light_color: '#E1EAEA',
    text_on_primary: '#FFFFFF',
    secondary_color: '#99BFBD',
    accent_color: '#5D8F90',
    surface_color: '#18181B',
    background_color: '#09090B',
    card_text_color: '#F5F5F5',
    card_muted_text_color: '#A1A1AA',
    empty_stamp_color: '#27272A',
    empty_stamp_border_color: '#3F3F46',
    is_enabled: true,
  }

  test('1. Renders canonical StampCard inside preview shell without clipping', () => {
    render(
      <div style={{ width: 450 }}>
        <CardPreviewShell designWidth={384}>
          <StampCard
            stampsRequired={6}
            cardStamps={2}
            totalVisits={2}
            businessName="IntelliStamp Staging Demo"
            businessEmoji="☕"
            reward="Free coffee"
            businessBranding={mockBranding}
            milestones={mockMilestones}
          />
        </CardPreviewShell>
      </div>
    )

    // Shell and scaler elements exist
    expect(screen.getByTestId('card-preview-shell')).toBeInTheDocument()
    const scaler = screen.getByTestId('card-preview-scaler')
    expect(scaler).toBeInTheDocument()
    expect(scaler).toHaveStyle({ width: '384px' })

    // All elements of StampCard are present
    expect(screen.getByText('IntelliStamp Staging Demo')).toBeInTheDocument()
    expect(screen.getByText('Free coffee')).toBeInTheDocument()
    expect(screen.getByText('2 of 6 visits')).toBeInTheDocument()

    // 6 stamps exist
    expect(screen.getByRole('img', { name: /2 of 6 stamps collected/i })).toBeInTheDocument()

    // Milestone gift marker attached
    expect(screen.getByTestId('milestone-gift-marker')).toBeInTheDocument()

    // Footer complete
    expect(screen.getByText('IntelliStamp')).toBeInTheDocument()
    expect(screen.getByText('Labs')).toBeInTheDocument()
  })

  test('2. Scales down when available width is narrower than designWidth (384px)', () => {
    render(
      <CardPreviewShell designWidth={384}>
        <StampCard
          stampsRequired={6}
          cardStamps={2}
          businessName="IntelliStamp Staging Demo"
          businessEmoji="☕"
          reward="Free coffee"
        />
      </CardPreviewShell>
    )

    const shell = screen.getByTestId('card-preview-shell')
    const scaler = screen.getByTestId('card-preview-scaler')

    // Simulate container width = 307.2px (scale = 0.8)
    Object.defineProperty(shell, 'clientWidth', { value: 307.2, configurable: true })

    // Trigger window resize event to invoke updateDimensions
    act(() => {
      window.dispatchEvent(new Event('resize'))
    })

    // Scaler should have transform scale(0.8)
    expect(scaler.style.transform).toBe('scale(0.8)')
    expect(scaler.style.transformOrigin).toBe('top center')
    expect(scaler.style.position).toBe('absolute')
  })

  test('3. Renders at 100% scale (no scale transform) when container width >= 384px', () => {
    render(
      <CardPreviewShell designWidth={384}>
        <StampCard
          stampsRequired={6}
          cardStamps={2}
          businessName="IntelliStamp Staging Demo"
          businessEmoji="☕"
          reward="Free coffee"
        />
      </CardPreviewShell>
    )

    const shell = screen.getByTestId('card-preview-shell')
    const scaler = screen.getByTestId('card-preview-scaler')

    // Simulate container width = 420px (scale = 1.0)
    Object.defineProperty(shell, 'clientWidth', { value: 420, configurable: true })

    act(() => {
      window.dispatchEvent(new Event('resize'))
    })

    expect(scaler.style.transform).toBe('')
    expect(scaler.style.position).toBe('relative')
  })

  test('4. Does not break Motion animations inside StampCard', () => {
    const { rerender } = render(
      <CardPreviewShell designWidth={384}>
        <StampCard
          stampsRequired={6}
          cardStamps={3}
          totalVisits={3}
          businessName="IntelliStamp Staging Demo"
          businessEmoji="☕"
          reward="Free coffee"
          milestones={mockMilestones}
          hideRewardDetails={true}
        />
      </CardPreviewShell>
    )

    // Milestone 4 is locked
    expect(screen.getByText('Surprise reward')).toBeInTheDocument()

    // Transition to earned: 3 -> 4 visits
    const updatedMilestones: MilestoneWithStatus[] = [
      { ...mockMilestones[0], earned: true, visits_remaining: 0 },
    ]

    act(() => {
      rerender(
        <CardPreviewShell designWidth={384}>
          <StampCard
            stampsRequired={6}
            cardStamps={4}
            totalVisits={4}
            newStampIndex={3}
            businessName="IntelliStamp Staging Demo"
            businessEmoji="☕"
            reward="Free coffee"
            milestones={updatedMilestones}
            hideRewardDetails={true}
          />
        </CardPreviewShell>
      )
    })

    // Reveal sequence elements appear cleanly inside CardPreviewShell
    expect(screen.getByTestId('milestone-trophy-pop')).toBeInTheDocument()
    expect(screen.getByTestId('milestone-unlock-halo')).toBeInTheDocument()
    expect(screen.getByText('Free Coffee')).toBeInTheDocument()
  })
})
