'use client'

import { useState } from 'react'
import Toggle from '@/components/ui/Toggle'
import type { Business } from '@/types'

interface FeatureTogglesProps {
  business: Business
  onSave: (updates: Partial<Business>) => Promise<void>
  onOpenPinManager: (action: 'set' | 'change') => void
}

export default function FeatureToggles({ business, onSave, onOpenPinManager }: FeatureTogglesProps) {
  const [dynamicQr, setDynamicQr] = useState(business.dynamic_qr_enabled)
  const [staffPin, setStaffPin] = useState(business.staff_pin_enabled)
  const [whatsapp, setWhatsapp] = useState(business.whatsapp_enabled)
  const [showPinNudge, setShowPinNudge] = useState(false)
  const [showWaNudge, setShowWaNudge] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleToggle = async (key: keyof Business, value: boolean) => {
    if (key === 'whatsapp_enabled' && value) setShowWaNudge(true)

    if (key === 'staff_pin_enabled') {
      if (business.plan === 'free') {
        setShowPinNudge(true)
        return
      }
      if (value && !business.has_staff_pin) {
        onOpenPinManager('set')
        return
      }
    }

    setSaving(true)
    if (key === 'dynamic_qr_enabled') setDynamicQr(value)
    if (key === 'staff_pin_enabled') setStaffPin(value)
    if (key === 'whatsapp_enabled') setWhatsapp(value)

    await onSave({ [key]: value })
    setSaving(false)
  }

  const active = [
    dynamicQr && 'Smart QR',
    staffPin && 'Staff PIN',
    whatsapp && 'WhatsApp',
  ].filter(Boolean)

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Stamp Verification</h3>
      </div>

      <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 divide-y divide-zinc-800/80 shadow-xs">
        <div className="p-4">
          <Toggle
            checked={dynamicQr}
            onChange={(v) => handleToggle('dynamic_qr_enabled', v)}
            label="Auto-Refresh QR"
            description="QR refreshes automatically every 30s to prevent code sharing."
            badge="Recommended"
            badgeColor="green"
          />
        </div>

        <div className="p-4">
          <Toggle
            checked={staffPin}
            onChange={(v) => handleToggle('staff_pin_enabled', v)}
            label="Staff PIN Verification"
            description="Staff verifies customer number and enters PIN before stamping."
            badge="Pro Feature"
            badgeColor="purple"
          />
          {showPinNudge && (
            <div className="mt-3 p-3 bg-purple-500/10 border border-purple-500/20 rounded-md">
              <p className="text-xs text-purple-300">
                Staff PIN Verification requires IntelliStamp Pro.
              </p>
            </div>
          )}
        </div>

        <div className="p-4">
          <Toggle
            checked={whatsapp}
            onChange={(v) => handleToggle('whatsapp_enabled', v)}
            label="WhatsApp Reminders"
            description="Send automated reminders and offers to enrolled customers."
            badge="Pro Feature"
            badgeColor="purple"
          />
          {showWaNudge && (
            <div className="mt-3 p-3 bg-purple-500/10 border border-purple-500/20 rounded-md">
              <p className="text-xs text-purple-300">
                WhatsApp Reminders require IntelliStamp Pro.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="pt-2">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Advanced Security</h3>
        <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 divide-y divide-zinc-800 shadow-xs">
          <div className="p-4">
            <Toggle
              checked={true}
              onChange={() => {}}
              label="Time Between Stamps (Cooldown)"
              description="Prevent customers from receiving another stamp within 4 hours."
              badge="Active"
              badgeColor="green"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-zinc-500 pt-1">
        <span>Active modes: {active.join(', ') || 'None'}</span>
        {saving && <span>Saving changes...</span>}
      </div>
    </div>
  )
}
