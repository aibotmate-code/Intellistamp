/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom'
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import QRDisplay from '../QRDisplay'

// Mock qrcode.react to render a predictable SVG element
jest.mock('qrcode.react', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  QRCodeSVG: ({ value, bgColor, fgColor }: any) => (
    <svg data-testid="qr-svg" data-value={value} data-bg={bgColor} data-fg={fgColor} />
  )
}))

describe('QRDisplay Component', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    global.fetch = originalFetch
    jest.useRealTimers()
  })

  test('empty token shows loading state initially', async () => {
    // Hang the fetch so it stays in loading
    global.fetch = jest.fn(() => new Promise(() => {}))

    render(<QRDisplay bizId="test-biz" />)

    // Should show loading text initially
    expect(screen.getByText('Loading QR...')).toBeInTheDocument()
    // SVG should not be rendered yet
    expect(screen.queryByTestId('qr-svg')).not.toBeInTheDocument()
  })

  test('valid token renders QR SVG with explicit foreground and background colors', async () => {
    const mockToken = 'mock_valid_token_12345'
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ token: mockToken })
    })

    render(<QRDisplay bizId="test-biz" />)

    // Wait for the fetch to resolve and state to update
    await waitFor(() => {
      expect(screen.getByTestId('qr-svg')).toBeInTheDocument()
    })

    const svg = screen.getByTestId('qr-svg')
    expect(svg).toHaveAttribute('data-value', expect.stringContaining(mockToken))
    
    // Proves foreground and background are explicitly set and different
    expect(svg).toHaveAttribute('data-bg', '#ffffff')
    expect(svg).toHaveAttribute('data-fg', '#000000')
    expect(svg.getAttribute('data-bg')).not.toEqual(svg.getAttribute('data-fg'))
  })

  test('API error shows explicit error state', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 403
    })

    render(<QRDisplay bizId="test-biz" />)

    await waitFor(() => {
      expect(screen.getByText('Error: error_403')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('qr-svg')).not.toBeInTheDocument()
  })
})
