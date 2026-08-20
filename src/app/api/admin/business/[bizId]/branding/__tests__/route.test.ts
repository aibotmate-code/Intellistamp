/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// Supabase mock
// ---------------------------------------------------------------------------

let mockQueue: any[] = []

function dequeue() {
  return mockQueue.shift() ?? { data: null, error: null }
}

const mockStorageFrom = jest.fn(() => ({
  getPublicUrl: jest.fn((path) => ({ data: { publicUrl: `http://localhost/storage/${path}` } })),
  upload: jest.fn(() => Promise.resolve({ error: null })),
  remove: jest.fn(() => Promise.resolve({ error: null })),
}))

const mockChain: any = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(() => Promise.resolve(dequeue())),
  maybeSingle: jest.fn(() => Promise.resolve(dequeue())),
  storage: {
    from: mockStorageFrom,
  },
  then(resolve: any, reject: any) {
    return Promise.resolve(dequeue()).then(resolve, reject)
  },
}

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockChain),
}))

// ---------------------------------------------------------------------------
// Auth helpers mock
// ---------------------------------------------------------------------------

const mockGetSession = jest.fn()

jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createServerClient: jest.fn(() => ({
    auth: { getSession: mockGetSession },
  })),
}))

jest.mock('next/headers', () => ({
  cookies: jest.fn(async () => ({ getAll: () => [] })),
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { GET, POST, DELETE } = require('../route')

const ADMIN_EMAIL = 'admin@intellicallabs.com'
const NON_ADMIN_EMAIL = 'merchant@example.com'
const BIZ_ID = '550e8400-e29b-41d4-a716-446655440000'

beforeAll(() => {
  process.env.INTELLICAL_ADMIN_EMAILS = ADMIN_EMAIL
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service'
})

beforeEach(() => {
  mockQueue = []
  jest.clearAllMocks()
})

describe('Admin Co-Branding API: /api/admin/business/[bizId]/branding', () => {
  describe('GET', () => {
    test('unauthenticated user → 401 error', async () => {
      mockGetSession.mockResolvedValueOnce({ data: { session: null } })
      const req = new NextRequest(`http://localhost/api/admin/business/${BIZ_ID}/branding`)
      const res = await GET(req, { params: Promise.resolve({ bizId: BIZ_ID }) })
      expect(res.status).toBe(401)
    })

    test('non-admin user → 403 error', async () => {
      mockGetSession.mockResolvedValueOnce({
        data: { session: { user: { id: 'user-1', email: NON_ADMIN_EMAIL } } },
      })
      const req = new NextRequest(`http://localhost/api/admin/business/${BIZ_ID}/branding`)
      const res = await GET(req, { params: Promise.resolve({ bizId: BIZ_ID }) })
      expect(res.status).toBe(403)
      const data = await res.json()
      expect(data.error).toContain('Admin access required')
    })

    test('admin user → 200 with branding data', async () => {
      mockGetSession.mockResolvedValueOnce({
        data: { session: { user: { id: 'admin-1', email: ADMIN_EMAIL } } },
      })
      mockQueue.push({
        data: {
          business_id: BIZ_ID,
          logo_path: 'logos/cafe.png',
          primary_color: '#3A7874',
          primary_dark_color: '#2B5A57',
          primary_light_color: '#E1EAEA',
          surface_color: '#18181B',
          text_on_primary: '#FFFFFF',
          is_enabled: true,
          card_text_color: '#F5F5F5',
          card_muted_text_color: '#A1A1AA',
          empty_stamp_color: '#27272A',
          empty_stamp_border_color: '#3F3F46',
        },
        error: null,
      })

      const req = new NextRequest(`http://localhost/api/admin/business/${BIZ_ID}/branding`)
      const res = await GET(req, { params: Promise.resolve({ bizId: BIZ_ID }) })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.branding.primary_color).toBe('#3A7874')
      expect(data.branding.logo_url).toContain('logos/cafe.png')
    })
  })

  describe('POST', () => {
    test('non-admin merchant cannot mutate branding → 403 error', async () => {
      mockGetSession.mockResolvedValueOnce({
        data: { session: { user: { id: 'user-1', email: NON_ADMIN_EMAIL } } },
      })
      const fd = new FormData()
      fd.append('primary_color', '#FF0000')

      const req = new NextRequest(`http://localhost/api/admin/business/${BIZ_ID}/branding`, {
        method: 'POST',
        body: fd,
      })
      const res = await POST(req, { params: Promise.resolve({ bizId: BIZ_ID }) })
      expect(res.status).toBe(403)
    })

    test('admin with invalid hex color → 400 error', async () => {
      mockGetSession.mockResolvedValueOnce({
        data: { session: { user: { id: 'admin-1', email: ADMIN_EMAIL } } },
      })
      // Business exists
      mockQueue.push({ data: { id: BIZ_ID }, error: null })

      const fd = new FormData()
      fd.append('primary_color', 'not-a-color')

      const req = new NextRequest(`http://localhost/api/admin/business/${BIZ_ID}/branding`, {
        method: 'POST',
        body: fd,
      })
      const res = await POST(req, { params: Promise.resolve({ bizId: BIZ_ID }) })
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toContain('Invalid color format')
    })

    test('admin saves valid branding → 200 and tenant scoped', async () => {
      mockGetSession.mockResolvedValueOnce({
        data: { session: { user: { id: 'admin-1', email: ADMIN_EMAIL } } },
      })
      // 1. Check business exists
      mockQueue.push({ data: { id: BIZ_ID }, error: null })
      // 2. Check existing branding
      mockQueue.push({ data: null, error: null })
      // 3. Insert branding
      mockQueue.push({ data: {}, error: null })

      const fd = new FormData()
      fd.append('is_enabled', 'true')
      fd.append('primary_color', '#10B981')
      fd.append('primary_dark_color', '#059669')
      fd.append('primary_light_color', '#D1FAE5')
      fd.append('text_on_primary', '#FFFFFF')
      fd.append('surface_color', '#111827')
      fd.append('card_text_color', '#F9FAFB')
      fd.append('empty_stamp_color', '#1F2937')
      fd.append('empty_stamp_border_color', '#374151')

      const req = new NextRequest(`http://localhost/api/admin/business/${BIZ_ID}/branding`, {
        method: 'POST',
        body: fd,
      })
      const res = await POST(req, { params: Promise.resolve({ bizId: BIZ_ID }) })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.branding.business_id).toBe(BIZ_ID)
      expect(data.branding.primary_color).toBe('#10B981')
    })
  })

  describe('DELETE', () => {
    test('non-admin → 403 error', async () => {
      mockGetSession.mockResolvedValueOnce({
        data: { session: { user: { id: 'user-1', email: NON_ADMIN_EMAIL } } },
      })
      const req = new NextRequest(`http://localhost/api/admin/business/${BIZ_ID}/branding?action=reset-branding`, {
        method: 'DELETE',
      })
      const res = await DELETE(req, { params: Promise.resolve({ bizId: BIZ_ID }) })
      expect(res.status).toBe(403)
    })

    test('admin reset-branding → deletes row and resets', async () => {
      mockGetSession.mockResolvedValueOnce({
        data: { session: { user: { id: 'admin-1', email: ADMIN_EMAIL } } },
      })
      // 1. Fetch current branding
      mockQueue.push({ data: { logo_path: 'logos/demo.png' }, error: null })
      // 2. Delete row
      mockQueue.push({ data: {}, error: null })

      const req = new NextRequest(`http://localhost/api/admin/business/${BIZ_ID}/branding?action=reset-branding`, {
        method: 'DELETE',
      })
      const res = await DELETE(req, { params: Promise.resolve({ bizId: BIZ_ID }) })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.message).toContain('reset')
    })
  })
})
