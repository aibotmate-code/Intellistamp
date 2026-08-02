/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom'
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import KioskMode from '../KioskMode'

jest.mock('qrcode.react', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  QRCodeSVG: ({ value, bgColor, fgColor }: any) => (
    <svg data-testid="qr-svg-kiosk" data-value={value} data-bg={bgColor} data-fg={fgColor} />
  )
}))

describe('KioskMode Component', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  test('KioskMode uses identical token fetching and explicit foreground/background colors', async () => {
    const mockToken = 'mock_kiosk_token_999'
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ token: mockToken })
    })

    render(
      <KioskMode 
        bizId="test-biz" 
        businessName="Test Biz" 
        businessEmoji="☕" 
        onExit={jest.fn()} 
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('qr-svg-kiosk')).toBeInTheDocument()
    })

    const svg = screen.getByTestId('qr-svg-kiosk')
    // Proves it fetches and uses the token
    expect(svg).toHaveAttribute('data-value', expect.stringContaining(mockToken))
    
    // Proves explicit foreground and background differentiation
    expect(svg).toHaveAttribute('data-bg', '#ffffff')
    expect(svg).toHaveAttribute('data-fg', '#000000')
    expect(svg.getAttribute('data-bg')).not.toEqual(svg.getAttribute('data-fg'))
  })
})
