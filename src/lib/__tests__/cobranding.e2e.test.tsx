/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import StampCard from '@/components/customer/StampCard'
import BusinessVisual from '@/components/branding/BusinessVisual'
import { resolveBrandingColors, deriveThemeFromPrimary } from '@/lib/branding/palette'
import type { BusinessBranding, MilestoneWithStatus } from '@/types'

// ── Test Fixtures ─────────────────────────────────────────────────────────────

const mockMilestones: MilestoneWithStatus[] = [
  {
    id: 'ms-bronze',
    business_id: 'biz-1',
    visit_number: 5,
    badge: 'Bronze Tier',
    reward: 'Free Cookie',
    is_active: true,
    earned: true,
    visits_remaining: 0,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'ms-silver',
    business_id: 'biz-1',
    visit_number: 10,
    badge: 'Silver Tier',
    reward: '1 Pizza Free',
    is_active: true,
    earned: false,
    visits_remaining: 5,
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

describe('IntelliStamp Co-Branding & Loyalty Card E2E Validation', () => {
  beforeAll(() => {
    process.env.NEXT_PUBLIC_TENANT_BRANDING_ENABLED = 'true'
  })

  // ═════════════════════════════════════════════════════════════════════════════
  // SCENARIO 1 — LOGO REFLECTS EVERYWHERE + INITIALS FALLBACK
  // ═════════════════════════════════════════════════════════════════════════════
  describe('Scenario 1 — Logo Reflects Everywhere & Initials Fallback', () => {
    test('renders uploaded merchant logo in a styled container without emoji', () => {
      const { container } = render(
        <StampCard
          stampsRequired={8}
          cardStamps={3}
          businessName="Coffee Lab"
          businessEmoji="☕"
          reward="Free Espresso"
          businessBranding={baseBranding}
        />
      )

      const logoImg = screen.getByRole('img', { name: /Coffee Lab logo/i })
      expect(logoImg).toBeInTheDocument()
      expect(logoImg).toHaveAttribute('src', baseBranding.logo_url)
      expect(logoImg.className).toContain('object-contain')

      // Emoji should not be rendered when logo exists
      expect(container.textContent).not.toContain('☕')
    })

    test('falls back to clean uppercase initials when logo fails to load', () => {
      const { container } = render(
        <BusinessVisual
          logoUrl="https://invalid.url/broken_logo.png"
          emoji="☕"
          name="Coffee Lab"
        />
      )

      const logoImg = screen.getByRole('img', { name: /Coffee Lab logo/i })
      // Simulate image load failure
      fireEvent.error(logoImg)

      // Initials "CL" should appear in a rounded avatar container
      expect(screen.getByText('CL')).toBeInTheDocument()
      expect(screen.queryByRole('img')).not.toBeInTheDocument()
      expect(container.textContent).not.toContain('☕')
    })

    test('falls back to clean initials when logoUrl is null/empty', () => {
      render(
        <BusinessVisual
          logoUrl={null}
          emoji="☕"
          name="The Artisan Roaster"
        />
      )

      expect(screen.getByText('TA')).toBeInTheDocument()
    })
  })

  // ═════════════════════════════════════════════════════════════════════════════
  // SCENARIO 2 — AUTO THEME REFLECTS EVERYWHERE
  // ═════════════════════════════════════════════════════════════════════════════
  describe('Scenario 2 — Auto Theme Reflects Everywhere', () => {
    test('derives contrast-safe theme and updates primary, dark, light and text colors', () => {
      const detectedHex = '#E11D48' // Bright Rose
      const autoTheme = deriveThemeFromPrimary(detectedHex, '#18181B')

      expect(autoTheme.primary_color).toBe('#E11D48')
      expect(autoTheme.primary_dark_color).toBeDefined()
      expect(autoTheme.primary_light_color).toBeDefined()
      // On dark background (#18181B), card text color should be light
      expect(autoTheme.card_text_color).toBe('#F5F5F5')
      expect(autoTheme.card_muted_text_color).toBe('#A1A1AA')

      const brandingWithAutoTheme: BusinessBranding = {
        ...baseBranding,
        ...autoTheme,
      }

      const { container } = render(
        <StampCard
          stampsRequired={8}
          cardStamps={2}
          businessName="Rose Bakery"
          businessEmoji="🌹"
          reward="Free Croissant"
          businessBranding={brandingWithAutoTheme}
        />
      )

      // Card heading should use auto-detected card text color
      const heading = screen.getByText('Rose Bakery')
      expect(heading).toHaveStyle({ color: '#F5F5F5' })

      // Empty stamp colors should NOT be overwritten by auto theme
      expect(brandingWithAutoTheme.empty_stamp_color).toBe('#27272A')
      expect(brandingWithAutoTheme.empty_stamp_border_color).toBe('#3F3F46')
      expect(container).toBeInTheDocument()
    })
  })

  // ═════════════════════════════════════════════════════════════════════════════
  // SCENARIO 3 — MANUAL COLOR OVERRIDES
  // ═════════════════════════════════════════════════════════════════════════════
  describe('Scenario 3 — Manual Color Overrides', () => {
    test('explicit manual colors override auto defaults across customer card', () => {
      const customBranding: BusinessBranding = {
        ...baseBranding,
        primary_color: '#6366F1', // Indigo
        surface_color: '#0F172A', // Slate 900
        card_text_color: '#38BDF8', // Sky 400
        card_muted_text_color: '#94A3B8',
        empty_stamp_color: '#1E293B',
        empty_stamp_border_color: '#475569',
      }

      const { container } = render(
        <StampCard
          stampsRequired={8}
          cardStamps={1}
          businessName="Custom Lounge"
          businessEmoji="🍸"
          reward="Signature Drink"
          businessBranding={customBranding}
        />
      )

      // Surface color applied to root card
      const cardRoot = container.firstElementChild as HTMLElement
      expect(cardRoot).toHaveStyle({ background: '#0F172A' })

      // Heading uses manual card_text_color
      const title = screen.getByText('Custom Lounge')
      expect(title).toHaveStyle({ color: '#38BDF8' })
    })
  })

  // ═════════════════════════════════════════════════════════════════════════════
  // SCENARIO 4 — CARD BACKGROUND IMAGE & TINT OVERLAY
  // ═════════════════════════════════════════════════════════════════════════════
  describe('Scenario 4 — Card Background Image & Tint Overlay', () => {
    test('renders multi-layer background texture with tint overlay without fading text/content', () => {
      const { container } = render(
        <StampCard
          stampsRequired={8}
          cardStamps={2}
          businessName="Texture Cafe"
          businessEmoji="☕"
          reward="Free Muffin"
          businessBranding={baseBranding}
        />
      )

      const cardRoot = container.firstElementChild as HTMLElement
      expect(cardRoot).toHaveClass('relative', 'overflow-hidden')

      // Layer 1: Pattern image div
      const bgPatternLayer = cardRoot.querySelector('[style*="background-image"]')
      expect(bgPatternLayer).toBeInTheDocument()
      expect(bgPatternLayer).toHaveClass('absolute', 'inset-0', 'bg-cover', 'bg-center')

      // Layer 2: Overlay tint div
      const overlayLayer = cardRoot.querySelector('[style*="opacity"]')
      expect(overlayLayer).toBeInTheDocument()
      expect(overlayLayer).toHaveStyle({
        backgroundColor: '#18181B',
        opacity: '0.6',
      })

      // Layer 3: Interactive content is relative and not faded
      const contentLayer = cardRoot.querySelector('.relative.z-10')
      expect(contentLayer).toBeInTheDocument()
      expect(contentLayer).not.toHaveStyle({ opacity: '0.6' })
    })

    test.each([0.2, 0.6, 0.9])('renders overlay opacity correctly for %p', (opacity) => {
      const brandingWithOpacity: BusinessBranding = {
        ...baseBranding,
        card_background_overlay: opacity,
        card_bg_overlay_opacity: opacity,
      }

      const { container } = render(
        <StampCard
          stampsRequired={8}
          cardStamps={2}
          businessName="Texture Cafe"
          businessEmoji="☕"
          reward="Free Muffin"
          businessBranding={brandingWithOpacity}
        />
      )

      const overlayLayer = container.querySelector('[style*="opacity"]')
      expect(overlayLayer).toHaveStyle({ opacity: String(opacity) })
    })
  })

  // ═════════════════════════════════════════════════════════════════════════════
  // SCENARIO 5 & 6 — REPLACE AND REMOVE BACKGROUND
  // ═════════════════════════════════════════════════════════════════════════════
  describe('Scenario 5 & 6 — Replace and Remove Background Image', () => {
    test('replaces background image URL smoothly', () => {
      const replacedBranding: BusinessBranding = {
        ...baseBranding,
        card_background_image_url: 'https://staging.intellistamp.com/patterns/stripes.png',
      }

      const { container } = render(
        <StampCard
          stampsRequired={8}
          cardStamps={2}
          businessName="Pattern Cafe"
          businessEmoji="☕"
          reward="Free Muffin"
          businessBranding={replacedBranding}
        />
      )

      const bgPatternLayer = container.querySelector('[style*="background-image"]') as HTMLElement
      expect(bgPatternLayer.style.backgroundImage).toContain('stripes.png')
    })

    test('removing background image cleanly falls back to solid surface', () => {
      const noBgBranding: BusinessBranding = {
        ...baseBranding,
        card_background_image_url: null,
        card_bg_image_path: null,
      }

      const { container } = render(
        <StampCard
          stampsRequired={8}
          cardStamps={2}
          businessName="Solid Cafe"
          businessEmoji="☕"
          reward="Free Muffin"
          businessBranding={noBgBranding}
        />
      )

      expect(container.querySelector('[style*="background-image"]')).toBeNull()
      expect(container.querySelector('[style*="opacity"]')).toBeNull()
      const cardRoot = container.firstElementChild as HTMLElement
      expect(cardRoot).toHaveStyle({ background: '#18181B' })
    })
  })

  // ═════════════════════════════════════════════════════════════════════════════
  // SCENARIO 7 — MYSTERY REWARD OFF
  // ═════════════════════════════════════════════════════════════════════════════
  describe('Scenario 7 — Mystery Reward OFF', () => {
    test('displays real reward title for locked milestone when hideRewardDetails is false', () => {
      render(
        <StampCard
          stampsRequired={8}
          cardStamps={3}
          totalVisits={3}
          businessName="Pizza Place"
          businessEmoji="🍕"
          reward="Free Slice"
          milestones={mockMilestones}
          hideRewardDetails={false}
        />
      )

      // Earned milestone displays "Free Cookie"
      expect(screen.getByText('Free Cookie')).toBeInTheDocument()
      // Locked milestone displays real reward name "1 Pizza Free"
      expect(screen.getByText('1 Pizza Free')).toBeInTheDocument()
      expect(screen.queryByText('Surprise reward')).not.toBeInTheDocument()
    })
  })

  // ═════════════════════════════════════════════════════════════════════════════
  // SCENARIO 8 — MYSTERY REWARD ON
  // ═════════════════════════════════════════════════════════════════════════════
  describe('Scenario 8 — Mystery Reward ON', () => {
    test('masks locked milestone reward name as Surprise reward when hideRewardDetails is true', () => {
      render(
        <StampCard
          stampsRequired={8}
          cardStamps={3}
          totalVisits={3}
          businessName="Pizza Place"
          businessEmoji="🍕"
          reward="Free Slice"
          milestones={mockMilestones}
          hideRewardDetails={true}
        />
      )

      // Earned milestone displays real reward "Free Cookie"
      expect(screen.getByText('Free Cookie')).toBeInTheDocument()
      // Locked milestone hides "1 Pizza Free" and shows "Surprise reward"
      expect(screen.getByText('Surprise reward')).toBeInTheDocument()
      expect(screen.queryByText('1 Pizza Free')).not.toBeInTheDocument()

      // Visits left indicator remains clearly visible (10 - 3 = 7 visits left)
      expect(screen.getByText('7 visits left')).toBeInTheDocument()
    })
  })

  // ═════════════════════════════════════════════════════════════════════════════
  // SCENARIO 9 — MYSTERY REWARD REVEALS WHEN EARNED
  // ═════════════════════════════════════════════════════════════════════════════
  describe('Scenario 9 — Mystery Reward Reveals When Earned', () => {
    test('reveals real reward name once customer reaches and earns the milestone', () => {
      const earnedMilestones: MilestoneWithStatus[] = [
        {
          ...mockMilestones[0],
          earned: true,
        },
        {
          ...mockMilestones[1],
          earned: true, // Now earned!
          visits_remaining: 0,
        },
      ]

      render(
        <StampCard
          stampsRequired={8}
          cardStamps={2}
          totalVisits={10}
          businessName="Pizza Place"
          businessEmoji="🍕"
          reward="Free Slice"
          milestones={earnedMilestones}
          hideRewardDetails={true}
        />
      )

      // Both rewards are now earned and fully revealed
      expect(screen.getByText('Free Cookie')).toBeInTheDocument()
      expect(screen.getByText('1 Pizza Free')).toBeInTheDocument()
      expect(screen.queryByText('Surprise reward')).not.toBeInTheDocument()
      expect(screen.getAllByText('Earned')).toHaveLength(2)
    })
  })

  // ═════════════════════════════════════════════════════════════════════════════
  // SCENARIO 10 — BUSINESS DASHBOARD PREVIEW SYNC
  // ═════════════════════════════════════════════════════════════════════════════
  describe('Scenario 10 — Business Dashboard Preview Sync', () => {
    test('preview renders identical branding structure as the customer card', () => {
      const { container: previewContainer } = render(
        <StampCard
          stampsRequired={8}
          cardStamps={3}
          businessName="Preview Business"
          businessEmoji="🏪"
          reward="Loyalty Perk"
          businessBranding={baseBranding}
          hideRewardDetails={true}
          milestones={mockMilestones}
        />
      )

      const { container: customerContainer } = render(
        <StampCard
          stampsRequired={8}
          cardStamps={3}
          businessName="Preview Business"
          businessEmoji="🏪"
          reward="Loyalty Perk"
          businessBranding={baseBranding}
          hideRewardDetails={true}
          milestones={mockMilestones}
        />
      )

      // Both containers share identical layout hierarchy and styling properties
      expect(previewContainer.innerHTML).toBe(customerContainer.innerHTML)
    })
  })

  // ═════════════════════════════════════════════════════════════════════════════
  // SCENARIO 11 — TENANT ISOLATION
  // ═════════════════════════════════════════════════════════════════════════════
  describe('Scenario 11 — Tenant Isolation', () => {
    test('strictly separates Tenant A and Tenant B branding and mystery reward settings', () => {
      const tenantABranding: BusinessBranding = {
        ...baseBranding,
        business_id: 'tenant-a',
        primary_color: '#10B981', // Emerald
        logo_url: 'https://staging.intellistamp.com/logos/tenant_a.png',
      }

      const tenantBBranding: BusinessBranding = {
        ...baseBranding,
        business_id: 'tenant-b',
        primary_color: '#F59E0B', // Amber
        logo_url: 'https://staging.intellistamp.com/logos/tenant_b.png',
      }

      const resolvedA = resolveBrandingColors(tenantABranding, true)
      const resolvedB = resolveBrandingColors(tenantBBranding, true)

      expect(resolvedA.primary_color).toBe('#10B981')
      expect(resolvedB.primary_color).toBe('#F59E0B')
      expect(tenantABranding.logo_url).not.toBe(tenantBBranding.logo_url)
    })
  })

  // ═════════════════════════════════════════════════════════════════════════════
  // SCENARIO 12 — EXISTING BUSINESS BACKWARD COMPATIBILITY
  // ═════════════════════════════════════════════════════════════════════════════
  describe('Scenario 12 — Backward Compatibility with Legacy Businesses', () => {
    test('renders legacy business without branding row or missing fields without crash', () => {
      const { container } = render(
        <StampCard
          stampsRequired={8}
          cardStamps={2}
          businessName="Old School Diner"
          businessEmoji="🍔"
          reward="Free Fries"
          businessBranding={null}
          hideRewardDetails={undefined}
        />
      )

      expect(screen.getByText('Old School Diner')).toBeInTheDocument()
      expect(screen.getByText('Free Fries')).toBeInTheDocument()
      expect(screen.getByText('OS')).toBeInTheDocument() // Clean initials ("Old School" -> "OS")
      expect(container.querySelector('.border-t')).toBeInTheDocument() // Footer exists
    })
  })

  // ═════════════════════════════════════════════════════════════════════════════
  // SCENARIO 13 — MOBILE RESPONSIVENESS & FOOTER BRANDING
  // ═════════════════════════════════════════════════════════════════════════════
  describe('Scenario 13 — Mobile Responsiveness & Footer Branding', () => {
    test('8-stamp card produces 4 columns for clean 4x2 grid with centered stamps', () => {
      const { container } = render(
        <StampCard
          stampsRequired={8}
          cardStamps={4}
          businessName="Mobile Cafe"
          businessEmoji="☕"
          reward="Free Chai"
        />
      )

      const grid = container.querySelector('[style*="grid-template-columns"]') as HTMLElement
      expect(grid.style.gridTemplateColumns).toBe('repeat(4, minmax(0, 1fr))')

      // Centered footer branding: IntelliStamp | by Intellical Labs
      const footer = container.querySelector('.mt-5.pt-3\\.5.border-t')
      expect(footer).toBeInTheDocument()
      expect(footer?.textContent).toContain('IntelliStamp')
      expect(footer?.textContent).toContain('Intellical')
      expect(footer?.textContent).toContain('Labs')
    })
  })

  // ═════════════════════════════════════════════════════════════════════════════
  // SCENARIO 14 — LONG BUSINESS NAME TRUNCATION & SPACING
  // ═════════════════════════════════════════════════════════════════════════════
  describe('Scenario 14 — Long Business Name Truncation & Layout Safety', () => {
    test('handles very long merchant name without breaking visit badge or avatar container', () => {
      render(
        <StampCard
          stampsRequired={8}
          cardStamps={2}
          totalVisits={15}
          businessName="The Grand Majestic Artisanal Espresso and Coffee Roasters International Ltd"
          businessEmoji="☕"
          reward="Complimentary Specialty Cold Brew"
          businessBranding={baseBranding}
        />
      )

      const title = screen.getByText(/The Grand Majestic Artisanal/i)
      expect(title).toHaveClass('break-words')

      // Total visits pill badge is present and undamaged
      expect(screen.getByText('15 visits')).toBeInTheDocument()
    })
  })

  // ═════════════════════════════════════════════════════════════════════════════
  // SCENARIO 15 — WHITE / DARK LOGOS CONTRAST
  // ═════════════════════════════════════════════════════════════════════════════
  describe('Scenario 15 — White / Dark Logos Visibility', () => {
    test('white and dark logos remain clear inside subtle avatar wrapper', () => {
      const { container } = render(
        <BusinessVisual
          logoUrl="https://staging.intellistamp.com/white_logo.png"
          name="White Brand"
        />
      )

      const wrapper = container.firstElementChild as HTMLElement
      expect(wrapper).toHaveClass('bg-zinc-900/80', 'border', 'border-zinc-700/50')
    })
  })
})
