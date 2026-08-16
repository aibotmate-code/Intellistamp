import { getBusinessAccessState } from '../businessState'

describe('getBusinessAccessState', () => {
  it('returns pending for pending status', () => {
    expect(getBusinessAccessState({ approval_status: 'pending', plan_expires_at: null })).toBe('pending')
  })

  it('returns suspended for suspended status', () => {
    expect(getBusinessAccessState({ approval_status: 'suspended', plan_expires_at: null })).toBe('suspended')
  })

  it('returns rejected for rejected status', () => {
    expect(getBusinessAccessState({ approval_status: 'rejected', plan_expires_at: null })).toBe('rejected')
  })

  it('returns active for approved status with no expiry', () => {
    expect(getBusinessAccessState({ approval_status: 'approved', plan_expires_at: null })).toBe('active')
  })

  it('returns active for approved status with future expiry', () => {
    const future = new Date(Date.now() + 1000000).toISOString()
    expect(getBusinessAccessState({ approval_status: 'approved', plan_expires_at: future })).toBe('active')
  })

  it('returns expired for approved status with past expiry', () => {
    const past = new Date(Date.now() - 1000000).toISOString()
    expect(getBusinessAccessState({ approval_status: 'approved', plan_expires_at: past })).toBe('expired')
  })

  it('defaults to pending for unknown status', () => {
    expect(getBusinessAccessState({ approval_status: 'unknown_status', plan_expires_at: null })).toBe('pending')
  })
})
