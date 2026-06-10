import { generateToken, validateToken, getSecondsUntilRotation } from '../token'

const BIZ_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const BIZ_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

describe('generateToken', () => {
  test('returns exactly 6 characters', () => {
    expect(generateToken(BIZ_A)).toHaveLength(6)
  })

  test('returns different values for different bizIds', () => {
    const a = generateToken(BIZ_A)
    const b = generateToken(BIZ_B)
    expect(a).not.toBe(b)
  })

  test('returns same value within same 30s window', () => {
    // Call twice in the same test — same window
    const t1 = generateToken(BIZ_A)
    const t2 = generateToken(BIZ_A)
    expect(t1).toBe(t2)
  })

  test('returns different value after 30s window (offset simulation)', () => {
    const current = generateToken(BIZ_A, 0)
    const nextWindow = generateToken(BIZ_A, 1)
    expect(current).not.toBe(nextWindow)
  })

  test('always returns uppercase alphanumeric', () => {
    for (let i = 0; i < 20; i++) {
      const token = generateToken(`${BIZ_A.slice(0, -4)}${String(i).padStart(4, '0')}`)
      expect(token).toMatch(/^[A-Z0-9]{6}$/)
    }
  })
})

describe('validateToken', () => {
  test('returns true for current window token', () => {
    const token = generateToken(BIZ_A, 0)
    expect(validateToken(BIZ_A, token)).toBe(true)
  })

  test('returns true for previous window token', () => {
    const token = generateToken(BIZ_A, -1)
    expect(validateToken(BIZ_A, token)).toBe(true)
  })

  test('returns false for random string', () => {
    expect(validateToken(BIZ_A, 'ZZZZZZ')).toBe(false)
  })

  test('returns false for token from 2 windows ago', () => {
    const old = generateToken(BIZ_A, -2)
    expect(validateToken(BIZ_A, old)).toBe(false)
  })
})

describe('getSecondsUntilRotation', () => {
  test('returns value between 1 and 30', () => {
    const secs = getSecondsUntilRotation()
    expect(secs).toBeGreaterThanOrEqual(1)
    expect(secs).toBeLessThanOrEqual(30)
  })
})
