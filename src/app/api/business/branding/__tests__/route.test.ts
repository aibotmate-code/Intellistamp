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
// Auth helpers + cookies mock
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

// ---------------------------------------------------------------------------
// Import handlers
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { GET, POST, DELETE } = require('../route')

const OWNER_ID = 'user-owner-123'
const BIZ_ID = 'biz-456'

beforeAll(() => {
  process.env.TENANT_BRANDING_ENABLED = 'true'
  process.env.NEXT_PUBLIC_TENANT_BRANDING_ENABLED = 'true'
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service'
})

beforeEach(() => {
  mockQueue = []
  jest.clearAllMocks()
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/business/branding', () => {
  test('feature flag disabled → 403 error', async () => {
    process.env.TENANT_BRANDING_ENABLED = 'false'
    const req = new NextRequest(`http://localhost/api/business/branding?businessId=${BIZ_ID}`)
    const res = await GET(req)
    expect(res.status).toBe(403)
    process.env.TENANT_BRANDING_ENABLED = 'true'
  })

  test('missing params → 400 error', async () => {
    const req = new NextRequest('http://localhost/api/business/branding')
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  test('branding exists → 200 with branding data', async () => {
    mockQueue.push({
      data: {
        business_id: BIZ_ID,
        logo_path: 'path/to/logo.png',
        primary_color: '#FF0000',
        primary_dark_color: '#990000',
        primary_light_color: '#FF9999',
        is_enabled: true,
      },
      error: null,
    })

    const req = new NextRequest(`http://localhost/api/business/branding?businessId=${BIZ_ID}`)
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.branding.primary_color).toBe('#FF0000')
    expect(body.branding.logo_url).toContain('path/to/logo.png')
  })

  test('branding does not exist → returns 200 with branding: null', async () => {
    mockQueue.push({ data: null, error: null })
    const req = new NextRequest(`http://localhost/api/business/branding?businessId=${BIZ_ID}`)
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.branding).toBeNull()
  })

  test('branding exists with all fields → 200 with exact matching fields and generated logo_url', async () => {
    const savedRecord = {
      business_id: BIZ_ID,
      logo_path: 'uploads/demo-logo.png',
      primary_color: '#3A7874',
      primary_dark_color: '#2B5A57',
      primary_light_color: '#E1EAEA',
      secondary_color: '#99BFBD',
      accent_color: '#5D8F90',
      background_color: '#09090B',
      surface_color: '#18181B',
      text_on_primary: '#FFFFFF',
      is_enabled: true,
    }
    
    mockQueue.push({ data: savedRecord, error: null })

    const req = new NextRequest(`http://localhost/api/business/branding?businessId=${BIZ_ID}`)
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.branding).toBeDefined()
    expect(body.branding.business_id).toBe(BIZ_ID)
    expect(body.branding.logo_url).toContain('uploads/demo-logo.png')
    expect(body.branding.primary_color).toBe('#3A7874')
    expect(body.branding.primary_dark_color).toBe('#2B5A57')
    expect(body.branding.primary_light_color).toBe('#E1EAEA')
    expect(body.branding.secondary_color).toBe('#99BFBD')
    expect(body.branding.accent_color).toBe('#5D8F90')
    expect(body.branding.background_color).toBe('#09090B')
    expect(body.branding.surface_color).toBe('#18181B')
    expect(body.branding.text_on_primary).toBe('#FFFFFF')
    expect(body.branding.is_enabled).toBe(true)
  })
})

describe('POST /api/business/branding', () => {
  test('unauthenticated → 401 error', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null } })
    const req = new NextRequest('http://localhost/api/business/branding', { method: 'POST' })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  test('authenticated but not owner → 403 error', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: { user: { id: 'other-user' } } }, error: null })
    // Mock business lookup (returns owner_id: OWNER_ID)
    mockQueue.push({ data: { owner_id: OWNER_ID }, error: null })

    const fd = new FormData()
    fd.append('business_id', BIZ_ID)

    const req = new NextRequest('http://localhost/api/business/branding', {
      method: 'POST',
      body: fd,
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  test('invalid colors → 400 error', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: { user: { id: OWNER_ID } } }, error: null })
    // mock business owner check
    mockQueue.push({ data: { owner_id: OWNER_ID }, error: null })

    const fd = new FormData()
    fd.append('business_id', BIZ_ID)
    fd.append('primary_color', 'red') // invalid hex

    const req = new NextRequest('http://localhost/api/business/branding', {
      method: 'POST',
      body: fd,
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('Invalid color format')
  })

  test('valid payload, no logo upload → saves successfully', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: { user: { id: OWNER_ID } } }, error: null })
    // business owner check
    mockQueue.push({ data: { owner_id: OWNER_ID }, error: null })
    // existing branding check -> none
    mockQueue.push({ data: null, error: null })
    // insert save operation -> success
    mockQueue.push({ data: {}, error: null })

    const fd = new FormData()
    fd.append('business_id', BIZ_ID)
    fd.append('primary_color', '#FFFFFF')
    fd.append('primary_dark_color', '#000000')
    fd.append('primary_light_color', '#CCCCCC')
    fd.append('text_on_primary', '#000000')
    fd.append('is_enabled', 'true')

    const req = new NextRequest('http://localhost/api/business/branding', {
      method: 'POST',
      body: fd,
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.branding.primary_color).toBe('#FFFFFF')
  })
})

describe('DELETE /api/business/branding', () => {
  test('unauthenticated → 401 error', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null } })
    const req = new NextRequest(`http://localhost/api/business/branding?businessId=${BIZ_ID}&action=remove-logo`, {
      method: 'DELETE',
    })
    const res = await DELETE(req)
    expect(res.status).toBe(401)
  })

  test('action remove-logo → updates database and removes file', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: { user: { id: OWNER_ID } } }, error: null })
    // business owner check
    mockQueue.push({ data: { owner_id: OWNER_ID }, error: null })
    // fetch current branding
    mockQueue.push({ data: { logo_path: 'logo.png' }, error: null })
    // update logo path to null
    mockQueue.push({ data: {}, error: null })

    const req = new NextRequest(`http://localhost/api/business/branding?businessId=${BIZ_ID}&action=remove-logo`, {
      method: 'DELETE',
    })
    const res = await DELETE(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  test('action reset-branding → deletes database row and removes file', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: { user: { id: OWNER_ID } } }, error: null })
    // business owner check
    mockQueue.push({ data: { owner_id: OWNER_ID }, error: null })
    // fetch current branding
    mockQueue.push({ data: { logo_path: 'logo.png' }, error: null })
    // delete row
    mockQueue.push({ data: {}, error: null })

    const req = new NextRequest(`http://localhost/api/business/branding?businessId=${BIZ_ID}&action=reset-branding`, {
      method: 'DELETE',
    })
    const res = await DELETE(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })
})
