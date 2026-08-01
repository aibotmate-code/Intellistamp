'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Alert from '@/components/ui/Alert'

interface LookupResult {
  found: boolean
  customer?: { id: string; name?: string; phone: string }
  card_state?: {
    total_stamps: number
    card_stamps: number
    cards_completed: number
    redeemable: boolean
  }
  reward?: string
  last_visit?: string | null
}

interface CustomerLookupProps {
  businessId: string
  stampsRequired: number
  onStamped?: () => void
}

export default function CustomerLookup({ businessId, stampsRequired, onStamped }: CustomerLookupProps) {
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [pinError, setPinError] = useState('')
  const [loading, setLoading] = useState(false)
  const [stamping, setStamping] = useState(false)
  const [result, setResult] = useState<LookupResult | null>(null)
  const [stampMsg, setStampMsg] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const handleLookup = async () => {
    setPhoneError('')
    setPinError('')
    setResult(null)
    setStampMsg(null)

    let hasError = false
    if (!phone.trim()) { setPhoneError('Enter a mobile number'); hasError = true }
    if (!pin.trim()) { setPinError('Enter staff PIN'); hasError = true }
    if (hasError) return

    setLoading(true)
    try {
      const res = await fetch('/api/business/customer-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_id: businessId, phone }),
      })
      const data = await res.json()
      if (!res.ok) {
        setPhoneError(data.error || 'Something went wrong')
        return
      }
      setResult(data)
    } catch {
      setPhoneError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleIssueStamp = async () => {
    if (!result?.customer) return
    setStamping(true)
    setStampMsg(null)
    try {
      const res = await fetch('/api/kiosk/stamp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_id: businessId, phone: result.customer.phone, pin }),
      })
      const data = await res.json()
      if (!res.ok) {
        setStampMsg({ type: 'error', msg: data.error || 'Failed to issue stamp' })
        return
      }
      setStampMsg({ type: 'success', msg: 'Stamp issued successfully!' })
      setResult((prev) => prev ? { ...prev, card_state: data.card_state } : prev)
      setPhone('')
      setPin('')
      onStamped?.()
    } catch {
      setStampMsg({ type: 'error', msg: 'Network error' })
    } finally {
      setStamping(false)
    }
  }

  return (
    <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 space-y-4">
      <h3 className="font-bold text-white">Find customer by mobile number</h3>

      {/* Hidden dummy inputs to catch and prevent browser autofill hijack */}
      <input type="text" name="prevent_autofill_username" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
      <input type="password" name="prevent_autofill_password" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />

      <Input
        label="Customer Mobile Number"
        placeholder="9876543210"
        type="tel"
        name="customer-mobile-lookup"
        autoComplete="off"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        error={phoneError}
        inputMode="numeric"
        maxLength={15}
      />

      <Input
        label="Staff PIN"
        type="password"
        name="staff-pin-verification"
        autoComplete="new-password"
        placeholder="4-digit PIN"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        error={pinError}
        inputMode="numeric"
        maxLength={4}
      />

      <Button onClick={handleLookup} loading={loading} className="w-full">
        Find Customer
      </Button>

      {result && !result.found && (
        <Alert type="info" message="No customer found for this number at your business." />
      )}

      {result?.found && result.customer && result.card_state && (
        <div className="rounded-xl border border-zinc-700 p-4 space-y-3">
          <div>
            <p className="font-semibold text-white">{result.customer.name || 'Unknown'}</p>
            <p className="text-sm text-zinc-400">••••{result.customer.phone.slice(-4)}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-zinc-500">Stamps</p>
              <p className="text-yellow-400 font-bold">{result.card_state.card_stamps}/{stampsRequired}</p>
            </div>
            <div>
              <p className="text-zinc-500">Total visits</p>
              <p className="text-white font-bold">{result.card_state.total_stamps}</p>
            </div>
            <div>
              <p className="text-zinc-500">Reward</p>
              <p className="text-white">{result.reward}</p>
            </div>
            <div>
              <p className="text-zinc-500">Last visit</p>
              <p className="text-white">
                {result.last_visit ? new Date(result.last_visit).toLocaleDateString() : 'Never'}
              </p>
            </div>
          </div>
          {result.card_state.redeemable && (
            <p className="text-sm text-green-400 font-medium">🎁 Reward ready to redeem</p>
          )}
          {stampMsg && <Alert type={stampMsg.type} message={stampMsg.msg} />}
          <Button onClick={handleIssueStamp} loading={stamping} className="w-full">
            Confirm & Issue Stamp
          </Button>
        </div>
      )}
    </div>
  )
}
