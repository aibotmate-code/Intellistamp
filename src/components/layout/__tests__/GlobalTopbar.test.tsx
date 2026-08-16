/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom'
import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import GlobalTopbar from '../GlobalTopbar'
import { createBrowserClient } from '@supabase/auth-helpers-nextjs'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() })
}))

// Mock supabase client
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createBrowserClient: jest.fn()
}))

describe('GlobalTopbar Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('does not render if session is null', async () => {
    (createBrowserClient as jest.Mock).mockReturnValue({
      auth: {
        getSession: jest.fn().mockResolvedValue({ data: { session: null } })
      }
    })

    const { container } = render(<GlobalTopbar />)
    
    await waitFor(() => {
      expect(container.firstChild).toBeNull()
    })
  })

  test('renders if valid session exists', async () => {
    (createBrowserClient as jest.Mock).mockReturnValue({
      auth: {
        getSession: jest.fn().mockResolvedValue({ 
          data: { session: { user: { email: 'owner@test.com' } } } 
        })
      }
    })

    render(<GlobalTopbar />)
    
    await waitFor(() => {
      expect(screen.getByText('owner@test.com')).toBeInTheDocument()
      expect(screen.getByText('My Account')).toBeInTheDocument()
      expect(screen.getByText('Sign Out')).toBeInTheDocument()
    })
  })
})
