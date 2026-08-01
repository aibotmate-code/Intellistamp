import { generateServerToken, validateServerToken } from '@/lib/server/token'
import crypto from 'crypto'

describe('Patch 2 Security Tests - Signed Server QR', () => {
  const BIZ_ID = '550e8400-e29b-41d4-a716-446655440000'
  const ORIGINAL_ENV = process.env

  beforeEach(() => {
    jest.resetModules() // most important - it clears the cache
    process.env = { ...ORIGINAL_ENV } // make a copy
    process.env.QR_SECRET_KEY = 'test_secret_key_that_is_at_least_32_chars_long'
  })

  afterAll(() => {
    process.env = ORIGINAL_ENV // restore old env
  })

  test('1. Valid token generated and verified within same window', () => {
    const token = generateServerToken(BIZ_ID)
    expect(validateServerToken(BIZ_ID, token)).toBe(true)
  })

  test('2. Token from wrong business fails', () => {
    const token = generateServerToken(BIZ_ID)
    const OTHER_BIZ = '550e8400-e29b-41d4-a716-446655440001'
    expect(validateServerToken(OTHER_BIZ, token)).toBe(false)
  })

  test('3. Token with forged signature fails', () => {
    const token = generateServerToken(BIZ_ID)
    const [payload, sig] = token.split('.')
    // Flip last character of signature
    const forgedSig = sig.slice(0, -1) + (sig.endsWith('0') ? '1' : '0')
    const forgedToken = `${payload}.${forgedSig}`
    expect(validateServerToken(BIZ_ID, forgedToken)).toBe(false)
  })

  test('4. Token with forged payload fails', () => {
    const token = generateServerToken(BIZ_ID)
    const [payload, sig] = token.split('.')
    // Decode payload, modify it, re-encode
    const decoded = Buffer.from(payload, 'base64url').toString('utf-8')
    const modifiedDecoded = decoded.replace(BIZ_ID, '550e8400-e29b-41d4-a716-446655440001')
    const forgedPayload = Buffer.from(modifiedDecoded).toString('base64url')
    
    const forgedToken = `${forgedPayload}.${sig}`
    expect(validateServerToken(BIZ_ID, forgedToken)).toBe(false)
  })

  test('5. Missing QR_SECRET_KEY fails safely without crashing', () => {
    delete process.env.QR_SECRET_KEY
    
    // Generating should throw so it doesn't accidentally deploy broken tokens
    expect(() => generateServerToken(BIZ_ID)).toThrow('QR_SECRET_KEY is not configured')
    
    // Validation should just safely return false
    expect(validateServerToken(BIZ_ID, 'some.token')).toBe(false)
  })

  describe('Time Windows', () => {
    let nowSpy: jest.SpyInstance

    beforeEach(() => {
      nowSpy = jest.spyOn(Date, 'now')
    })

    afterEach(() => {
      nowSpy.mockRestore()
    })

    test('6. Token from previous window succeeds (transit delay)', () => {
      const BASE_TIME = 1000000000000
      nowSpy.mockReturnValue(BASE_TIME)
      
      const token = generateServerToken(BIZ_ID)
      
      // Move time forward by 30 seconds (1 window)
      nowSpy.mockReturnValue(BASE_TIME + 30000)
      
      expect(validateServerToken(BIZ_ID, token)).toBe(true)
    })

    test('7. Token from old window fails (expiry)', () => {
      const BASE_TIME = 1000000000000
      nowSpy.mockReturnValue(BASE_TIME)
      
      const token = generateServerToken(BIZ_ID)
      
      // Move time forward by 61 seconds (2 windows)
      nowSpy.mockReturnValue(BASE_TIME + 61000)
      
      expect(validateServerToken(BIZ_ID, token)).toBe(false)
    })

    test('8. Token from future window fails (manipulation)', () => {
      const BASE_TIME = 1000000000000
      nowSpy.mockReturnValue(BASE_TIME)
      
      // Create a future token payload manually
      const futureTimestamp = Math.floor(BASE_TIME / 30000) + 1
      const payload = `${BIZ_ID}:${futureTimestamp}:nonce`
      const hmac = crypto.createHmac('sha256', process.env.QR_SECRET_KEY!)
      hmac.update(payload)
      const sig = hmac.digest('hex').slice(0, 16)
      const data = Buffer.from(payload).toString('base64url')
      const token = `${data}.${sig}`
      
      // Attempt to validate it NOW
      expect(validateServerToken(BIZ_ID, token)).toBe(false)
    })
  })
})
