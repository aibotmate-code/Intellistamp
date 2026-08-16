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
        // Enforce setting PIN before enabling
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
    dynamicQr && '⚡ Smart QR',
    staffPin && '🔒 Staff PIN',
    whatsapp && '📲 WhatsApp',
  ].filter(Boolean)

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">Stamp Verification</h3>

      <div className="bg-zinc-900 rounded-xl border border-zinc-800 divide-y divide-zinc-800">
        <div className="p-4">
          <Toggle
            checked={dynamicQr}
            onChange={(v) => handleToggle('dynamic_qr_enabled', v)}
            label="Auto-Refresh QR"
            description="QR refreshes automatically to prevent sharing."
            badge="⚡ Recommended"
            badgeColor="yellow"
          />
        </div>

        <div className="p-4">
          <Toggle
            checked={staffPin}
            onChange={(v) => handleToggle('staff_pin_enabled', v)}
            label="Staff PIN Verification"
            description="Staff manually verifies each stamp. Max control."
            badge="🔒 Pro Feature"
            badgeColor="purple"
          />
          {showPinNudge && (
            <div className="mt-3 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <p className="text-sm text-purple-300">
                Staff PIN Verification requires IntelliStamp Pro (₹2,499/mo)
              </p>
              <button className="mt-2 text-xs text-purple-400 underline">Upgrade</button>
            </div>
          )}
        </div>

        <div className="p-4">
          <Toggle
            checked={whatsapp}
            onChange={(v) => handleToggle('whatsapp_enabled', v)}
            label="WhatsApp Reminders"
            description="Send automated reminders and offers to customers."
            badge="Pro Feature"
            badgeColor="purple"
          />
          {showWaNudge && (
            <div className="mt-3 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <p className="text-sm text-purple-300">
                WhatsApp Reminders require IntelliStamp Pro (₹2,499/mo)
              </p>
              <button className="mt-2 text-xs text-purple-400 underline">Upgrade</button>
            </div>
          )}
        </div>
      </div>

      <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide pt-4">Advanced Settings</h3>
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 divide-y divide-zinc-800">
        <div className="p-4">
          <Toggle
            checked={true}
            onChange={() => {}}
            label="Time Between Stamps"
            description="Prevent customers from receiving another stamp for 4 hours."
            badge="Free"
            badgeColor="green"
          />
        </div>
      </div>

      {active.length > 0 ? (
        <p className="text-sm text-zinc-400">⚡ Active: {active.join(', ')}</p>
      ) : (
        <p className="text-sm text-yellow-500">⚠️ No security — abuse risk is high</p>
      )}

      {saving && <p className="text-xs text-zinc-500">Saving...</p>}
    </div>
  )
}
