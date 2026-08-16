/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom'
import React from 'react'
import { render, screen } from '@testing-library/react'
import Home from '../page'

jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({
    getAll: jest.fn().mockReturnValue([])
  })
}))

jest.mock('@supabase/auth-helpers-nextjs', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockSession: any = null
  return {
    createServerClient: jest.fn(() => ({
      auth: {
        getSession: jest.fn().mockImplementation(async () => ({ data: { session: mockSession } }))
      }
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    __setMockSession: (session: any) => {
      mockSession = session
    }
  }
})

jest.mock('next/navigation', () => ({
  useRouter: jest.fn().mockReturnValue({ push: jest.fn() })
}))

// Since Home is an async server component, we test it by awaiting the result
describe('Home Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('anonymous root options display login and signup', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { __setMockSession } = require('@supabase/auth-helpers-nextjs')
    __setMockSession(null)

    const ui = await Home()
    render(ui)
    
    expect(screen.getByText(/Business Login/i)).toBeInTheDocument()
    expect(screen.getByText(/Create Business Account/i)).toBeInTheDocument()
    expect(screen.queryByText(/Signed in as:/i)).not.toBeInTheDocument()
  })

  test('signed-in root options display account menu', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { __setMockSession } = require('@supabase/auth-helpers-nextjs')
    __setMockSession({ user: { email: 'owner@test.com' } })

    const ui = await Home()
    render(ui)
    
    expect(screen.getByText('Signed in as:')).toBeInTheDocument()
    expect(screen.getByText('owner@test.com')).toBeInTheDocument()
    expect(screen.queryByText('Business Login')).not.toBeInTheDocument()
  })
})
