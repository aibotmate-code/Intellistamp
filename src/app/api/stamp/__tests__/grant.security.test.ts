import { generateAccessGrant, validateAccessGrant } from '@/lib/server/grant'
import crypto from 'crypto'

describe('Access Grant Security', () => {
  const CUSTOMER_ID = '11111111-1111-1111-1111-111111111111'
  const BIZ_ID = '22222222-2222-2222-2222-222222222222'
  const ORIGINAL_ENV = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...ORIGINAL_ENV }
    process.env.ACCESS_GRANT_SECRET = 'test_access_grant_secret_key_32_chars'
  })

  afterAll(() => {
    process.env = ORIGINAL_ENV
  })

  test('1. Valid access grant is generated and verified', () => {
    const token = generateAccessGrant(CUSTOMER_ID, BIZ_ID)
    expect(validateAccessGrant(token, BIZ_ID)).toBe(CUSTOMER_ID)
  })

  test('2. Missing ACCESS_GRANT_SECRET fails safely', () => {
    delete process.env.ACCESS_GRANT_SECRET
    expect(() => generateAccessGrant(CUSTOMER_ID, BIZ_ID)).toThrow('ACCESS_GRANT_SECRET is not configured')
    expect(validateAccessGrant('some.token', BIZ_ID)).toBeNull()
  })

  test('3. Cross-business use rejected', () => {
    const token = generateAccessGrant(CUSTOMER_ID, BIZ_ID)
    const OTHER_BIZ = '33333333-3333-3333-3333-333333333333'
    expect(validateAccessGrant(token, OTHER_BIZ)).toBeNull()
  })

  test('4. Forged signature rejected', () => {
    const token = generateAccessGrant(CUSTOMER_ID, BIZ_ID)
    const [payload, sig] = token.split('.')
    const forgedSig = sig.slice(0, -1) + (sig.endsWith('0') ? '1' : '0')
    const forgedToken = `${payload}.${forgedSig}`
    expect(validateAccessGrant(forgedToken, BIZ_ID)).toBeNull()
  })

  test('5. Wrong purpose or scope rejected', () => {
    const issuedAt = Date.now()
    const expiresAt = issuedAt + 300000
    const nonce = 'nonce'
    // Wrong scope: edit_profile instead of view_card
    const payload = `1:access:edit_profile:${CUSTOMER_ID}:${BIZ_ID}:${issuedAt}:${expiresAt}:${nonce}`
    const hmac = crypto.createHmac('sha256', process.env.ACCESS_GRANT_SECRET!)
    hmac.update(payload)
    const sig = hmac.digest('hex').slice(0, 32)
    const data = Buffer.from(payload).toString('base64url')
    const forgedToken = `${data}.${sig}`
    
    expect(validateAccessGrant(forgedToken, BIZ_ID)).toBeNull()
  })

  describe('Time Windows', () => {
    let nowSpy: jest.SpyInstance

    beforeEach(() => {
      nowSpy = jest.spyOn(Date, 'now')
    })

    afterEach(() => {
      nowSpy.mockRestore()
    })

    test('6. Expired grant rejected', () => {
      const BASE_TIME = 1000000000000
      nowSpy.mockReturnValue(BASE_TIME)
      
      const token = generateAccessGrant(CUSTOMER_ID, BIZ_ID)
      
      // Move time forward 5 minutes + 1 ms
      nowSpy.mockReturnValue(BASE_TIME + 300001)
      
      expect(validateAccessGrant(token, BIZ_ID)).toBeNull()
    })

    test('7. Grant with lifetime > 5 minutes rejected', () => {
      const BASE_TIME = 1000000000000
      nowSpy.mockReturnValue(BASE_TIME)
      
      const issuedAt = BASE_TIME
      const expiresAt = issuedAt + 600000 // 10 minutes (too long)
      const nonce = 'nonce'
      const payload = `1:access:view_card:${CUSTOMER_ID}:${BIZ_ID}:${issuedAt}:${expiresAt}:${nonce}`
      const hmac = crypto.createHmac('sha256', process.env.ACCESS_GRANT_SECRET!)
      hmac.update(payload)
      const sig = hmac.digest('hex').slice(0, 32)
      const data = Buffer.from(payload).toString('base64url')
      const token = `${data}.${sig}`
      
      expect(validateAccessGrant(token, BIZ_ID)).toBeNull()
    })

    test('8. Future-issued grant rejected beyond clock skew', () => {
      const BASE_TIME = 1000000000000
      nowSpy.mockReturnValue(BASE_TIME)
      
      const issuedAt = BASE_TIME + 10000 // 10 seconds in future (max skew is 5s)
      const expiresAt = issuedAt + 300000
      const nonce = 'nonce'
      const payload = `1:access:view_card:${CUSTOMER_ID}:${BIZ_ID}:${issuedAt}:${expiresAt}:${nonce}`
      const hmac = crypto.createHmac('sha256', process.env.ACCESS_GRANT_SECRET!)
      hmac.update(payload)
      const sig = hmac.digest('hex').slice(0, 32)
      const data = Buffer.from(payload).toString('base64url')
      const token = `${data}.${sig}`
      
      expect(validateAccessGrant(token, BIZ_ID)).toBeNull()
    })
  })
})
