// Indian mobile numbers: 10 digits, starts with 6/7/8/9.
// Accepts optional country/trunk prefixes (0, 91, 091, 0091) ahead of the 10 digits.
const INDIA_MOBILE_RE = /^[6-9]\d{9}$/

/**
 * Normalizes an Indian mobile number to its bare 10-digit form
 * (the format stored in customers.phone), or returns null if invalid.
 *
 * Accepts: 9876543210, +919876543210, 919876543210, 0919876543210, 09876543210
 */
export function normalizeIndianPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (digits.length < 10) return null

  const last10 = digits.slice(-10)
  if (!INDIA_MOBILE_RE.test(last10)) return null

  const prefix = digits.slice(0, -10)
  if (prefix !== '' && !/^0{0,2}91$|^0$/.test(prefix)) return null

  return last10
}

export function isValidIndianPhone(raw: string): boolean {
  return normalizeIndianPhone(raw) !== null
}
