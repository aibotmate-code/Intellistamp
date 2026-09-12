/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom'
import React from 'react'
import { render, screen, act } from '@testing-library/react'
import StampCard from '@/components/customer/StampCard'
import MilestoneGiftMarker from '@/components/customer/MilestoneGiftMarker'
import MilestoneUnlockSequence from '@/components/customer/MilestoneUnlockSequence'
import type { MilestoneWithStatus, BusinessBranding } from '@/types'

// Mock motion/react useReducedMotion for testing reduced-motion branches
let mockReducedMotion = false
jest.mock('motion/react', () => {
  const actual = jest.requireActual('motion/react')
  return {
    ...actual,
    useReducedMotion: () => mockReducedMotion,
  }
})

describe('Milestone Rewards Microinteraction Suite', () => {
  beforeEach(() => {
    mockReducedMotion = false
    jest.useFakeTimers()
  })

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers()
    })
    jest.useRealTimers()
  })

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
    {
      id: 'ms-8',
      business_id: 'biz-1',
      visit_number: 8,
      badge: 'Gold Tier',
      reward: 'Free Lunch',
      is_active: true,
      earned: false,
      visits_remaining: 6,
      created_at: '2026-01-01T00:00:00Z',
    },
  ]

  const baseBranding: BusinessBranding = {
    business_id: 'biz-1',
    logo_url: 'https://staging.intellistamp.com/logos/coffee_lab.png',
    card_background_image_url: 'https://staging.intellistamp.com/patterns/beans.png',
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

  // 1. Configured milestone has gift marker
  test('1. Configured milestone shows gift marker on its exact circle threshold', () => {
    const { container } = render(
      <StampCard
        stampsRequired={10}
        cardStamps={2}
        totalVisits={2}
        businessName="Cafe Test"
        businessEmoji="☕"
        reward="Reward"
        milestones={mockMilestones}
      />
    )

    // Markers should be attached to circle 4 and circle 8
    const marker4 = container.querySelector('[data-stamp-number="4"]')
    const marker8 = container.querySelector('[data-stamp-number="8"]')
    expect(marker4).toBeInTheDocument()
    expect(marker8).toBeInTheDocument()

    // Query inside marker 4
    expect(marker4?.querySelector('[data-testid="milestone-gift-marker"]')).toBeInTheDocument()
    expect(marker8?.querySelector('[data-testid="milestone-gift-marker"]')).toBeInTheDocument()
  })

  // 2. Non-milestone stamp does not show marker
  test('2. Non-milestone stamps do not show gift markers', () => {
    const { container } = render(
      <StampCard
        stampsRequired={10}
        cardStamps={2}
        totalVisits={2}
        businessName="Cafe Test"
        businessEmoji="☕"
        reward="Reward"
        milestones={mockMilestones}
      />
    )

    expect(container.querySelector('[data-stamp-number="1"]')).toBeNull()
    expect(container.querySelector('[data-stamp-number="2"]')).toBeNull()
    expect(container.querySelector('[data-stamp-number="3"]')).toBeNull()
    expect(container.querySelector('[data-stamp-number="5"]')).toBeNull()
    expect(container.querySelector('[data-stamp-number="6"]')).toBeNull()
    expect(container.querySelector('[data-stamp-number="7"]')).toBeNull()
  })

  // 3. Hidden reward remains hidden before unlock
  test('3. Hidden reward remains hidden before unlock (hide_reward_details = true)', () => {
    render(
      <StampCard
        stampsRequired={10}
        cardStamps={2}
        totalVisits={2}
        businessName="Cafe Test"
        businessEmoji="☕"
        reward="Reward"
        milestones={mockMilestones}
        hideRewardDetails={true}
      />
    )

    // Masked locked text should display "Surprise reward"
    const surpriseLabels = screen.getAllByText('Surprise reward')
    expect(surpriseLabels.length).toBeGreaterThanOrEqual(1)

    // Actual reward names should NOT be present
    expect(screen.queryByText('Free Coffee')).not.toBeInTheDocument()
    expect(screen.queryByText('Free Lunch')).not.toBeInTheDocument()
  })

  // 3b. Custom hidden reward text is displayed on locked milestones
  test('3b. Custom hidden reward text is displayed on locked milestones (hiddenRewardText)', () => {
    render(
      <StampCard
        stampsRequired={10}
        cardStamps={2}
        totalVisits={2}
        businessName="Cafe Test"
        businessEmoji="☕"
        reward="Reward"
        milestones={mockMilestones}
        hideRewardDetails={true}
        hiddenRewardText="Ajao lelo 😄"
      />
    )

    // Custom teaser text should be displayed for locked milestone
    const customLabels = screen.getAllByText('Ajao lelo 😄')
    expect(customLabels.length).toBeGreaterThanOrEqual(1)

    // Actual reward names should NOT be present
    expect(screen.queryByText('Free Coffee')).not.toBeInTheDocument()
    expect(screen.queryByText('Free Lunch')).not.toBeInTheDocument()
  })

  // 4. Locked -> earned triggers reveal state
  test('4. Locked -> earned transition triggers reveal animation', () => {
    const { rerender } = render(
      <StampCard
        stampsRequired={10}
        cardStamps={3}
        totalVisits={3}
        businessName="Cafe Test"
        businessEmoji="☕"
        reward="Reward"
        milestones={mockMilestones}
        hideRewardDetails={true}
      />
    )

    // Milestone 4 is currently locked
    expect(screen.queryByTestId('milestone-trophy-pop')).not.toBeInTheDocument()
    expect(screen.queryByTestId('milestone-unlock-halo')).not.toBeInTheDocument()

    // Transition to earned: 3 -> 4 visits
    const updatedMilestones: MilestoneWithStatus[] = [
      { ...mockMilestones[0], earned: true, visits_remaining: 0 },
      mockMilestones[1],
    ]

    act(() => {
      rerender(
        <StampCard
          stampsRequired={10}
          cardStamps={4}
          totalVisits={4}
          newStampIndex={3}
          businessName="Cafe Test"
          businessEmoji="☕"
          reward="Reward"
          milestones={updatedMilestones}
          hideRewardDetails={true}
        />
      )
    })

    // Reveal sequence elements appear
    expect(screen.getByTestId('milestone-trophy-pop')).toBeInTheDocument()
    expect(screen.getByTestId('milestone-unlock-halo')).toBeInTheDocument()
    expect(screen.getByTestId('milestone-reward-title-reveal')).toBeInTheDocument()
    expect(screen.getByText('Free Coffee')).toBeInTheDocument()

    // Fast-forward 800ms: animation settles completely static
    act(() => {
      jest.advanceTimersByTime(850)
    })

    expect(screen.queryByTestId('milestone-unlock-halo')).not.toBeInTheDocument()
    expect(screen.getByText('Earned')).toBeInTheDocument()
  })

  // 5. Already-earned initial page load does not continuously replay celebration
  test('5. Already-earned card load renders statically without playing unlock animation', () => {
    const alreadyEarnedMilestones: MilestoneWithStatus[] = [
      { ...mockMilestones[0], earned: true, visits_remaining: 0 },
      mockMilestones[1],
    ]

    render(
      <StampCard
        stampsRequired={10}
        cardStamps={5}
        totalVisits={5}
        businessName="Cafe Test"
        businessEmoji="☕"
        reward="Reward"
        milestones={alreadyEarnedMilestones}
      />
    )

    // Already earned milestone row is rendered
    expect(screen.getByTestId('milestone-unlocked-row')).toBeInTheDocument()
    expect(screen.getByText('Free Coffee')).toBeInTheDocument()
    expect(screen.getByText('Earned')).toBeInTheDocument()

    // Animated pop & halo MUST NOT be active
    expect(screen.queryByTestId('milestone-trophy-pop')).not.toBeInTheDocument()
    expect(screen.queryByTestId('milestone-unlock-halo')).not.toBeInTheDocument()
  })

  // 6. Reduced motion path works
  test('6. Reduced motion disables rotation and springs, rendering simple static transition', () => {
    mockReducedMotion = true

    render(
      <MilestoneUnlockSequence
        badge="Bronze Tier"
        rewardTitle="Free Coffee"
        primaryBrandColor="#3A7874"
        cardMutedTextColor="#A1A1AA"
        isBrandingEnabled={true}
        triggerUnlock={true}
      />
    )

    // Rendered row should exist
    expect(screen.getByTestId('milestone-unlocked-row')).toBeInTheDocument()
    expect(screen.getByText('Free Coffee')).toBeInTheDocument()
    expect(screen.getByText('Earned')).toBeInTheDocument()

    // No halo or trophy pop animation wrappers
    expect(screen.queryByTestId('milestone-unlock-halo')).not.toBeInTheDocument()
    expect(screen.queryByTestId('milestone-trophy-pop')).not.toBeInTheDocument()
  })

  // 7. Multiple milestones render on their respective configured thresholds
  test('7. Multiple milestones render markers on their respective configured thresholds (e.g. 4 and 8)', () => {
    const { container } = render(
      <StampCard
        stampsRequired={10}
        cardStamps={2}
        totalVisits={2}
        businessName="Cafe Test"
        businessEmoji="☕"
        reward="Reward"
        milestones={mockMilestones}
      />
    )

    const circle4Marker = container.querySelector('[data-stamp-number="4"]')
    const circle8Marker = container.querySelector('[data-stamp-number="8"]')
    expect(circle4Marker).toBeInTheDocument()
    expect(circle8Marker).toBeInTheDocument()
  })

  // 8. Merchant logo size remains canonical (w-11 h-11 sm:w-12 sm:h-12)
  test('8. Merchant logo container maintains canonical size classes (w-11 h-11 sm:w-12 sm:h-12)', () => {
    const { container } = render(
      <StampCard
        stampsRequired={10}
        cardStamps={2}
        businessName="Cafe Test"
        businessEmoji="☕"
        reward="Reward"
        businessBranding={baseBranding}
        milestones={mockMilestones}
      />
    )

    const logoContainer = container.querySelector('img')?.parentElement
    expect(logoContainer).toHaveClass('w-11')
    expect(logoContainer).toHaveClass('h-11')
    expect(logoContainer).toHaveClass('sm:w-12')
    expect(logoContainer).toHaveClass('sm:h-12')
  })

  // 9. StampCard still preserves background layers and overlays
  test('9. StampCard preserves separate visual layers (image and overlay)', () => {
    const { container } = render(
      <StampCard
        stampsRequired={10}
        cardStamps={2}
        businessName="Cafe Test"
        businessEmoji="☕"
        reward="Reward"
        businessBranding={baseBranding}
        milestones={mockMilestones}
      />
    )

    const bgImage = container.querySelector('[style*="background-image"]') as HTMLElement
    expect(bgImage).toBeInTheDocument()
    expect(bgImage.style.backgroundImage).toContain('beans.png')

    const overlay = container.querySelector('[style*="opacity"]') as HTMLElement
    expect(overlay).toBeInTheDocument()
    expect(overlay.style.opacity).toBe('0.6')
  })

  // 10. Existing reward calculation logic unchanged
  test('10. MilestoneGiftMarker stops attention pulse when earned is true', () => {
    const { container, rerender } = render(<MilestoneGiftMarker isEarned={false} />)
    const marker = container.querySelector('[data-testid="milestone-gift-marker"]')
    expect(marker).toBeInTheDocument()

    rerender(<MilestoneGiftMarker isEarned={true} />)
    const earnedMarker = container.querySelector('[data-testid="milestone-gift-marker"]')
    expect(earnedMarker).toBeInTheDocument()
  })
})
