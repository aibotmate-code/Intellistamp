import { NextRequest } from 'next/server'
import { GET, PUT } from '../route'
import { requireUser, adminClient } from '@/lib/auth'

jest.mock('@/lib/auth', () => ({
  requireUser: jest.fn(),
  adminClient: {
    from: jest.fn()
  }
}))

const mockRequireUser = requireUser as jest.Mock
const mockAdminClientFrom = adminClient.from as jest.Mock

describe('Social Links Settings API', () => {
  let mockSelect: jest.Mock
  let mockEq: jest.Mock
  let mockLimit: jest.Mock
  let mockMaybeSingle: jest.Mock
  let mockUpsert: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()

    mockMaybeSingle = jest.fn()
    mockLimit = jest.fn().mockReturnValue({ maybeSingle: mockMaybeSingle })
    
    // For the business lookup
    const mockBizEq = jest.fn().mockReturnValue({ limit: mockLimit })
    const mockBizSelect = jest.fn().mockReturnValue({ eq: mockBizEq })

    // For the social links lookup
    mockEq = jest.fn().mockReturnValue({ maybeSingle: mockMaybeSingle })
    mockSelect = jest.fn().mockReturnValue({ eq: mockEq })
    
    mockUpsert = jest.fn()

    mockAdminClientFrom.mockImplementation((table: string) => {
      if (table === 'businesses') {
        return { select: mockBizSelect }
      }
      return { select: mockSelect, upsert: mockUpsert }
    })

    // Mock business lookup to return biz-1
    mockLimit.mockResolvedValue({ data: [{ id: 'biz-1' }], error: null })

    mockRequireUser.mockResolvedValue({ id: 'user-1' })
  })

  describe('GET', () => {
    it('returns empty object if no links found', async () => {
      mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null })
      const req = new NextRequest('http://localhost/api')
      const res = await GET()
      const data = await res.json()
      
      expect(res.status).toBe(200)
      expect(data.social_links).toEqual({})
    })

    it('returns social links when present', async () => {
      const mockLinks = { instagram_url: 'https://instagram.com/test' }
      mockMaybeSingle.mockResolvedValueOnce({ data: mockLinks, error: null })
      const req = new NextRequest('http://localhost/api')
      const res = await GET()
      const data = await res.json()
      
      expect(data.social_links).toEqual(mockLinks)
    })
  })

  describe('PUT validation', () => {
    const makeReq = (body: Record<string, unknown>) => new NextRequest('http://localhost/api', {
      method: 'PUT',
      body: JSON.stringify(body)
    })

    it('rejects cross-business modification (tenant isolation)', async () => {
      // The API uses the business object returned from requireUser, which derives from auth token.
      // Even if a user tried to send business_id in the body, it ignores it.
      mockUpsert.mockResolvedValueOnce({ error: null })
      
      const req = makeReq({ google_review_url: 'https://g.page/r/123', business_id: 'malicious-id' })
      await PUT(req)
      
      // It must use biz-1, not malicious-id
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ business_id: 'biz-1', google_review_url: 'https://g.page/r/123' }),
        { onConflict: 'business_id' }
      )
    })

    it('rejects javascript: URLs safely, mapping to null', async () => {
      mockUpsert.mockResolvedValueOnce({ error: null })
      const req = makeReq({ instagram_url: 'javascript:alert(1)' })
      const res = await PUT(req)
      const data = await res.json()
      
      expect(data.social_links.instagram_url).toBeNull()
    })

    it('rejects http:// URLs', async () => {
      mockUpsert.mockResolvedValueOnce({ error: null })
      const req = makeReq({ instagram_url: 'http://instagram.com/test' })
      const res = await PUT(req)
      const data = await res.json()
      
      expect(data.social_links.instagram_url).toBeNull()
    })

    it('rejects hostname suffix attacks', async () => {
      mockUpsert.mockResolvedValueOnce({ error: null })
      const req = makeReq({ instagram_url: 'https://instagram.com.attacker.example/test' })
      const res = await PUT(req)
      const data = await res.json()
      
      expect(data.social_links.instagram_url).toBeNull()
    })

    it('rejects URL credentials', async () => {
      mockUpsert.mockResolvedValueOnce({ error: null })
      const req = makeReq({ instagram_url: 'https://user:pass@instagram.com/test' })
      const res = await PUT(req)
      const data = await res.json()
      
      expect(data.social_links.instagram_url).toBeNull()
    })

    it('normalizes WhatsApp number by extracting digits', async () => {
      mockUpsert.mockResolvedValueOnce({ error: null })
      const req = makeReq({ whatsapp_number: '+91 98765-43210' })
      const res = await PUT(req)
      const data = await res.json()
      
      expect(data.social_links.whatsapp_number).toBe('919876543210')
    })
    
    it('rejects invalid short WhatsApp number', async () => {
      mockUpsert.mockResolvedValueOnce({ error: null })
      const req = makeReq({ whatsapp_number: '123' })
      const res = await PUT(req)
      const data = await res.json()
      
      expect(data.social_links.whatsapp_number).toBeNull()
    })
    
    it('saves valid Google Review URL', async () => {
      mockUpsert.mockResolvedValueOnce({ error: null })
      const req = makeReq({ google_review_url: 'https://g.page/r/XYZ/review' })
      const res = await PUT(req)
      const data = await res.json()
      
      expect(data.social_links.google_review_url).toBe('https://g.page/r/XYZ/review')
    })
  })
})
