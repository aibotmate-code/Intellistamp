import {
  calculatePercentChange,
  maskPhoneNumber,
  classifyCustomerStatus,
  generateHealthSummary,
} from '../analytics'

describe('Analytics Calculations Unit Tests', () => {
  describe('calculatePercentChange', () => {
    test('normal positive change', () => {
      const res = calculatePercentChange(120, 100)
      expect(res.percentChange).toBe(20)
      expect(res.direction).toBe('up')
    })

    test('normal negative change', () => {
      const res = calculatePercentChange(80, 100)
      expect(res.percentChange).toBe(-20)
      expect(res.direction).toBe('down')
    })

    test('zero change', () => {
      const res = calculatePercentChange(50, 50)
      expect(res.percentChange).toBe(0)
      expect(res.direction).toBe('neutral')
    })

    test('zero denominator with zero current → 0% neutral', () => {
      const res = calculatePercentChange(0, 0)
      expect(res.percentChange).toBe(0)
      expect(res.direction).toBe('neutral')
    })

    test('zero denominator with positive current → 100% up', () => {
      const res = calculatePercentChange(5, 0)
      expect(res.percentChange).toBe(100)
      expect(res.direction).toBe('up')
    })
  })

  describe('maskPhoneNumber', () => {
    test('standard indian phone number', () => {
      expect(maskPhoneNumber('+919876543210')).toBe('+91 •••• •3210')
    })

    test('empty phone returns dash', () => {
      expect(maskPhoneNumber('')).toBe('—')
    })

    test('short phone', () => {
      expect(maskPhoneNumber('123')).toBe('123')
    })
  })

  describe('classifyCustomerStatus', () => {
    const nowMs = new Date('2026-08-21T12:00:00Z').getTime()
    const oneDayMs = 24 * 60 * 60 * 1000

    test('Reward Ready when card is completed and unredeemed', () => {
      // 6 stamps out of 6, 0 redeemed
      const status = classifyCustomerStatus(
        6,
        0,
        6,
        0,
        new Date(nowMs - 2 * oneDayMs).toISOString(),
        new Date(nowMs - 20 * oneDayMs).toISOString(),
        nowMs
      )
      expect(status).toBe('Reward Ready')
    })

    test('Near Reward when within 1 or 2 stamps of target', () => {
      // 4 stamps out of 6 (2 stamps remaining)
      const status1 = classifyCustomerStatus(
        4,
        4,
        6,
        0,
        new Date(nowMs - 2 * oneDayMs).toISOString(),
        new Date(nowMs - 20 * oneDayMs).toISOString(),
        nowMs
      )
      expect(status1).toBe('Near Reward')

      // 5 stamps out of 6 (1 stamp remaining)
      const status2 = classifyCustomerStatus(
        5,
        5,
        6,
        0,
        new Date(nowMs - 2 * oneDayMs).toISOString(),
        new Date(nowMs - 20 * oneDayMs).toISOString(),
        nowMs
      )
      expect(status2).toBe('Near Reward')
    })

    test('New when enrolled within 14 days and <= 1 stamp', () => {
      const status = classifyCustomerStatus(
        1,
        1,
        6,
        0,
        new Date(nowMs - 3 * oneDayMs).toISOString(),
        new Date(nowMs - 5 * oneDayMs).toISOString(),
        nowMs
      )
      expect(status).toBe('New')
    })

    test('Inactive when no visit in > 30 days', () => {
      const status = classifyCustomerStatus(
        2,
        2,
        6,
        0,
        new Date(nowMs - 45 * oneDayMs).toISOString(),
        new Date(nowMs - 60 * oneDayMs).toISOString(),
        nowMs
      )
      expect(status).toBe('Inactive')
    })

    test('Active when stamped recently', () => {
      const status = classifyCustomerStatus(
        3,
        3,
        6,
        0,
        new Date(nowMs - 5 * oneDayMs).toISOString(),
        new Date(nowMs - 40 * oneDayMs).toISOString(),
        nowMs
      )
      expect(status).toBe('Active')
    })
  })

  describe('generateHealthSummary', () => {
    test('summary for new business with 0 customers', () => {
      const text = generateHealthSummary(null, null, 0)
      expect(text).toContain('New loyalty program')
    })

    test('summary for returning customer growth', () => {
      const text = generateHealthSummary(5, 22, 100)
      expect(text).toContain('Returning customer loyalty activity is up +22%')
    })

    test('summary for declining customer activity', () => {
      const text = generateHealthSummary(-15, -5, 100)
      expect(text).toContain('Customer loyalty activity is down 15%')
    })

    test('summary for stable activity', () => {
      const text = generateHealthSummary(3, 2, 100)
      expect(text).toContain('broadly stable')
    })
  })
})
