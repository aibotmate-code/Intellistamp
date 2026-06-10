export interface CustomerExportRow {
  name: string
  phone: string
  current_cycle_stamps: number
  lifetime_visits: number
  last_visit_at: string
  rewards_earned: number
  rewards_redeemed: number
  whatsapp_optin: string
  birthday_month: string | null
  birthday_day: number | null
  enrolled_at: string
  milestone_badges_earned: string
}

export const CSV_HEADERS = [
  'name',
  'phone',
  'current_cycle_stamps',
  'lifetime_visits',
  'last_visit_at',
  'rewards_earned',
  'rewards_redeemed',
  'whatsapp_optin',
  'birthday_month',
  'birthday_day',
  'enrolled_at',
  'milestone_badges_earned',
]

function escapeCsvCell(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return ''
  const s = String(val)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function formatDateCell(isoString: string | null | undefined): string {
  if (!isoString) return ''
  return isoString.split('T')[0]
}

export function buildCSV(customers: CustomerExportRow[]): string {
  const header = CSV_HEADERS.map(escapeCsvCell).join(',')

  const rows = customers.map((c) => {
    return [
      escapeCsvCell(c.name),
      escapeCsvCell(c.phone),
      escapeCsvCell(c.current_cycle_stamps),
      escapeCsvCell(c.lifetime_visits),
      escapeCsvCell(formatDateCell(c.last_visit_at)),
      escapeCsvCell(c.rewards_earned),
      escapeCsvCell(c.rewards_redeemed),
      escapeCsvCell(c.whatsapp_optin),
      escapeCsvCell(c.birthday_month),
      escapeCsvCell(c.birthday_day),
      escapeCsvCell(formatDateCell(c.enrolled_at)),
      escapeCsvCell(c.milestone_badges_earned),
    ].join(',')
  })

  if (rows.length === 0) return header
  return `${header}\n${rows.join('\n')}`
}
