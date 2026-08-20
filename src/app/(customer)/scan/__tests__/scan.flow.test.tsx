/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ScanPage from '../[bizId]/page'

// Mock next/navigation
const mockPush = jest.fn()
let mockQrToken: string | null = 'signed_qr_token_123'
const mockBizId = '550e8400-e29b-41d4-a716-446655440000'

jest.mock('next/navigation', () => ({
  useParams: () => ({ bizId: mockBizId }),
  useSearchParams: () => ({
    get: (key: string) => (key === 't' || key === 'token' ? mockQrToken : null),
  }),
  useRouter: () => ({
    push: mockPush,
  }),
}))

describe('ScanPage Customer Identify Flow', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
    mockQrToken = 'signed_qr_token_123'
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  test('1. New customer response (isNew: true, needsName: true) transitions to name state without crashing', async () => {
    global.fetch = jest.fn()
      // 1st call: fetch business
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          business: {
            id: mockBizId,
            name: 'Staging Cafe',
            emoji: '☕',
            reward: 'Free Coffee',
            stamps_required: 5,
          },
        }),
      })
      // 2nd call: POST /api/customer/identify -> returns isNew: true, needsName: true
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          isNew: true,
          needsName: true,
        }),
      })

    render(<ScanPage />)

    // Wait for login/phone form to be visible
    await waitFor(() => {
      expect(screen.getByLabelText(/Mobile Number/i)).toBeInTheDocument()
    })

    // Enter mobile number
    fireEvent.change(screen.getByLabelText(/Mobile Number/i), { target: { value: '9876543210' } })
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }))

    // Expect transition to name step
    await waitFor(() => {
      expect(screen.getByText(/What is your name\?/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Your Name/i)).toBeInTheDocument()
    })

    // Verify request payload included qr_token
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/customer/identify',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          phone: '9876543210',
          business_id: mockBizId,
          qr_token: 'signed_qr_token_123',
        }),
      })
    )
  })

  test('2. Returning customer with invalid/missing QR (isNew: false, readyToStamp: false) displays server message without crash', async () => {
    mockQrToken = null // No QR token

    global.fetch = jest.fn()
      // 1st call: fetch business
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          business: {
            id: mockBizId,
            name: 'Staging Cafe',
            emoji: '☕',
            reward: 'Free Coffee',
            stamps_required: 5,
          },
        }),
      })
      // 2nd call: POST /api/customer/identify -> returns recovery wall message
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          isNew: false,
          readyToStamp: false,
          message: 'This card cannot be recovered automatically. Please ask the business staff to restore access.',
        }),
      })

    render(<ScanPage />)

    await waitFor(() => {
      expect(screen.getByLabelText(/Mobile Number/i)).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText(/Mobile Number/i), { target: { value: '9876543210' } })
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }))

    // Expect server message displayed without throwing TypeError or claiming "Network error"
    await waitFor(() => {
      expect(screen.getByText(/ask the business staff to restore access/i)).toBeInTheDocument()
    })

    // No session stored
    expect(localStorage.getItem('customer_session')).toBeNull()
  })

  test('3. Returning customer with valid QR (isNew: false, readyToStamp: true) uses customer_id and transitions to stamping', async () => {
    global.fetch = jest.fn()
      // 1st call: fetch business
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          business: {
            id: mockBizId,
            name: 'Staging Cafe',
            emoji: '☕',
            reward: 'Free Coffee',
            stamps_required: 5,
          },
        }),
      })
      // 2nd call: POST /api/customer/identify -> returns readyToStamp with customer_id
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          isNew: false,
          readyToStamp: true,
          customer_id: 'cust_uuid_999',
          name: 'Priya',
        }),
      })
      // 3rd call: POST /api/stamp/issue -> issue stamp
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          card_state: {
            total_stamps: 3,
            card_stamps: 3,
            cards_completed: 0,
            redeemable: false,
          },
        }),
      })

    render(<ScanPage />)

    await waitFor(() => {
      expect(screen.getByLabelText(/Mobile Number/i)).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText(/Mobile Number/i), { target: { value: '9876543210' } })
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }))

    // Transition to stamping and then success
    await waitFor(() => {
      expect(screen.getByText(/Stamp added/i)).toBeInTheDocument()
    })

    // Session saved with customer_id (no customer_token required)
    const stored = JSON.parse(localStorage.getItem('customer_session') || '{}')
    expect(stored.id).toBe('cust_uuid_999')
    expect(stored.phone).toBe('9876543210')
    expect(stored.name).toBe('Priya')
  })

  test('4. Request includes qr_token when present in URL params', async () => {
    mockQrToken = 'custom_signed_token_abc'

    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          business: { id: mockBizId, name: 'Staging Cafe', emoji: '☕', reward: 'Reward', stamps_required: 5 },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, isNew: true, needsName: true }),
      })

    render(<ScanPage />)

    await waitFor(() => {
      expect(screen.getByLabelText(/Mobile Number/i)).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText(/Mobile Number/i), { target: { value: '9876543210' } })
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/customer/identify',
        expect.objectContaining({
          body: JSON.stringify({
            phone: '9876543210',
            business_id: mockBizId,
            qr_token: 'custom_signed_token_abc',
          }),
        })
      )
    })
  })

  test('5. Missing data.customer never causes a TypeError', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          business: { id: mockBizId, name: 'Staging Cafe', emoji: '☕', reward: 'Reward', stamps_required: 5 },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          // Arbitrary payload without data.customer
          unknown_field: true,
        }),
      })

    render(<ScanPage />)

    await waitFor(() => {
      expect(screen.getByLabelText(/Mobile Number/i)).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText(/Mobile Number/i), { target: { value: '9876543210' } })
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }))

    // Should display graceful fallback error rather than crashing
    await waitFor(() => {
      expect(screen.getByText(/Something went wrong. Please try again./i)).toBeInTheDocument()
    })
  })

  test('6. Actual fetch network rejection shows Network error message', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          business: { id: mockBizId, name: 'Staging Cafe', emoji: '☕', reward: 'Reward', stamps_required: 5 },
        }),
      })
      .mockRejectedValueOnce(new Error('Failed to fetch'))

    render(<ScanPage />)

    await waitFor(() => {
      expect(screen.getByLabelText(/Mobile Number/i)).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText(/Mobile Number/i), { target: { value: '9876543210' } })
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }))

    // Network rejection triggers "Network error. Please try again."
    await waitFor(() => {
      expect(screen.getByText(/Network error. Please try again./i)).toBeInTheDocument()
    })
  })
})
