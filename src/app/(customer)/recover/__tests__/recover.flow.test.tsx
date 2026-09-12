/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom'
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import RecoverPage from '../[bizId]/page'

const mockPush = jest.fn()
const mockBizId = '550e8400-e29b-41d4-a716-446655440000'

jest.mock('next/navigation', () => ({
  useParams: () => ({ bizId: mockBizId }),
  useRouter: () => ({
    push: mockPush,
  }),
}))

describe('RecoverPage Branding Flow', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  test('renders merchant name, logo, and primary CTA color when branding is enabled', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        business: {
          id: mockBizId,
          name: 'Coffea Staging',
          emoji: '☕',
          branding: {
            business_id: mockBizId,
            logo_url: 'https://staging.test/coffea-logo.png',
            card_background_image_url: 'https://staging.test/bg.jpg',
            primary_color: '#3A7874',
            text_on_primary: '#FFFFFF',
            is_enabled: true,
          },
        },
      }),
    })

    render(<RecoverPage />)

    await waitFor(() => {
      expect(screen.getByText('Coffea Staging')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Find My Card/i })).toBeInTheDocument()
    })

    const button = screen.getByRole('button', { name: /Find My Card/i })
    expect(button).toHaveStyle({
      backgroundColor: '#3A7874',
      color: '#FFFFFF',
    })

    expect(screen.getByText(/Powered by/i)).toBeInTheDocument()
  })

  test('falls back to default IntelliStamp styling when branding is absent', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        business: {
          id: mockBizId,
          name: 'Unbranded Shop',
          emoji: '🏬',
          branding: null,
        },
      }),
    })

    render(<RecoverPage />)

    await waitFor(() => {
      expect(screen.getByText('Unbranded Shop')).toBeInTheDocument()
    })

    const button = screen.getByRole('button', { name: /Find My Card/i })
    // When branding is null, style property is not set, defaulting to Tailwind class bg-amber-500
    expect(button.style.backgroundColor).toBe('')
  })
})
