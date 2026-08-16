/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom'
import React from 'react'
import { render, screen } from '@testing-library/react'
import { PendingView } from '../LifecycleViews'

describe('LifecycleViews Components', () => {
  const mockBusiness = {
    id: 'biz-1',
    name: 'Test Bakery',
    category: 'Cafe',
    emoji: '🥐',
    stamps_required: 10,
    reward: 'Free Coffee',
    staff_pin: '1234',
    gmb_link: '',
    dynamic_qr_enabled: false,
    staff_pin_enabled: false,
    owner_id: 'user-1',
    owner_phone: '1234567890',
    approval_status: 'pending' as const,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    slug: 'test-bakery',
    whatsapp_enabled: false,
    plan: 'free' as const,
    plan_expires_at: null,
    conflict_priority: 'stamp' as const
  }

  test('PendingView displays correct WhatsApp and Email support links', () => {
    render(<PendingView business={mockBusiness} onRefresh={jest.fn()} />)
    
    const whatsappLink = screen.getByText('WhatsApp Support')
    expect(whatsappLink).toBeInTheDocument()
    expect(whatsappLink).toHaveAttribute('href', 'https://wa.me/919286799934?text=Hi%20Intellical%20Labs%2C%20I%20need%20help%20with%20my%20IntelliStamp%20account.')

    const emailLink = screen.getByText('Email Support')
    expect(emailLink).toBeInTheDocument()
    expect(emailLink).toHaveAttribute('href', 'mailto:hello@intellicallabs.com')
  })
})
