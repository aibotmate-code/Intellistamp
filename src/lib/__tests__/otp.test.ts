import { generateOTP } from '../otp'

// process.env is typed readonly in strict TS; cast to mutate in tests
const testEnv = process.env as Record<string, string>

describe('generateOTP', () => {
  const originalEnv = process.env.NODE_ENV

  afterEach(() => {
    testEnv.NODE_ENV = originalEnv
  })

  test('generateOTP returns exactly 4 characters', () => {
    expect(generateOTP()).toHaveLength(4)
  })

  test('generateOTP returns numeric string only', () => {
    expect(generateOTP()).toMatch(/^\d{4}$/)
  })

  test('generateOTP result is between 1000 and 9999', () => {
    for (let i = 0; i < 50; i++) {
      const otp = Number(generateOTP())
      expect(otp).toBeGreaterThanOrEqual(1000)
      expect(otp).toBeLessThanOrEqual(9999)
    }
  })

  test('generateOTP does not return 0000', () => {
    for (let i = 0; i < 100; i++) {
      expect(generateOTP()).not.toBe('0000')
    }
  })

  test('generateOTP produces different values on repeated calls (at least 90 unique out of 100)', () => {
    const results = new Set(Array.from({ length: 100 }, () => generateOTP()))
    expect(results.size).toBeGreaterThanOrEqual(90)
  })

  test('in development mode returns "1234"', () => {
    testEnv.NODE_ENV = 'development'
    expect(generateOTP()).toBe('1234')
  })
})
