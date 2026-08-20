'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Alert from '@/components/ui/Alert'
import type { Business } from '@/types'

type Action = 'set' | 'change' | 'reset'

interface Props {
  business: Business
  onSuccess: (hasPin: boolean) => void
  onClose: () => void
  initialAction: Action
}

export default function StaffPinManager({ business, onSuccess, onClose, initialAction }: Props) {
  const [action, setAction] = useState<Action>(initialAction)
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [accountPassword, setAccountPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isPro = business.plan === 'pro'

  if (!isPro) {
    return (
      <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
        <div className="bg-zinc-900 rounded-lg p-5 border border-zinc-800 w-full max-w-sm space-y-4 shadow-xl">
          <h3 className="font-semibold text-sm text-zinc-100">Pro Feature</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Staff PIN management requires the IntelliStamp Pro plan.
          </p>
          <div className="flex justify-end pt-2">
            <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    )
  }

  const handleSubmit = async () => {
    setError('')

    if (action === 'change' && !currentPin) {
      setError('Current PIN is required')
      return
    }
    if (action === 'reset' && !accountPassword) {
      setError('Account password is required')
      return
    }
    if (!newPin || !/^\d{4}$/.test(newPin)) {
      setError('New PIN must be exactly 4 digits')
      return
    }
    if (newPin !== confirmPin) {
      setError('New PIN and Confirmation do not match')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/business/settings/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          current_pin: action === 'change' ? currentPin : undefined,
          new_pin: newPin,
          confirm_pin: confirmPin,
          account_password: action === 'reset' ? accountPassword : undefined
        }),
      })
      const json = await res.json()
      if (res.ok) {
        setCurrentPin('')
        setNewPin('')
        setConfirmPin('')
        setAccountPassword('')
        onSuccess(true)
        onClose()
      } else {
        setError(json.error || 'Failed to update PIN')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const titles = {
    set: 'Set Staff PIN',
    change: 'Change Staff PIN',
    reset: 'Reset Staff PIN'
  }

  const descriptions = {
    set: 'Create a 4-digit PIN for your staff to authorize manual stamp and reward operations.',
    change: 'Enter your current PIN to set a new one.',
    reset: 'Re-authenticate with your account password to reset a forgotten Staff PIN.'
  }

  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 rounded-lg p-5 border border-zinc-800 w-full max-w-sm space-y-4 shadow-xl">
        <div>
          <h3 className="font-semibold text-sm text-zinc-100">{titles[action]}</h3>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{descriptions[action]}</p>
        </div>

        {error && <Alert type="error" message={error} />}

        <div className="space-y-3">
          {action === 'change' && (
            <Input
              type="password"
              label="Current PIN"
              placeholder="••••"
              maxLength={4}
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
            />
          )}

          {action === 'reset' && (
            <Input
              type="password"
              label="Account Password"
              placeholder="Enter your login password"
              value={accountPassword}
              onChange={(e) => setAccountPassword(e.target.value)}
            />
          )}

          <Input
            type="password"
            label="New 4-Digit PIN"
            placeholder="••••"
            maxLength={4}
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
          />

          <Input
            type="password"
            label="Confirm New PIN"
            placeholder="••••"
            maxLength={4}
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" size="sm" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" className="flex-1" loading={loading} onClick={handleSubmit}>
            Save PIN
          </Button>
        </div>

        {action === 'change' && (
          <div className="text-center pt-1">
            <button
              onClick={() => {
                setError('')
                setAction('reset')
              }}
              className="text-xs text-zinc-500 hover:text-zinc-300 underline cursor-pointer"
            >
              Forgot current PIN? Reset it
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
