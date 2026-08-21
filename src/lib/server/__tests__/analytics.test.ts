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
      expect(res.displayChange).toBe('+20%')
    })

    test('normal negative change', () => {
      const res = calculatePercentChange(80, 100)
      expect(res.percentChange).toBe(-20)
      expect(res.direction).toBe('down')
      expect(res.displayChange).toBe('-20%')
    })

    test('zero change when previous > 0', () => {
      const res = calculatePercentChange(50, 50)
      expect(res.percentChange).toBe(0)
      expect(res.direction).toBe('neutral')
      expect(res.displayChange).toBe('0%')
    })

    test('zero denominator with zero current → No change', () => {
      const res = calculatePercentChange(0, 0)
      expect(res.percentChange).toBe(0)
      expect(res.direction).toBe('neutral')
      expect(res.displayChange).toBe('No change')
    })

    test('zero denominator with positive current → New activity (not misleading +100%)', () => {
      const res = calculatePercentChange(5, 0)
      expect(res.percentChange).toBeNull()
      expect(res.direction).toBe('new_activity')
      expect(res.displayChange).toBe('New activity')
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
      const text = generateHealthSummary(
        { current: 0, previous: 0, percentChange: 0 },
        { current: 0, previous: 0, percentChange: 0 },
        0
      )
      expect(text).toContain('New loyalty program')
    })

    test('summary for returning customer zero-baseline start', () => {
      const text = generateHealthSummary(
        { current: 5, previous: 0, percentChange: null },
        { current: 3, previous: 0, percentChange: null },
        10
      )
      expect(text).toBe('Returning customer activity started during this period.')
    })

    test('summary for returning customer percentage growth', () => {
      const text = generateHealthSummary(
        { current: 15, previous: 10, percentChange: 50 },
        { current: 12, previous: 8, percentChange: 22 },
        100
      )
      expect(text).toContain('Returning customer loyalty activity is up +22%')
    })

    test('summary for declining customer activity', () => {
      const text = generateHealthSummary(
        { current: 10, previous: 20, percentChange: -15 },
        { current: 5, previous: 6, percentChange: -5 },
        100
      )
      expect(text).toContain('Customer loyalty activity is down 15%')
    })

    test('summary for stable activity', () => {
      const text = generateHealthSummary(
        { current: 20, previous: 19, percentChange: 3 },
        { current: 10, previous: 10, percentChange: 2 },
        100
      )
      expect(text).toContain('broadly stable')
    })
  })
})
