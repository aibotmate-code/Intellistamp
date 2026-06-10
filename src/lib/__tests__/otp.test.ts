import { generateOTP } from '../otp'

describe('generateOTP', () => {
  const originalEnv = process.env.NODE_ENV

  afterEach(() => {
    process.env.NODE_ENV = originalEnv
  })

  test('generateOTP returns exactly 4 characters', () => {
    process.env.NODE_ENV = 'test'
    expect(generateOTP()).toHaveLength(4)
  })

  test('generateOTP returns numeric string only', () => {
    process.env.NODE_ENV = 'test'
    expect(generateOTP()).toMatch(/^\d{4}$/)
  })

  test('generateOTP result is between 1000 and 9999', () => {
    process.env.NODE_ENV = 'test'
    for (let i = 0; i < 50; i++) {
      const otp = Number(generateOTP())
      expect(otp).toBeGreaterThanOrEqual(1000)
      expect(otp).toBeLessThanOrEqual(9999)
    }
  })

  test('generateOTP does not return 0000', () => {
    process.env.NODE_ENV = 'test'
    for (let i = 0; i < 100; i++) {
      expect(generateOTP()).not.toBe('0000')
    }
  })

  test('generateOTP produces different values on repeated calls (at least 90 unique out of 100)', () => {
    process.env.NODE_ENV = 'test'
    const results = new Set(Array.from({ length: 100 }, () => generateOTP()))
    expect(results.size).toBeGreaterThanOrEqual(90)
  })

  test('in development mode returns "1234"', () => {
    process.env.NODE_ENV = 'development'
    expect(generateOTP()).toBe('1234')
  })
})
