/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import HomeAuthMenu from '../HomeAuthMenu'
import { createBrowserClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}))

jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createBrowserClient: jest.fn()
}))

describe('HomeAuthMenu Component', () => {
  const mockPush = jest.fn()
  const mockSignOut = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
    ;(createBrowserClient as jest.Mock).mockReturnValue({
      auth: { signOut: mockSignOut }
    })
  })

  test('displays user email and options', () => {
    render(<HomeAuthMenu email="test@example.com" />)
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
    expect(screen.getByText(/Go to Business Dashboard/)).toBeInTheDocument()
    expect(screen.queryByText(/My Account/)).not.toBeInTheDocument()
  })

  test('Sign out and switch calls signOut and redirects', async () => {
    render(<HomeAuthMenu email="test@example.com" />)
    
    const btn = screen.getByText('Switch Business Account')
    fireEvent.click(btn)

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith('/login')
    })
  })
})
