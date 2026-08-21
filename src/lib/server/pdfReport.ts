import PDFDocument from 'pdfkit'
import { adminClient } from '@/lib/auth'
import { getBusinessAnalytics, AnalyticsPeriod, BusinessAnalyticsPayload } from '@/lib/server/analytics'

export interface ReportPdfOptions {
  businessId: string
  period?: AnalyticsPeriod
}

/**
 * Formats date range label (e.g. "22 Jul 2026 – 21 Aug 2026")
 */
function formatDateRange(startIso: string, endIso: string): string {
  const start = new Date(startIso)
  const end = new Date(endIso)

  const startFormatted = start.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  const endFormatted = end.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return `${startFormatted} – ${endFormatted}`
}

/**
 * Formats generation date
 */
function formatGeneratedDate(date: Date = new Date()): string {
  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Generates a branded, client-facing PDF performance report as a Buffer.
 * Compatible with direct downloads and future email attachments.
 */
export async function generateBusinessReportPdf(
  businessId: string,
  period: AnalyticsPeriod = '30d'
): Promise<Buffer> {
  // 1. Fetch business metadata and analytics data
  const { data: business, error: bizError } = await adminClient
    .from('businesses')
    .select('id, name, slug, reward, stamps_required, brand_primary_color, logo_url')
    .eq('id', businessId)
    .single()

  if (bizError || !business) {
    throw new Error('Business not found')
  }

  const analytics: BusinessAnalyticsPayload = await getBusinessAnalytics(businessId, period)

  return new Promise<Buffer>((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 36,
        info: {
          Title: `${business.name} — IntelliStamp Performance Report`,
          Author: 'Intellical Labs',
          Subject: `Loyalty Performance Report (${period.toUpperCase()})`,
        },
      })

      const chunks: Buffer[] = []
      doc.on('data', (chunk) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', (err) => reject(err))

      const primaryColor = business.brand_primary_color || '#F59E0B'
      const periodLabel = period === '7d' ? '7 Days' : period === '90d' ? '90 Days' : '30 Days'
      const dateRangeText = formatDateRange(
        analytics.dateRange.currentStart,
        analytics.dateRange.currentEnd
      )
      const generatedDateText = formatGeneratedDate()

      const pageWidth = 595.28
      const margin = 36
      const contentWidth = pageWidth - margin * 2 // 523.28 pt

      // =========================================================================
      // 1. TOP HEADER BANNER (Deep Dark Slate with Amber Accents)
      // =========================================================================
      const headerHeight = 90
      doc
        .rect(margin, margin, contentWidth, headerHeight)
        .fill('#0B0F19')

      // Subtle top accent line
      doc
        .rect(margin, margin, contentWidth, 3)
        .fill(primaryColor)

      // Header Text (Left)
      doc
        .fillColor('#F59E0B')
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('INTELLISTAMP PERFORMANCE REPORT', margin + 18, margin + 14)

      doc
        .fillColor('#FFFFFF')
        .fontSize(18)
        .font('Helvetica-Bold')
        .text(business.name, margin + 18, margin + 27, { width: 320, ellipsis: true })

      doc
        .fillColor('#94A3B8')
        .fontSize(9)
        .font('Helvetica')
        .text(`Period: Last ${periodLabel} (${dateRangeText})`, margin + 18, margin + 52)

      doc
        .fillColor('#64748B')
        .fontSize(8)
        .text(`Reward Target: ${business.stamps_required} stamps for "${business.reward}"`, margin + 18, margin + 68)

      // Header Text (Right) - Intellical Labs Endorsement
      doc
        .fillColor('#CBD5E1')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('IntelliStamp', margin + contentWidth - 140, margin + 16, { width: 122, align: 'right' })

      doc
        .fillColor('#94A3B8')
        .fontSize(7.5)
        .font('Helvetica')
        .text('by Intellical Labs', margin + contentWidth - 140, margin + 28, { width: 122, align: 'right' })

      doc
        .fillColor('#64748B')
        .fontSize(7.5)
        .text(`Generated: ${generatedDateText}`, margin + contentWidth - 140, margin + 68, { width: 122, align: 'right' })

      let curY = margin + headerHeight + 12

      // =========================================================================
      // 2. LOYALTY INTELLIGENCE SUMMARY BANNER
      // =========================================================================
      const insightHeight = 44
      doc
        .rect(margin, curY, contentWidth, insightHeight)
        .fillAndStroke('#F8FAFC', '#E2E8F0')

      doc
        .rect(margin, curY, 4, insightHeight)
        .fill('#F59E0B')

      doc
        .fillColor('#B45309')
        .fontSize(7.5)
        .font('Helvetica-Bold')
        .text('LOYALTY INTELLIGENCE SUMMARY', margin + 14, curY + 8)

      const summaryNote = `${analytics.summaryStatement} ${
        analytics.kpis.nearRewardCount > 0
          ? `${analytics.kpis.nearRewardCount} customers are within 1–2 visits of completing their loyalty reward.`
          : ''
      }`.trim()

      doc
        .fillColor('#1E293B')
        .fontSize(8.5)
        .font('Helvetica')
        .text(summaryNote, margin + 14, curY + 20, { width: contentWidth - 28, lineGap: 1.5 })

      curY += insightHeight + 12

      // =========================================================================
      // 3. KPI SUMMARY CARDS (2 rows of 3 columns)
      // =========================================================================
      const cardCols = 3
      const cardGap = 8
      const cardWidth = (contentWidth - cardGap * (cardCols - 1)) / cardCols // ~169pt
      const cardHeight = 58

      const kpiItems = [
        {
          label: 'TOTAL CUSTOMERS',
          value: analytics.kpis.totalCustomers.current.toLocaleString(),
          delta: analytics.kpis.totalCustomers.displayChange || 'Total base',
          isNewOrPositive: analytics.kpis.totalCustomers.direction === 'new_activity' || analytics.kpis.totalCustomers.direction === 'up',
          isNegative: analytics.kpis.totalCustomers.direction === 'down',
          sub: `${analytics.kpis.nearRewardCount} near reward`,
        },
        {
          label: `NEW CUSTOMERS (${period.toUpperCase()})`,
          value: analytics.kpis.newCustomers.current.toLocaleString(),
          delta: analytics.kpis.newCustomers.displayChange || 'New activity',
          isNewOrPositive: analytics.kpis.newCustomers.direction === 'new_activity' || analytics.kpis.newCustomers.direction === 'up',
          isNegative: analytics.kpis.newCustomers.direction === 'down',
          sub: 'First visit this period',
        },
        {
          label: `ACTIVE CUSTOMERS (${period.toUpperCase()})`,
          value: analytics.kpis.activeCustomers.current.toLocaleString(),
          delta: analytics.kpis.activeCustomers.displayChange || 'Active',
          isNewOrPositive: analytics.kpis.activeCustomers.direction === 'new_activity' || analytics.kpis.activeCustomers.direction === 'up',
          isNegative: analytics.kpis.activeCustomers.direction === 'down',
          sub: 'Unique active visitors',
        },
        {
          label: `RETURNING CUSTOMERS (${period.toUpperCase()})`,
          value: analytics.kpis.returningCustomers.current.toLocaleString(),
          delta: analytics.kpis.returningCustomers.displayChange || 'Repeat',
          isNewOrPositive: analytics.kpis.returningCustomers.direction === 'new_activity' || analytics.kpis.returningCustomers.direction === 'up',
          isNegative: analytics.kpis.returningCustomers.direction === 'down',
          sub: 'Repeat loyalty activity',
        },
        {
          label: `STAMPS ISSUED (${period.toUpperCase()})`,
          value: analytics.kpis.stampsIssued.current.toLocaleString(),
          delta: analytics.kpis.stampsIssued.displayChange || 'Stamps',
          isNewOrPositive: analytics.kpis.stampsIssued.direction === 'new_activity' || analytics.kpis.stampsIssued.direction === 'up',
          isNegative: analytics.kpis.stampsIssued.direction === 'down',
          sub: `${analytics.kpis.rewardsRedeemed.current} lifetime rewards claimed`,
        },
        {
          label: 'RETURN RATE',
          value: `${analytics.kpis.returnRate.rate}%`,
          delta: analytics.kpis.returnRate.displayChange || 'Rate',
          isNewOrPositive: analytics.kpis.returnRate.direction === 'new_activity' || analytics.kpis.returnRate.direction === 'up',
          isNegative: analytics.kpis.returnRate.direction === 'down',
          sub: 'Returning / Active visitors',
        },
      ]

      kpiItems.forEach((kpi, idx) => {
        const col = idx % cardCols
        const row = Math.floor(idx / cardCols)
        const x = margin + col * (cardWidth + cardGap)
        const y = curY + row * (cardHeight + cardGap)

        // Card Container
        doc
          .rect(x, y, cardWidth, cardHeight)
          .fillAndStroke('#FFFFFF', '#E2E8F0')

        // Top Label
        doc
          .fillColor('#64748B')
          .fontSize(6.5)
          .font('Helvetica-Bold')
          .text(kpi.label, x + 8, y + 7, { width: cardWidth - 16 })

        // Value
        doc
          .fillColor('#0F172A')
          .fontSize(15)
          .font('Helvetica-Bold')
          .text(kpi.value, x + 8, y + 18)

        // Delta Badge & Subtitle
        const deltaColor = kpi.isNewOrPositive ? '#059669' : kpi.isNegative ? '#DC2626' : '#64748B'
        doc
          .fillColor(deltaColor)
          .fontSize(7)
          .font('Helvetica-Bold')
          .text(kpi.delta, x + 8, y + 42)

        doc
          .fillColor('#94A3B8')
          .fontSize(6.5)
          .font('Helvetica')
          .text(kpi.sub, x + 8 + 52, y + 42.5, { width: cardWidth - 66, align: 'right', ellipsis: true })
      })

      curY += 2 * (cardHeight + cardGap) + 8

      // =========================================================================
      // 4. CHARTS SECTION: CUSTOMER ACTIVITY & REPEAT VISITS
      // =========================================================================
      const chartSectionHeight = 160
      const chartBoxWidth = (contentWidth - 10) / 2 // ~256pt

      // Box 1: Customer Activity Trend
      doc
        .rect(margin, curY, chartBoxWidth, chartSectionHeight)
        .fillAndStroke('#FFFFFF', '#E2E8F0')

      doc
        .fillColor('#0F172A')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('Customer Activity Trend', margin + 10, curY + 10)

      doc
        .fillColor('#64748B')
        .fontSize(7)
        .font('Helvetica')
        .text('Daily Active Customers & Stamps Issued', margin + 10, curY + 22)

      // Legend for Box 1
      doc
        .rect(margin + chartBoxWidth - 110, curY + 11, 6, 6)
        .fill('#F59E0B')
      doc
        .fillColor('#475569')
        .fontSize(6.5)
        .font('Helvetica')
        .text('Stamps', margin + chartBoxWidth - 100, curY + 11)

      doc
        .rect(margin + chartBoxWidth - 56, curY + 11, 6, 6)
        .fill('#3B82F6')
      doc
        .fillColor('#475569')
        .fontSize(6.5)
        .font('Helvetica')
        .text('Active', margin + chartBoxWidth - 46, curY + 11)

      // Draw Vector Chart 1
      const chart1X = margin + 14
      const chart1Y = curY + 38
      const chart1W = chartBoxWidth - 28
      const chart1H = 95

      // Chart background grid
      doc
        .rect(chart1X, chart1Y, chart1W, chart1H)
        .fill('#F8FAFC')

      const timeSeries = analytics.timeSeries || []
      const maxStamps = Math.max(...timeSeries.map((t) => Math.max(t.stampsIssued, t.activeCustomers)), 4)

      // Grid horizontal lines
      for (let g = 0; g <= 4; g++) {
        const gy = chart1Y + (chart1H / 4) * g
        doc
          .moveTo(chart1X, gy)
          .lineTo(chart1X + chart1W, gy)
          .strokeColor('#E2E8F0')
          .lineWidth(0.5)
          .stroke()
      }

      // Draw bars / lines for timeSeries
      if (timeSeries.length > 0) {
        const step = chart1W / timeSeries.length

        timeSeries.forEach((pt, i) => {
          const px = chart1X + i * step + step * 0.15
          const barW = Math.max(step * 0.7, 1.5)

          // Stamps bar (Amber)
          const stampsH = (pt.stampsIssued / maxStamps) * (chart1H - 4)
          if (stampsH > 0) {
            doc
              .rect(px, chart1Y + chart1H - stampsH, barW, stampsH)
              .fill('#F59E0B')
          }

          // Active customer marker / dot (Blue)
          const activeH = (pt.activeCustomers / maxStamps) * (chart1H - 4)
          if (activeH > 0) {
            doc
              .circle(px + barW / 2, chart1Y + chart1H - activeH, 1.5)
              .fill('#3B82F6')
          }
        })

        // Chart X-Axis Labels (Start, Middle, End)
        doc
          .fillColor('#94A3B8')
          .fontSize(6)
          .font('Helvetica')
          .text(timeSeries[0]?.label || '', chart1X, chart1Y + chart1H + 4)
        doc
          .text(timeSeries[Math.floor(timeSeries.length / 2)]?.label || '', chart1X + chart1W / 2 - 12, chart1Y + chart1H + 4)
        doc
          .text(timeSeries[timeSeries.length - 1]?.label || '', chart1X + chart1W - 24, chart1Y + chart1H + 4, { align: 'right' })
      }

      // Box 2: New vs Returning & Loyalty Segments
      const box2X = margin + chartBoxWidth + 10
      doc
        .rect(box2X, curY, chartBoxWidth, chartSectionHeight)
        .fillAndStroke('#FFFFFF', '#E2E8F0')

      doc
        .fillColor('#0F172A')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('Loyalty Customer Segments', box2X + 10, curY + 10)

      doc
        .fillColor('#64748B')
        .fontSize(7)
        .font('Helvetica')
        .text('Customer lifecycle distribution', box2X + 10, curY + 22)

      // Segments Distribution Bar
      const segY = curY + 38
      const segW = chartBoxWidth - 20
      const segH = 12

      doc
        .rect(box2X + 10, segY, segW, segH)
        .fill('#E2E8F0')

      let segOffset = 0
      const segments = analytics.customerSegments || []
      segments.forEach((seg) => {
        if (seg.percentage > 0) {
          const segPartW = (seg.percentage / 100) * segW
          doc
            .rect(box2X + 10 + segOffset, segY, segPartW, segH)
            .fill(seg.color)
          segOffset += segPartW
        }
      })

      // Segments Legend & Details Table
      let tableY = segY + segH + 10
      segments.forEach((seg) => {
        doc
          .rect(box2X + 12, tableY + 2, 6, 6)
          .fill(seg.color)

        doc
          .fillColor('#1E293B')
          .fontSize(7.5)
          .font('Helvetica-Bold')
          .text(seg.name, box2X + 24, tableY + 1)

        doc
          .fillColor('#475569')
          .fontSize(7.5)
          .font('Helvetica')
          .text(`${seg.count} (${seg.percentage}%)`, box2X + segW - 40, tableY + 1, { align: 'right' })

        tableY += 14
      })

      curY += chartSectionHeight + 12

      // =========================================================================
      // 5. RECENT ACTIVITY SUMMARY / AUDIT FOOTNOTE
      // =========================================================================
      const footerCardHeight = 46
      doc
        .rect(margin, curY, contentWidth, footerCardHeight)
        .fillAndStroke('#F8FAFC', '#E2E8F0')

      doc
        .fillColor('#0F172A')
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('Operating & Retention Notes', margin + 12, curY + 8)

      doc
        .fillColor('#475569')
        .fontSize(7.5)
        .font('Helvetica')
        .text(
          `• Customer retention rate is calculated strictly from verified scan visits during the selected ${periodLabel} window.\n` +
          `• All customer identifying data in this report is privacy-protected and tenant-isolated for ${business.name}.\n` +
          `• Program parameters: ${business.stamps_required} stamps per reward cycle. For custom campaign configuration, contact your account manager.`,
          margin + 12,
          curY + 18,
          { width: contentWidth - 24, lineGap: 1.5 }
        )

      // =========================================================================
      // 6. BOTTOM FOOTER ATTRIBUTION
      // =========================================================================
      const pageBottomY = 841.89 - margin - 10
      doc
        .moveTo(margin, pageBottomY)
        .lineTo(margin + contentWidth, pageBottomY)
        .strokeColor('#CBD5E1')
        .lineWidth(0.5)
        .stroke()

      doc
        .fillColor('#94A3B8')
        .fontSize(7)
        .font('Helvetica')
        .text('IntelliStamp • Confidential Merchant Performance Report', margin, pageBottomY + 4)

      doc
        .fillColor('#94A3B8')
        .fontSize(7)
        .text('Powered by Intellical Labs', margin + contentWidth - 120, pageBottomY + 4, { width: 120, align: 'right' })

      doc.end()
    } catch (err) {
      reject(err)
    }
  })
}
