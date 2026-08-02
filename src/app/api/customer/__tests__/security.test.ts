import { NextRequest } from 'next/server'
import { POST as identifyHandler } from '../identify/route'
import { POST as recoverHandler } from '../recover/route'

jest.mock('@supabase/supabase-js', () => {
  const mockInsert = jest.fn()
  const mockSelect = jest.fn()
  const mockEq = jest.fn()
  const mockSingle = jest.fn()
  const mockMaybeSingle = jest.fn()
  const mockUpsert = jest.fn()

  const mockSupabase = {
    from: jest.fn(() => ({
      select: mockSelect,
      insert: mockInsert,
      upsert: mockUpsert,
    })),
  }

  mockSelect.mockReturnValue({ eq: mockEq, single: mockSingle, maybeSingle: mockMaybeSingle })
  mockEq.mockReturnValue({ eq: mockEq, single: mockSingle, maybeSingle: mockMaybeSingle })
  mockInsert.mockReturnValue({ select: mockSelect })
  mockUpsert.mockReturnValue({ select: mockSelect })

  return {
    createClient: () => mockSupabase,
    __mocks: { mockInsert, mockSelect, mockEq, mockSingle, mockMaybeSingle, mockUpsert }
  }
})

jest.mock('@/lib/server/token', () => ({
  validateServerToken: jest.fn((bizId, token) => token === 'valid_token')
}))

jest.mock('@/lib/rateLimit', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ ok: true }),
  peekRateLimit: jest.fn().mockResolvedValue({ ok: true }),
  resetRateLimit: jest.fn().mockResolvedValue({ ok: true }),
  rateLimitResponse: jest.fn(),
  rateLimitErrorResponse: jest.fn(),
  getClientIp: jest.fn().mockReturnValue('127.0.0.1'),
  generateHmacIdentity: jest.fn((prefix, val) => 'mock_hash')
}))

// @ts-expect-error Mocked module injection
import { __mocks as smocks } from '@supabase/supabase-js'

describe('Patch 1 Security Tests - Customer Token Exposure', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('/api/customer/recover', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const makeReq = (body: any) => new NextRequest('http://localhost/api/customer/recover', {
      method: 'POST',
      body: JSON.stringify(body)
    })

    const safeResponse = {
      success: true,
      message: 'This card cannot be recovered automatically. Please ask the business staff to restore access.'
    }

    test('1. known phone cannot retrieve existing token', async () => {
      smocks.mockMaybeSingle.mockResolvedValueOnce({ data: { id: 'c1' } }) // customer found
      smocks.mockMaybeSingle.mockResolvedValueOnce({ data: { id: 'bc1' } }) // link found
      
      const req = makeReq({ business_id: '550e8400-e29b-41d4-a716-446655440000', phone: '9000000000' })
      const res = await recoverHandler(req)
      const data = await res.json()
      if (res.status !== 200) console.error(data)

      expect(res.status).toBe(200)
      expect(data).toEqual(safeResponse)
      expect(data.customer_token).toBeUndefined()
      expect(data.customer).toBeUndefined()
    })

    test('2. unknown phone receives indistinguishable safe response', async () => {
      smocks.mockMaybeSingle.mockResolvedValueOnce({ data: null }) // customer NOT found
      
      const req = makeReq({ business_id: '550e8400-e29b-41d4-a716-446655440000', phone: '9000000001' })
      const res = await recoverHandler(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data).toEqual(safeResponse) // Exact same response!
    })

    test('3. existing and unknown responses do not expose existence', async () => {
      smocks.mockMaybeSingle.mockResolvedValueOnce({ data: { id: 'c1' } })
      smocks.mockMaybeSingle.mockResolvedValueOnce({ data: { id: 'bc1' } })
      const resExisting = await recoverHandler(makeReq({ business_id: '550e8400-e29b-41d4-a716-446655440000', phone: '9000000000' }))
      
      smocks.mockMaybeSingle.mockResolvedValueOnce({ data: null })
      const resUnknown = await recoverHandler(makeReq({ business_id: '550e8400-e29b-41d4-a716-446655440000', phone: '9000000001' }))
      
      expect(await resExisting.json()).toEqual(await resUnknown.json())
    })

    test('6. cross-business recovery fails safely', async () => {
      smocks.mockMaybeSingle.mockResolvedValueOnce({ data: { id: 'c1' } }) // customer found
      smocks.mockMaybeSingle.mockResolvedValueOnce({ data: null }) // link NOT found (wrong business)
      
      const req = makeReq({ business_id: '550e8400-e29b-41d4-a716-446655440001', phone: '9000000000' })
      const res = await recoverHandler(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data).toEqual(safeResponse)
    })
  })

  describe('/api/customer/identify', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const makeReq = (body: any) => new NextRequest('http://localhost/api/customer/identify', {
      method: 'POST',
      body: JSON.stringify(body)
    })

    test('4. arbitrary unauthenticated new registration cannot create a token without valid business proof', async () => {
      smocks.mockMaybeSingle.mockResolvedValueOnce({ data: null }) // new customer
      
      // Request WITHOUT qr_token
      const req = makeReq({ business_id: '550e8400-e29b-41d4-a716-446655440000', phone: '9000000000', name: 'Test' })
      const res = await identifyHandler(req)
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data.error).toContain('Invalid or expired QR code')
      expect(smocks.mockInsert).not.toHaveBeenCalled()
    })

    test('5. valid authorized registration can create a new customer safely', async () => {
      smocks.mockMaybeSingle.mockResolvedValueOnce({ data: null }) // new customer
      smocks.mockSingle.mockResolvedValueOnce({ data: { id: 'c1', customer_token: 'tok_123', name: 'Test' } }) // created
      
      // Request WITH qr_token
      const req = makeReq({ business_id: '550e8400-e29b-41d4-a716-446655440000', phone: '9000000000', name: 'Test', qr_token: 'valid_token' })
      const res = await identifyHandler(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.isNew).toBe(true)
      expect(data.customer.customer_token).toBe('tok_123')
      expect(smocks.mockInsert).toHaveBeenCalledWith({ phone: '9000000000', name: 'Test' })
      expect(smocks.mockUpsert).toHaveBeenCalledWith({ business_id: '550e8400-e29b-41d4-a716-446655440000', customer_id: 'c1' })
    })

    test('7. returning customer with valid QR gets readyToStamp:true, no bearer token exposed', async () => {
      smocks.mockMaybeSingle.mockResolvedValueOnce({ data: { id: 'c1', customer_token: 'tok_123', name: 'Priya' } }) // existing customer
      
      // Request WITH valid qr_token and existing customer
      const req = makeReq({ business_id: '550e8400-e29b-41d4-a716-446655440000', phone: '9000000000', qr_token: 'valid_token' })
      const res = await identifyHandler(req)
      const data = await res.json()
      if (res.status !== 200) console.error(data)

      expect(res.status).toBe(200)
      expect(data.isNew).toBe(false)
      // Customer can proceed to stamping without staff involvement
      expect(data.readyToStamp).toBe(true)
      expect(data.customer_id).toBe('c1')      // needed for stamp call
      expect(data.name).toBe('Priya')           // for display
      // CRITICAL: bearer token must NEVER be returned
      expect(data.customer_token).toBeUndefined()
      expect(data.customer).toBeUndefined()
    })

    test('8. returning customer WITHOUT valid QR gets recovery wall (not readyToStamp)', async () => {
      smocks.mockMaybeSingle.mockResolvedValueOnce({ data: { id: 'c1', customer_token: 'tok_123' } }) // existing customer
      
      // Request WITHOUT qr_token (or expired token)
      const req = makeReq({ business_id: '550e8400-e29b-41d4-a716-446655440000', phone: '9000000000' })
      const res = await identifyHandler(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.isNew).toBe(false)
      expect(data.readyToStamp).toBe(false)
      expect(data.customer_token).toBeUndefined()
      expect(data.message).toContain('ask the business staff')
    })

    test('8b. cross-business existing customer scanning valid QR is associated and gets readyToStamp:true', async () => {
      smocks.mockMaybeSingle.mockResolvedValueOnce({ data: { id: 'c1', name: 'Ravi' } }) // existing customer
      
      const req = makeReq({ business_id: '550e8400-e29b-41d4-a716-446655440000', phone: '9000000000', name: 'Test', qr_token: 'valid_token' })
      const res = await identifyHandler(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.isNew).toBe(false)
      expect(data.readyToStamp).toBe(true)
      expect(data.customer_token).toBeUndefined()
      // Business association was upserted
      expect(smocks.mockUpsert).toHaveBeenCalledWith(
        { business_id: '550e8400-e29b-41d4-a716-446655440000', customer_id: 'c1' },
        { onConflict: 'business_id,customer_id', ignoreDuplicates: true }
      )
    })

    test('9. Indian phone numbers normalize consistently', async () => {
      smocks.mockMaybeSingle.mockResolvedValue({ data: null }) // new customer
      smocks.mockSingle.mockResolvedValue({ data: { id: 'c1', customer_token: 'tok_123', name: 'Test' } }) // created
      
      const req = makeReq({ business_id: '550e8400-e29b-41d4-a716-446655440000', phone: '+919000000000', name: 'Test', qr_token: 'valid_token' })
      await identifyHandler(req)
      
      expect(smocks.mockInsert).toHaveBeenCalledWith({ phone: '9000000000', name: 'Test' })
    })
  })
})
