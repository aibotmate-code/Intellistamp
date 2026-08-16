/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AccountPage from '../page'
import { createBrowserClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}))

jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createBrowserClient: jest.fn()
}))

describe('Account Page UX', () => {
  const mockPush = jest.fn()
  const mockSignOut = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
    ;(createBrowserClient as jest.Mock).mockReturnValue({
      auth: { 
        getSession: jest.fn().mockResolvedValue({
          data: { session: { user: { id: '123', email: 'owner@test.com' } } }
        }),
        signOut: mockSignOut
      }
    })
  })

  test('password form hidden by default and expands on click', async () => {
    render(<AccountPage />)
    
    await waitFor(() => {
      expect(screen.getByText('owner@test.com')).toBeInTheDocument()
    })

    expect(screen.queryByText(/Save Password/i)).not.toBeInTheDocument()
    
    fireEvent.click(screen.getByText(/Change password/i))
    expect(screen.getByText(/Save Password/i)).toBeInTheDocument()
    
    fireEvent.click(screen.getByText(/Cancel/i))
    expect(screen.queryByText(/Save Password/i)).not.toBeInTheDocument()
  })

  test('switch account calls signOut', async () => {
    render(<AccountPage />)
    
    await waitFor(() => {
      expect(screen.getByText('owner@test.com')).toBeInTheDocument()
    })

    const switchBtn = screen.getByText('Switch account')
    fireEvent.click(switchBtn)

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith('/login')
    })
  })
})
