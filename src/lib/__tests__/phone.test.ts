import { normalizeIndianPhone, isValidIndianPhone } from '../phone'

describe('normalizeIndianPhone', () => {
  test('bare 10-digit number passes through', () => {
    expect(normalizeIndianPhone('9876543210')).toBe('9876543210')
  })

  test('+91 prefix is stripped', () => {
    expect(normalizeIndianPhone('+919876543210')).toBe('9876543210')
  })

  test('91 prefix (no plus) is stripped', () => {
    expect(normalizeIndianPhone('919876543210')).toBe('9876543210')
  })

  test('091 prefix is stripped', () => {
    expect(normalizeIndianPhone('0919876543210')).toBe('9876543210')
  })

  test('0091 prefix is stripped', () => {
    expect(normalizeIndianPhone('00919876543210')).toBe('9876543210')
  })

  test('leading trunk 0 is stripped', () => {
    expect(normalizeIndianPhone('09876543210')).toBe('9876543210')
  })

  test('spaces and dashes are ignored', () => {
    expect(normalizeIndianPhone('+91 98765-43210')).toBe('9876543210')
  })

  test('numbers not starting with 6-9 are rejected', () => {
    expect(normalizeIndianPhone('5876543210')).toBeNull()
  })

  test('too short is rejected', () => {
    expect(normalizeIndianPhone('98765')).toBeNull()
  })

  test('garbage prefix is rejected', () => {
    expect(normalizeIndianPhone('1239876543210')).toBeNull()
  })

  test('isValidIndianPhone mirrors normalizeIndianPhone', () => {
    expect(isValidIndianPhone('9876543210')).toBe(true)
    expect(isValidIndianPhone('abc')).toBe(false)
  })
})
