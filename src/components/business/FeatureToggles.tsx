'use client'

import { useState } from 'react'
import Toggle from '@/components/ui/Toggle'
import type { Business } from '@/types'

interface FeatureTogglesProps {
  business: Business
  onSave: (updates: Partial<Business>) => Promise<void>
}

export default function FeatureToggles({ business, onSave }: FeatureTogglesProps) {
  const [dynamicQr, setDynamicQr] = useState(business.dynamic_qr_enabled)
  const [staffPin, setStaffPin] = useState(business.staff_pin_enabled)
  const [whatsapp, setWhatsapp] = useState(business.whatsapp_enabled)
  const [showPinNudge, setShowPinNudge] = useState(false)
  const [showWaNudge, setShowWaNudge] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleToggle = async (key: keyof Business, value: boolean) => {
    if (key === 'staff_pin_enabled' && value) setShowPinNudge(true)
    if (key === 'whatsapp_enabled' && value) setShowWaNudge(true)

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
      <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">Security</h3>

      <div className="bg-zinc-900 rounded-xl border border-zinc-800 divide-y divide-zinc-800">
        <div className="p-4">
          <Toggle
            checked={dynamicQr}
            onChange={(v) => handleToggle('dynamic_qr_enabled', v)}
            label="Dynamic QR"
            description="QR rotates every 30s. Physical presence required."
            badge="⚡ Smart"
            badgeColor="yellow"
          />
        </div>

        <div className="p-4">
          <Toggle
            checked={staffPin}
            onChange={(v) => handleToggle('staff_pin_enabled', v)}
            label="Staff PIN Validator"
            description="Staff manually verifies each stamp. Max control."
            badge="🔒 Pro Feature"
            badgeColor="purple"
          />
          {showPinNudge && (
            <div className="mt-3 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <p className="text-sm text-purple-300">
                Staff PIN requires IntelliStamp Pro (₹2,499/mo)
              </p>
              <button className="mt-2 text-xs text-purple-400 underline">Upgrade</button>
            </div>
          )}
        </div>

        <div className="p-4">
          <Toggle
            checked={true}
            onChange={() => {}}
            label="4-Hour Cooldown"
            description="Prevents stamping twice within 4 hours."
            badge="Free"
            badgeColor="green"
          />
        </div>

        <div className="p-4">
          <Toggle
            checked={whatsapp}
            onChange={(v) => handleToggle('whatsapp_enabled', v)}
            label="WhatsApp Campaigns"
            description="Send automated reminders and offers to customers."
            badge="Pro Feature"
            badgeColor="purple"
          />
          {showWaNudge && (
            <div className="mt-3 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <p className="text-sm text-purple-300">
                WhatsApp Campaigns require IntelliStamp Pro (₹2,499/mo)
              </p>
              <button className="mt-2 text-xs text-purple-400 underline">Upgrade</button>
            </div>
          )}
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
