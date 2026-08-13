import { POST } from '../route'
import { NextRequest } from 'next/server'
import { requireUser, buildAuthClient } from '@/lib/auth'
import { hashPin } from '@/lib/pinHash'
import { checkRateLimit } from '@/lib/rateLimit'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockDbChain: any = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  then: jest.fn()
}

jest.mock('@/lib/auth', () => ({
  adminClient: {
    from: jest.fn(() => mockDbChain)
  },
  requireUser: jest.fn(),
  buildAuthClient: jest.fn()
}))

jest.mock('@/lib/rateLimit', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ ok: true }),
  resetRateLimit: jest.fn().mockResolvedValue({ ok: true })
}))

const mockRequireUser = requireUser as jest.Mock
const mockBuildAuthClient = buildAuthClient as jest.Mock
const mockCheckRateLimit = checkRateLimit as jest.Mock

describe('Business Settings PIN Route', () => {
  const OWNER_ID = 'owner-123'
  const BIZ_ID = 'biz-123'

  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireUser.mockResolvedValue({ id: OWNER_ID, email: 'owner@test.com' })
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function makeRequest(body: any) {
    return new NextRequest('http://localhost/api/business/settings/pin', {
      method: 'POST',
      body: JSON.stringify(body)
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockDbBusiness = (business: any) => {
    // For select().eq().limit()
    mockDbChain.limit.mockReturnValue({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      then: (resolve: any) => resolve({ data: [{ ...business, approval_status: 'approved', plan_expires_at: null }], error: null })
    })
    // For update().eq()
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    mockDbChain.eq.mockImplementation((key: string, _value: string) => {
      if (key === 'id') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { then: (resolve: any) => resolve({ error: null }) }
      }
      return mockDbChain
    })
  }

  test('1. Reject missing action', async () => {
    const res = await POST(makeRequest({ new_pin: '1234', confirm_pin: '1234' }))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Invalid action' })
  })

  test('2. Reject non-matching new_pin and confirm_pin', async () => {
    const res = await POST(makeRequest({ action: 'set', new_pin: '1234', confirm_pin: '1235' }))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'New PIN and confirmation do not match' })
  })

  test('3. Reject malformed 4-digit PIN', async () => {
    const res = await POST(makeRequest({ action: 'set', new_pin: '123', confirm_pin: '123' }))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'PIN must be exactly 4 digits' })
  })

  test('4. Reject free plan access', async () => {
    mockDbBusiness({ id: BIZ_ID, plan: 'free', staff_pin_hash: null })
    const res = await POST(makeRequest({ action: 'set', new_pin: '1234', confirm_pin: '1234' }))
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'Staff PIN feature requires Pro plan' })
  })

  test('5. Set PIN succeeds for pro plan without existing hash', async () => {
    mockDbBusiness({ id: BIZ_ID, plan: 'pro', staff_pin_hash: null })
    const res = await POST(makeRequest({ action: 'set', new_pin: '1234', confirm_pin: '1234' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
    expect(mockDbChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ staff_pin_hash: expect.any(String) })
    )
  })

  test('6. Set PIN fails if hash already exists', async () => {
    mockDbBusiness({ id: BIZ_ID, plan: 'pro', staff_pin_hash: 'existing_hash' })
    const res = await POST(makeRequest({ action: 'set', new_pin: '1234', confirm_pin: '1234' }))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'PIN already exists' })
  })

  test('7. Change PIN fails without current PIN', async () => {
    mockDbBusiness({ id: BIZ_ID, plan: 'pro', staff_pin_hash: 'existing_hash' })
    const res = await POST(makeRequest({ action: 'change', new_pin: '1234', confirm_pin: '1234' }))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Current PIN required' })
  })

  test('8. Change PIN succeeds with valid current PIN', async () => {
    const validHash = await hashPin('1234')
    mockDbBusiness({ id: BIZ_ID, plan: 'pro', staff_pin_hash: validHash })
    const res = await POST(makeRequest({ action: 'change', current_pin: '1234', new_pin: '5678', confirm_pin: '5678' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
  })

  test('9. Change PIN fails with incorrect current PIN', async () => {
    const validHash = await hashPin('1234')
    mockDbBusiness({ id: BIZ_ID, plan: 'pro', staff_pin_hash: validHash })
    const res = await POST(makeRequest({ action: 'change', current_pin: '9999', new_pin: '5678', confirm_pin: '5678' }))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Incorrect current PIN' })
  })

  test('10. Change PIN is rate-limited on multiple attempts', async () => {
    const validHash = await hashPin('1234')
    mockDbBusiness({ id: BIZ_ID, plan: 'pro', staff_pin_hash: validHash })
    mockCheckRateLimit.mockResolvedValueOnce({ ok: false, retryAfter: 60 })
    
    const res = await POST(makeRequest({ action: 'change', current_pin: '9999', new_pin: '5678', confirm_pin: '5678' }))
    expect(res.status).toBe(429)
    expect(await res.json()).toEqual({ error: 'Too many attempts. Please try again later.' })
  })

  test('11. Reset PIN fails without account password', async () => {
    mockDbBusiness({ id: BIZ_ID, plan: 'pro', staff_pin_hash: 'existing_hash' })
    const res = await POST(makeRequest({ action: 'reset', new_pin: '1234', confirm_pin: '1234' }))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Account password required for reset' })
  })

  test('12. Reset PIN succeeds with correct account password', async () => {
    mockDbBusiness({ id: BIZ_ID, plan: 'pro', staff_pin_hash: 'existing_hash' })
    mockBuildAuthClient.mockResolvedValue({
      auth: { signInWithPassword: jest.fn().mockResolvedValue({ data: {}, error: null }) }
    })
    const res = await POST(makeRequest({ action: 'reset', account_password: 'correct_password', new_pin: '5678', confirm_pin: '5678' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
  })

  test('13. Reset PIN fails with wrong account password', async () => {
    mockDbBusiness({ id: BIZ_ID, plan: 'pro', staff_pin_hash: 'existing_hash' })
    mockBuildAuthClient.mockResolvedValue({
      auth: { signInWithPassword: jest.fn().mockResolvedValue({ data: null, error: { message: 'Invalid login' } }) }
    })
    const res = await POST(makeRequest({ action: 'reset', account_password: 'wrong_password', new_pin: '5678', confirm_pin: '5678' }))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Invalid account password' })
  })

  test('14. Cross-business modification impossible due to server-side limit(1) by owner_id', async () => {
    mockDbBusiness({ id: BIZ_ID, plan: 'pro', staff_pin_hash: null })
    // The request payload supplies a rogue business ID, but the endpoint ignores it.
    const res = await POST(makeRequest({ action: 'set', new_pin: '1234', confirm_pin: '1234', business_id: 'other-biz' }))
    expect(res.status).toBe(200)
    
    // Check that we queried using owner_id from session, not business_id from payload
    expect(mockDbChain.eq).toHaveBeenCalledWith('owner_id', OWNER_ID)
  })
})
