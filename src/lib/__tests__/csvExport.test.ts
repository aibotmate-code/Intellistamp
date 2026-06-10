import { buildCSV, CSV_HEADERS } from '../csv'
import type { CustomerExportRow } from '../csv'

function makeRow(overrides: Partial<CustomerExportRow> = {}): CustomerExportRow {
  return {
    name: 'Rahul',
    phone: '9876543210',
    current_cycle_stamps: 3,
    lifetime_visits: 11,
    last_visit_at: '2026-06-04T18:30:00Z',
    rewards_earned: 1,
    rewards_redeemed: 1,
    whatsapp_optin: 'yes',
    birthday_month: 'March',
    birthday_day: 15,
    enrolled_at: '2026-01-10T09:00:00Z',
    milestone_badges_earned: '',
    ...overrides,
  }
}

describe('buildCSV', () => {
  test('empty array → header row only', () => {
    const csv = buildCSV([])
    const lines = csv.split('\n')
    expect(lines).toHaveLength(1)
    expect(lines[0]).toBe(CSV_HEADERS.join(','))
  })

  test('one customer → header + one data row', () => {
    const csv = buildCSV([makeRow()])
    const lines = csv.split('\n')
    expect(lines).toHaveLength(2)
  })

  test('correct column count (12 columns)', () => {
    expect(CSV_HEADERS).toHaveLength(12)
    const csv = buildCSV([makeRow()])
    // Data row: count commas outside quotes + 1
    const dataRow = csv.split('\n')[1]
    // Simple split on comma gives 12 fields for a row without commas in values
    expect(dataRow.split(',').length).toBe(12)
  })

  test('phone number preserved as string (no scientific notation)', () => {
    const csv = buildCSV([makeRow({ phone: '9876543210' })])
    expect(csv).toContain('9876543210')
    expect(csv).not.toContain('9.88e')
  })

  test('commas in names are escaped with quotes', () => {
    const csv = buildCSV([makeRow({ name: 'Rahul, Jr.' })])
    expect(csv).toContain('"Rahul, Jr."')
  })

  test('null birthday → empty cell not "null"', () => {
    const csv = buildCSV([makeRow({ birthday_month: null, birthday_day: null })])
    expect(csv).not.toContain('null')
    // Should have two consecutive commas where birthday fields are
    expect(csv).toContain('yes,,')
  })

  test('milestone_badges_earned is semicolon-separated list for multiple badges', () => {
    const csv = buildCSV([makeRow({ milestone_badges_earned: '🥈 Silver;🥇 Gold' })])
    expect(csv).toContain('🥈 Silver;🥇 Gold')
  })

  test('dates formatted as YYYY-MM-DD', () => {
    const csv = buildCSV([makeRow({
      last_visit_at: '2026-06-04T18:30:00Z',
      enrolled_at: '2026-01-10T09:00:00Z',
    })])
    expect(csv).toContain('2026-06-04')
    expect(csv).toContain('2026-01-10')
    expect(csv).not.toContain('T18:30:00Z')
    expect(csv).not.toContain('T09:00:00Z')
  })

  test('empty last_visit_at → empty date cell', () => {
    const csv = buildCSV([makeRow({ last_visit_at: '' })])
    // The last_visit_at column should be empty
    const dataRow = csv.split('\n')[1]
    const cells = dataRow.split(',')
    // last_visit_at is index 4 (0-based)
    expect(cells[4]).toBe('')
  })

  test('first row is correct header', () => {
    const csv = buildCSV([])
    const header = csv.split('\n')[0]
    expect(header).toBe(
      'name,phone,current_cycle_stamps,lifetime_visits,last_visit_at,' +
      'rewards_earned,rewards_redeemed,whatsapp_optin,birthday_month,' +
      'birthday_day,enrolled_at,milestone_badges_earned'
    )
  })
})
