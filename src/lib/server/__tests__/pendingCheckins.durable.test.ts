/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  createPendingCheckin,
  getPendingCheckinStatus,
  getPendingCheckinsForBusiness,
  approvePendingCheckin,
  resolvePendingCheckinForCustomer,
} from '../pendingCheckins'

describe('Durable Pending Check-in Database Layer (Mode C)', () => {
  const BIZ_A = '11111111-1111-4000-a000-000000000001'
  const BIZ_B = '22222222-2222-4000-a000-000000000002'
  const CUST_A = '33333333-3333-4000-a000-000000000003'
  const CHK_ID = '44444444-4444-4000-a000-000000000004'
  const STAMP_ID = '55555555-5555-4000-a000-000000000005'

  // ── C: Mode C creates durable pending request in PostgreSQL ───────────────
  test('C. Mode C creates durable pending request with 5-minute TTL', async () => {
    const mockInsert = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: {
            id: CHK_ID,
            business_id: BIZ_A,
            customer_id: CUST_A,
            status: 'pending',
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          },
          error: null,
        }),
      }),
    })

    const mockClient: any = {
      from: jest.fn((table: string) => {
        expect(table).toBe('pending_checkins')
        return { insert: mockInsert }
      }),
    }

    const res = await createPendingCheckin(
      { business_id: BIZ_A, customer_id: CUST_A },
      mockClient
    )

    expect(res.error).toBeUndefined()
    expect(res.checkin).toBeDefined()
    expect(res.checkin?.id).toBe(CHK_ID)
    expect(res.checkin?.status).toBe('pending')
    expect(mockInsert).toHaveBeenCalledWith({
      business_id: BIZ_A,
      customer_id: CUST_A,
      status: 'pending',
    })
  })

  // ── E & I: Staff can approve own business request & invokes issue_stamp_atomic ──
  test('E & I. Staff can approve own business request and invokes issue_stamp_atomic', async () => {
    const mockRpc = jest.fn().mockResolvedValue({
      data: {
        success: true,
        checkin_id: CHK_ID,
        stamp_result: {
          id: STAMP_ID,
          total_stamps: 3,
          card_stamps: 3,
          cards_completed: 0,
          redeemable: false,
        },
      },
      error: null,
    })

    const mockClient: any = {
      rpc: mockRpc,
    }

    const res = await approvePendingCheckin(CHK_ID, BIZ_A, 'staff-123', mockClient)

    expect(res.success).toBe(true)
    expect(res.stamp_result?.id).toBe(STAMP_ID)
    expect(mockRpc).toHaveBeenCalledWith('approve_pending_checkin', {
      p_checkin_id: CHK_ID,
      p_business_id: BIZ_A,
      p_approved_by: 'staff-123',
    })
  })

  // ── F: Business A cannot approve Business B request (Tenant Boundary) ──────
  test('F. Business A cannot approve Business B request (tenant boundary)', async () => {
    const mockRpc = jest.fn().mockResolvedValue({
      data: {
        error: 'not_found',
      },
      error: null,
    })

    const mockClient: any = {
      rpc: mockRpc,
    }

    // Business B attempts to approve Check-in belonging to Business A
    const res = await approvePendingCheckin(CHK_ID, BIZ_B, 'staff-biz-b', mockClient)

    expect(res.success).toBe(false)
    expect(res.error).toBe('not_found')
    expect(mockRpc).toHaveBeenCalledWith('approve_pending_checkin', {
      p_checkin_id: CHK_ID,
      p_business_id: BIZ_B,
      p_approved_by: 'staff-biz-b',
    })
  })

  // ── G: Expired request cannot be approved ──────────────────────────────────
  test('G. Expired request cannot be approved', async () => {
    const mockRpc = jest.fn().mockResolvedValue({
      data: {
        error: 'expired',
      },
      error: null,
    })

    const mockClient: any = {
      rpc: mockRpc,
    }

    const res = await approvePendingCheckin(CHK_ID, BIZ_A, 'staff-123', mockClient)

    expect(res.success).toBe(false)
    expect(res.error).toBe('expired')
  })

  // ── H: Same request cannot be approved twice ───────────────────────────────
  test('H. Same request cannot be approved twice (already processed)', async () => {
    const mockRpc = jest.fn().mockResolvedValue({
      data: {
        error: 'already_processed',
        status: 'approved',
      },
      error: null,
    })

    const mockClient: any = {
      rpc: mockRpc,
    }

    const res = await approvePendingCheckin(CHK_ID, BIZ_A, 'staff-123', mockClient)

    expect(res.success).toBe(false)
    expect(res.error).toBe('already_processed')
  })

  // ── J: Customer polling returns status only for its specific request ──────
  test('J. Customer polling returns status strictly for its specific checkin_id and business_id', async () => {
    const mockSingle = jest.fn().mockResolvedValue({
      data: {
        id: CHK_ID,
        business_id: BIZ_A,
        customer_id: CUST_A,
        status: 'approved',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 60000).toISOString(),
        approved_at: new Date().toISOString(),
        result_stamp_id: STAMP_ID,
        result_payload: {
          id: STAMP_ID,
          total_stamps: 3,
          card_stamps: 3,
        },
      },
      error: null,
    })

    const mockEq2 = jest.fn().mockReturnValue({ single: mockSingle })
    const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 })
    const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 })

    const mockClient: any = {
      from: jest.fn(() => ({ select: mockSelect })),
    }

    const res = await getPendingCheckinStatus(CHK_ID, BIZ_A, mockClient)

    expect(res.status).toBe('approved')
    expect(res.record?.id).toBe(CHK_ID)
    expect(res.record?.result_stamp_id).toBe(STAMP_ID)
    expect(mockEq1).toHaveBeenCalledWith('id', CHK_ID)
    expect(mockEq2).toHaveBeenCalledWith('business_id', BIZ_A)
  })

  test('J2. Customer polling returns not_found if checked against wrong business', async () => {
    const mockSingle = jest.fn().mockResolvedValue({
      data: null,
      error: { message: 'Row not found' },
    })

    const mockEq2 = jest.fn().mockReturnValue({ single: mockSingle })
    const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 })
    const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 })

    const mockClient: any = {
      from: jest.fn(() => ({ select: mockSelect })),
    }

    const res = await getPendingCheckinStatus(CHK_ID, BIZ_B, mockClient)

    expect(res.status).toBe('not_found')
    expect(res.record).toBeUndefined()
  })

  // ── Merchant Pending List ──────────────────────────────────────────────────
  test('Merchant lists active pending check-ins with joined customer details', async () => {
    const mockOrder = jest.fn().mockResolvedValue({
      data: [
        {
          id: CHK_ID,
          business_id: BIZ_A,
          customer_id: CUST_A,
          status: 'pending',
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 180000).toISOString(),
          customers: {
            phone: '9876543210',
            name: 'Priya',
          },
        },
      ],
      error: null,
    })

    const mockGt = jest.fn().mockReturnValue({ order: mockOrder })
    const mockEqStatus = jest.fn().mockReturnValue({ gt: mockGt })
    const mockEqBiz = jest.fn().mockReturnValue({ eq: mockEqStatus })
    const mockSelect = jest.fn().mockReturnValue({ eq: mockEqBiz })

    const mockClient: any = {
      from: jest.fn(() => ({ select: mockSelect })),
    }

    const list = await getPendingCheckinsForBusiness(BIZ_A, mockClient)

    expect(list).toHaveLength(1)
    expect(list[0].id).toBe(CHK_ID)
    expect(list[0].customers?.phone).toBe('9876543210')
  })

  // ── Resolve on Kiosk Stamp ────────────────────────────────────────────────
  test('Resolves pending check-in when kiosk issues stamp directly', async () => {
    const mockSelect = jest.fn().mockResolvedValue({
      data: [{ id: CHK_ID }],
      error: null,
    })

    const mockGt = jest.fn().mockReturnValue({ select: mockSelect })
    const mockEqStatus = jest.fn().mockReturnValue({ gt: mockGt })
    const mockEqCust = jest.fn().mockReturnValue({ eq: mockEqStatus })
    const mockEqBiz = jest.fn().mockReturnValue({ eq: mockEqCust })
    const mockUpdate = jest.fn().mockReturnValue({ eq: mockEqBiz })

    const mockClient: any = {
      from: jest.fn(() => ({ update: mockUpdate })),
    }

    const resolved = await resolvePendingCheckinForCustomer(
      BIZ_A,
      CUST_A,
      { id: STAMP_ID, card_state: { total_stamps: 1 } },
      mockClient
    )

    expect(resolved).toBe(true)
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'approved',
        result_stamp_id: STAMP_ID,
      })
    )
  })
})
