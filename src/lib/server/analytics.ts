import { adminClient } from '@/lib/auth'

export type AnalyticsPeriod = '7d' | '30d' | '90d'

export interface PeriodComparison {
  current: number
  previous: number
  percentChange: number | null // null if zero-baseline with new activity or lifetime
  direction: 'up' | 'down' | 'neutral' | 'new_activity'
  displayChange?: string
}

export interface BusinessAnalyticsKPIs {
  totalCustomers: PeriodComparison
  newCustomers: PeriodComparison
  activeCustomers: PeriodComparison
  returningCustomers: PeriodComparison
  stampsIssued: PeriodComparison
  rewardsRedeemed: PeriodComparison
  nearRewardCount: number
  returnRate: {
    rate: number // 0-100 percentage
    returningCustomers: number
    activeCustomers: number
    percentChange: number | null
    direction: 'up' | 'down' | 'neutral' | 'new_activity'
    displayChange?: string
  }
}

export interface ActivityDataPoint {
  date: string // YYYY-MM-DD
  label: string // e.g. "18 Aug"
  activeCustomers: number
  stampsIssued: number
  newCustomers: number
  returningCustomers: number
}

export interface CustomerSegment {
  name: 'Reward Ready' | 'Near Reward' | 'Active' | 'New' | 'Inactive'
  count: number
  percentage: number
  color: string
}

export interface BusinessAnalyticsPayload {
  businessId: string
  period: AnalyticsPeriod
  periodDays: number
  dateRange: {
    currentStart: string
    currentEnd: string
    previousStart: string
    previousEnd: string
  }
  summaryStatement: string
  kpis: BusinessAnalyticsKPIs
  timeSeries: ActivityDataPoint[]
  customerSegments: CustomerSegment[]
  totalAuditedEvents: number
}

export interface TenantCustomerDetail {
  id: string
  customerId: string
  name: string
  phone: string
  maskedPhone: string
  enrolledAt: string
  totalStamps: number
  cardStamps: number
  stampsRequired: number
  cardsRedeemed: number
  lastVisit: string | null
  status: 'Reward Ready' | 'Near Reward' | 'Active' | 'New' | 'Inactive'
}

export interface TenantActivityEvent {
  id: string
  type: 'stamp_issued' | 'customer_enrolled' | 'reward_redeemed' | 'milestone_claimed' | 'admin_update'
  title: string
  description: string
  timestamp: string
  customerName?: string
  customerPhone?: string
  actor?: string
}

/**
 * Calculates percentage change safely handling zero denominators.
 * - Previous = 0, Current > 0 → 'New activity'
 * - Previous = 0, Current = 0 → 'No change'
 * - Previous > 0 → normal percentage change
 */
export function calculatePercentChange(current: number, previous: number): {
  percentChange: number | null
  direction: 'up' | 'down' | 'neutral' | 'new_activity'
  displayChange: string
} {
  if (previous === 0) {
    if (current === 0) {
      return { percentChange: 0, direction: 'neutral', displayChange: 'No change' }
    }
    return { percentChange: null, direction: 'new_activity', displayChange: 'New activity' }
  }

  const change = ((current - previous) / previous) * 100
  const rounded = Math.round(change * 10) / 10

  if (rounded > 0) return { percentChange: rounded, direction: 'up', displayChange: `+${rounded}%` }
  if (rounded < 0) return { percentChange: rounded, direction: 'down', displayChange: `${rounded}%` }
  return { percentChange: 0, direction: 'neutral', displayChange: '0%' }
}

/**
 * Formats a phone number for display (+91 ••••• •1234).
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone) return '—'
  const clean = phone.trim()
  if (clean.length <= 4) return clean
  const last4 = clean.slice(-4)
  const prefix = clean.startsWith('+') ? clean.slice(0, 3) : ''
  return `${prefix} •••• •${last4}`.trim()
}

/**
 * Classifies customer status based on loyalty state and timestamp history.
 */
export function classifyCustomerStatus(
  totalStamps: number,
  cardStamps: number,
  stampsRequired: number,
  cardsRedeemed: number,
  lastVisitIso: string | null,
  enrolledAtIso: string,
  nowMs: number = Date.now()
): 'Reward Ready' | 'Near Reward' | 'Active' | 'New' | 'Inactive' {
  const completedCardsTotal = Math.floor(totalStamps / stampsRequired)
  const availableUnredeemed = completedCardsTotal - cardsRedeemed
  
  // 1. Reward Ready: Unclaimed completed card or exactly completed threshold
  if (availableUnredeemed > 0 || (cardStamps === 0 && totalStamps > 0 && availableUnredeemed >= 0)) {
    if (availableUnredeemed > 0) return 'Reward Ready'
  }

  // 2. Near Reward: Within 1 or 2 stamps of target
  const remaining = stampsRequired - cardStamps
  if (remaining <= 2 && remaining > 0 && stampsRequired >= 3) {
    return 'Near Reward'
  }

  const lastVisitMs = lastVisitIso ? new Date(lastVisitIso).getTime() : 0
  const enrolledMs = new Date(enrolledAtIso).getTime()
  const daysSinceLastVisit = lastVisitMs > 0 ? (nowMs - lastVisitMs) / (1000 * 60 * 60 * 24) : 999
  const daysSinceEnrolled = (nowMs - enrolledMs) / (1000 * 60 * 60 * 24)

  // 3. Inactive: No visit in > 30 days
  if (daysSinceLastVisit > 30 && daysSinceEnrolled > 14) {
    return 'Inactive'
  }

  // 4. New: Enrolled within 14 days and has <= 1 stamp
  if (daysSinceEnrolled <= 14 && totalStamps <= 1) {
    return 'New'
  }

  // 5. Active: Stamped recently
  return 'Active'
}

/**
 * Computes deterministic business health summary statement.
 */
export function generateHealthSummary(
  activeComparison: { current: number; previous: number; percentChange: number | null },
  returningComparison: { current: number; previous: number; percentChange: number | null },
  totalCustomers: number
): string {
  if (totalCustomers === 0) {
    return 'New loyalty program — awaiting initial customer enrollment.'
  }

  // Zero-baseline start for returning customers
  if (returningComparison.previous === 0 && returningComparison.current > 0) {
    return 'Returning customer activity started during this period.'
  }

  if (returningComparison.percentChange !== null && returningComparison.percentChange > 10) {
    return `Returning customer loyalty activity is up ${returningComparison.percentChange > 0 ? '+' : ''}${returningComparison.percentChange}% compared with the previous period.`
  }

  // Zero-baseline start for active customers
  if (activeComparison.previous === 0 && activeComparison.current > 0) {
    return 'Customer loyalty activity started during this period.'
  }

  if (activeComparison.percentChange !== null && activeComparison.percentChange > 10) {
    return `Active customer engagement is up ${activeComparison.percentChange > 0 ? '+' : ''}${activeComparison.percentChange}% compared with the previous period.`
  }

  if (activeComparison.percentChange !== null && activeComparison.percentChange < -10) {
    return `Customer loyalty activity is down ${Math.abs(activeComparison.percentChange)}% compared with the previous period.`
  }

  return 'Loyalty engagement and customer activity are broadly stable compared with the previous period.'
}

/**
 * Core tenant-isolated analytics aggregator.
 */
export async function getBusinessAnalytics(
  businessId: string,
  period: AnalyticsPeriod = '30d'
): Promise<BusinessAnalyticsPayload> {
  const periodDays = period === '7d' ? 7 : period === '90d' ? 90 : 30
  const now = new Date()
  const nowMs = now.getTime()
  const oneDayMs = 24 * 60 * 60 * 1000

  const currentPeriodStartMs = nowMs - periodDays * oneDayMs
  const previousPeriodStartMs = nowMs - 2 * periodDays * oneDayMs

  const currentPeriodStartDate = new Date(currentPeriodStartMs)
  const previousPeriodStartDate = new Date(previousPeriodStartMs)

  // 1. Fetch business record
  const { data: business, error: bizError } = await adminClient
    .from('businesses')
    .select('id, name, stamps_required, reward, created_at')
    .eq('id', businessId)
    .single()

  if (bizError || !business) {
    throw new Error('Business not found')
  }

  const stampsRequired = Number(business.stamps_required) || 6

  // 2. Fetch all customers enrolled for this business (tenant-scoped)
  const { data: bcList } = await adminClient
    .from('business_customers')
    .select('id, customer_id, enrolled_at, cards_redeemed, customer:customers(id, name, phone)')
    .eq('business_id', businessId)

  const businessCustomers = bcList || []
  const totalCustomersCount = businessCustomers.length

  // 3. Fetch all stamps for this business (tenant-scoped)
  const { data: stampsList } = await adminClient
    .from('stamps')
    .select('id, customer_id, stamped_at, type')
    .eq('business_id', businessId)
    .gte('stamped_at', previousPeriodStartDate.toISOString())
    .order('stamped_at', { ascending: true })

  const allRecentStamps = stampsList || []

  // Also fetch all historical stamps grouped by customer for lifetime visit calculations
  const { data: lifetimeStamps } = await adminClient
    .from('stamps')
    .select('customer_id, stamped_at')
    .eq('business_id', businessId)
    .order('stamped_at', { ascending: false })

  const lifetimeStampsByCustomer = new Map<string, Array<{ stamped_at: string }>>()
  for (const s of lifetimeStamps || []) {
    if (!lifetimeStampsByCustomer.has(s.customer_id)) {
      lifetimeStampsByCustomer.set(s.customer_id, [])
    }
    lifetimeStampsByCustomer.get(s.customer_id)!.push(s)
  }

  // --- CURRENT PERIOD DATA ---
  const currentStamps = allRecentStamps.filter(
    (s) => new Date(s.stamped_at).getTime() >= currentPeriodStartMs
  )
  const previousStamps = allRecentStamps.filter((s) => {
    const t = new Date(s.stamped_at).getTime()
    return t >= previousPeriodStartMs && t < currentPeriodStartMs
  })

  // Customer Enrollment metrics
  const currentNewCustomers = businessCustomers.filter(
    (bc) => new Date(bc.enrolled_at).getTime() >= currentPeriodStartMs
  ).length
  const previousNewCustomers = businessCustomers.filter((bc) => {
    const t = new Date(bc.enrolled_at).getTime()
    return t >= previousPeriodStartMs && t < currentPeriodStartMs
  }).length

  // Active Customers (Unique customers with at least 1 stamp in the period)
  const currentActiveCustomerIds = new Set(currentStamps.map((s) => s.customer_id))
  const previousActiveCustomerIds = new Set(previousStamps.map((s) => s.customer_id))

  const currentActiveCount = currentActiveCustomerIds.size
  const previousActiveCount = previousActiveCustomerIds.size

  // Returning Customers (Active in current period AND have either >1 stamp in period or prior history)
  const currentCustomerStampCounts = new Map<string, number>()
  for (const s of currentStamps) {
    currentCustomerStampCounts.set(s.customer_id, (currentCustomerStampCounts.get(s.customer_id) || 0) + 1)
  }

  let currentReturningCount = 0
  for (const [cId, count] of currentCustomerStampCounts.entries()) {
    const totalLifetime = lifetimeStampsByCustomer.get(cId)?.length || 0
    if (count > 1 || totalLifetime > count) {
      currentReturningCount++
    }
  }

  const previousCustomerStampCounts = new Map<string, number>()
  for (const s of previousStamps) {
    previousCustomerStampCounts.set(s.customer_id, (previousCustomerStampCounts.get(s.customer_id) || 0) + 1)
  }
  let previousReturningCount = 0
  for (const [, count] of previousCustomerStampCounts.entries()) {
    if (count > 1) {
      previousReturningCount++
    }
  }

  // Stamps count
  const currentStampsCount = currentStamps.length
  const previousStampsCount = previousStamps.length

  // Rewards Redeemed
  const totalCardsRedeemed = businessCustomers.reduce(
    (acc, bc) => acc + (Number(bc.cards_redeemed) || 0),
    0
  )

  // Near Reward calculation
  let nearRewardCount = 0
  const segmentCounts: Record<'Reward Ready' | 'Near Reward' | 'Active' | 'New' | 'Inactive', number> = {
    'Reward Ready': 0,
    'Near Reward': 0,
    'Active': 0,
    'New': 0,
    'Inactive': 0,
  }

  for (const bc of businessCustomers) {
    const cStamps = lifetimeStampsByCustomer.get(bc.customer_id) || []
    const total = cStamps.length
    const cardStamps = total % stampsRequired
    const lastStamp = cStamps[0]?.stamped_at || null
    const cardsRedeemed = Number(bc.cards_redeemed) || 0

    const status = classifyCustomerStatus(
      total,
      cardStamps,
      stampsRequired,
      cardsRedeemed,
      lastStamp,
      bc.enrolled_at,
      nowMs
    )

    segmentCounts[status]++
    if (status === 'Near Reward') {
      nearRewardCount++
    }
  }

  // Return Rate
  const currentReturnRate = currentActiveCount > 0
    ? Math.round((currentReturningCount / currentActiveCount) * 100)
    : 0
  const previousReturnRate = previousActiveCount > 0
    ? Math.round((previousReturningCount / previousActiveCount) * 100)
    : 0

  // KPI Calculations with period comparison
  const totalCustomersDelta = calculatePercentChange(
    totalCustomersCount,
    totalCustomersCount - currentNewCustomers
  )
  const newCustomersDelta = calculatePercentChange(currentNewCustomers, previousNewCustomers)
  const activeCustomersDelta = calculatePercentChange(currentActiveCount, previousActiveCount)
  const returningCustomersDelta = calculatePercentChange(currentReturningCount, previousReturningCount)
  const stampsIssuedDelta = calculatePercentChange(currentStampsCount, previousStampsCount)
  const returnRateDelta = calculatePercentChange(currentReturnRate, previousReturnRate)

  // Continuous Daily Time Series Generation
  const timeSeriesMap = new Map<string, ActivityDataPoint>()
  for (let i = periodDays - 1; i >= 0; i--) {
    const dayMs = nowMs - i * oneDayMs
    const d = new Date(dayMs)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const dateKey = `${yyyy}-${mm}-${dd}`
    const label = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })

    timeSeriesMap.set(dateKey, {
      date: dateKey,
      label,
      activeCustomers: 0,
      stampsIssued: 0,
      newCustomers: 0,
      returningCustomers: 0,
    })
  }

  // Populate time series from actual stamp records
  const dayActiveCustomerMap = new Map<string, Set<string>>()
  for (const s of currentStamps) {
    const dateKey = new Date(s.stamped_at).toISOString().split('T')[0]
    if (timeSeriesMap.has(dateKey)) {
      const entry = timeSeriesMap.get(dateKey)!
      entry.stampsIssued++

      if (!dayActiveCustomerMap.has(dateKey)) {
        dayActiveCustomerMap.set(dateKey, new Set())
      }
      dayActiveCustomerMap.get(dateKey)!.add(s.customer_id)
    }
  }

  // Populate new customer enrollments per day
  for (const bc of businessCustomers) {
    const dateKey = new Date(bc.enrolled_at).toISOString().split('T')[0]
    if (timeSeriesMap.has(dateKey)) {
      timeSeriesMap.get(dateKey)!.newCustomers++
    }
  }

  // Set active and returning customer counts per day
  for (const [dateKey, entry] of timeSeriesMap.entries()) {
    const dayActiveSet = dayActiveCustomerMap.get(dateKey) || new Set()
    entry.activeCustomers = dayActiveSet.size
    entry.returningCustomers = Math.max(0, entry.activeCustomers - entry.newCustomers)
  }

  const timeSeries = Array.from(timeSeriesMap.values())

  // Customer Segments breakdown (mutually exclusive)
  const totalEvaluated = totalCustomersCount || 1
  const customerSegments: CustomerSegment[] = [
    {
      name: 'Reward Ready',
      count: segmentCounts['Reward Ready'],
      percentage: Math.round((segmentCounts['Reward Ready'] / totalEvaluated) * 100),
      color: '#10B981', // Emerald
    },
    {
      name: 'Near Reward',
      count: segmentCounts['Near Reward'],
      percentage: Math.round((segmentCounts['Near Reward'] / totalEvaluated) * 100),
      color: '#F59E0B', // Amber
    },
    {
      name: 'Active',
      count: segmentCounts['Active'],
      percentage: Math.round((segmentCounts['Active'] / totalEvaluated) * 100),
      color: '#3B82F6', // Blue
    },
    {
      name: 'New',
      count: segmentCounts['New'],
      percentage: Math.round((segmentCounts['New'] / totalEvaluated) * 100),
      color: '#8B5CF6', // Purple
    },
    {
      name: 'Inactive',
      count: segmentCounts['Inactive'],
      percentage: Math.round((segmentCounts['Inactive'] / totalEvaluated) * 100),
      color: '#71717A', // Zinc
    },
  ]

  const summaryStatement = generateHealthSummary(
    {
      current: currentActiveCount,
      previous: previousActiveCount,
      percentChange: activeCustomersDelta.percentChange,
    },
    {
      current: currentReturningCount,
      previous: previousReturningCount,
      percentChange: returningCustomersDelta.percentChange,
    },
    totalCustomersCount
  )

  return {
    businessId,
    period,
    periodDays,
    dateRange: {
      currentStart: currentPeriodStartDate.toISOString(),
      currentEnd: now.toISOString(),
      previousStart: previousPeriodStartDate.toISOString(),
      previousEnd: currentPeriodStartDate.toISOString(),
    },
    summaryStatement,
    kpis: {
      totalCustomers: {
        current: totalCustomersCount,
        previous: totalCustomersCount - currentNewCustomers,
        percentChange: totalCustomersDelta.percentChange,
        direction: totalCustomersDelta.direction,
        displayChange: totalCustomersDelta.displayChange,
      },
      newCustomers: {
        current: currentNewCustomers,
        previous: previousNewCustomers,
        percentChange: newCustomersDelta.percentChange,
        direction: newCustomersDelta.direction,
        displayChange: newCustomersDelta.displayChange,
      },
      activeCustomers: {
        current: currentActiveCount,
        previous: previousActiveCount,
        percentChange: activeCustomersDelta.percentChange,
        direction: activeCustomersDelta.direction,
        displayChange: activeCustomersDelta.displayChange,
      },
      returningCustomers: {
        current: currentReturningCount,
        previous: previousReturningCount,
        percentChange: returningCustomersDelta.percentChange,
        direction: returningCustomersDelta.direction,
        displayChange: returningCustomersDelta.displayChange,
      },
      stampsIssued: {
        current: currentStampsCount,
        previous: previousStampsCount,
        percentChange: stampsIssuedDelta.percentChange,
        direction: stampsIssuedDelta.direction,
        displayChange: stampsIssuedDelta.displayChange,
      },
      rewardsRedeemed: {
        current: totalCardsRedeemed,
        previous: totalCardsRedeemed, // Lifetime metric
        percentChange: null,
        direction: 'neutral',
        displayChange: 'Total',
      },
      nearRewardCount,
      returnRate: {
        rate: currentReturnRate,
        returningCustomers: currentReturningCount,
        activeCustomers: currentActiveCount,
        percentChange: returnRateDelta.percentChange,
        direction: returnRateDelta.direction,
        displayChange: returnRateDelta.displayChange,
      },
    },
    timeSeries,
    customerSegments,
    totalAuditedEvents: currentStamps.length + currentNewCustomers,
  }
}

/**
 * Fetches tenant-scoped customer list with progress, visits, and status classification.
 */
export async function getTenantCustomers(businessId: string): Promise<TenantCustomerDetail[]> {
  const { data: business } = await adminClient
    .from('businesses')
    .select('stamps_required')
    .eq('id', businessId)
    .single()

  const stampsRequired = Number(business?.stamps_required) || 6

  const { data: bcList, error } = await adminClient
    .from('business_customers')
    .select('id, customer_id, enrolled_at, cards_redeemed, customer:customers(id, name, phone)')
    .eq('business_id', businessId)
    .order('enrolled_at', { ascending: false })

  if (error || !bcList) {
    return []
  }

  const { data: allStamps } = await adminClient
    .from('stamps')
    .select('customer_id, stamped_at')
    .eq('business_id', businessId)
    .order('stamped_at', { ascending: false })

  const stampsByCustomer = new Map<string, Array<{ stamped_at: string }>>()
  for (const s of allStamps || []) {
    if (!stampsByCustomer.has(s.customer_id)) {
      stampsByCustomer.set(s.customer_id, [])
    }
    stampsByCustomer.get(s.customer_id)!.push(s)
  }

  const nowMs = Date.now()

  return bcList.map((bc) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cust = (bc as any).customer || {}
    const cStamps = stampsByCustomer.get(bc.customer_id) || []
    const total = cStamps.length
    const cardStamps = total % stampsRequired
    const lastVisit = cStamps[0]?.stamped_at || null
    const cardsRedeemed = Number(bc.cards_redeemed) || 0

    const status = classifyCustomerStatus(
      total,
      cardStamps,
      stampsRequired,
      cardsRedeemed,
      lastVisit,
      bc.enrolled_at,
      nowMs
    )

    return {
      id: bc.id,
      customerId: bc.customer_id,
      name: cust.name || 'Guest Customer',
      phone: cust.phone || '',
      maskedPhone: maskPhoneNumber(cust.phone || ''),
      enrolledAt: bc.enrolled_at,
      totalStamps: total,
      cardStamps,
      stampsRequired,
      cardsRedeemed,
      lastVisit,
      status,
    }
  })
}

/**
 * Fetches tenant-scoped activity feed.
 */
export async function getTenantActivity(
  businessId: string,
  limit: number = 50
): Promise<TenantActivityEvent[]> {
  const events: TenantActivityEvent[] = []

  // 1. Stamps issued
  const { data: stamps } = await adminClient
    .from('stamps')
    .select('id, type, stamped_at, customer_id, customer:customers(name, phone)')
    .eq('business_id', businessId)
    .order('stamped_at', { ascending: false })
    .limit(limit)

  for (const s of stamps || []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cust = (s as any).customer || {}
    events.push({
      id: `stamp-${s.id}`,
      type: 'stamp_issued',
      title: s.type === 'bonus_review' ? 'Bonus Review Stamp' : 'Stamp Issued',
      description: `Issued loyalty stamp to ${cust.name || maskPhoneNumber(cust.phone || '')}`,
      timestamp: s.stamped_at,
      customerName: cust.name || 'Guest',
      customerPhone: maskPhoneNumber(cust.phone || ''),
      actor: 'Customer Scan / Kiosk',
    })
  }

  // 2. Customer enrollments
  const { data: enrollments } = await adminClient
    .from('business_customers')
    .select('id, enrolled_at, customer:customers(name, phone)')
    .eq('business_id', businessId)
    .order('enrolled_at', { ascending: false })
    .limit(limit)

  for (const e of enrollments || []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cust = (e as any).customer || {}
    events.push({
      id: `enroll-${e.id}`,
      type: 'customer_enrolled',
      title: 'Customer Enrolled',
      description: `${cust.name || 'New Customer'} joined the loyalty program`,
      timestamp: e.enrolled_at,
      customerName: cust.name || 'Guest',
      customerPhone: maskPhoneNumber(cust.phone || ''),
      actor: 'Customer QR Flow',
    })
  }

  // Sort unified feed newest first
  return events
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit)
}
