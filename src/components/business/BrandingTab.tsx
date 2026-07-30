'use client'

import { startTransition, useCallback, useEffect, useRef, useState } from 'react'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'
import Toggle from '@/components/ui/Toggle'
import type { BusinessBranding } from '@/types'

interface BrandingTabProps {
  businessId: string
}

const SCHEMA_DEFAULTS = {
  primary_color: '#D4AF37',
  primary_dark_color: '#D4AF37',
  primary_light_color: '#D4AF37',
  secondary_color: null as string | null,
  accent_color: null as string | null,
  background_color: null as string | null,
  surface_color: null as string | null,
  text_on_primary: '#000000',
  is_enabled: true,
}

function buildLogoUrl(logoPath: string | null | undefined): string | null {
  if (!logoPath) return null
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/branding/${logoPath}`
}

function isValidHex(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value)
}

interface ColorRowProps {
  label: string
  value: string
  onChange: (v: string) => void
}

function ColorRow({ label, value, onChange }: ColorRowProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-zinc-300">{label}</label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={isValidHex(value) ? value : '#D4AF37'}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-14 shrink-0 rounded-lg border border-zinc-700 bg-zinc-800 cursor-pointer p-0.5"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            const v = e.target.value
            if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) onChange(v)
          }}
          className="w-28 shrink-0 bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
          maxLength={7}
          spellCheck={false}
        />
        <div
          className="h-10 flex-1 rounded-lg border border-zinc-700"
          style={{ background: isValidHex(value) ? value : 'transparent' }}
        />
      </div>
    </div>
  )
}

interface OptionalColorRowProps {
  label: string
  enabled: boolean
  value: string
  defaultValue: string
  onToggle: (on: boolean) => void
  onChange: (v: string) => void
}

function OptionalColorRow({ label, enabled, value, defaultValue, onToggle, onChange }: OptionalColorRowProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-zinc-300">{label}</label>
        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            className="accent-yellow-400"
          />
          <span className="text-xs text-zinc-400">customise</span>
        </label>
      </div>
      {enabled && (
        <ColorRow label="" value={value || defaultValue} onChange={onChange} />
      )}
    </div>
  )
}

export default function BrandingTab({ businessId }: BrandingTabProps) {
  const [branding, setBranding] = useState<BusinessBranding | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [removeLoading, setRemoveLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form state — initialised from fetched branding or schema defaults
  const [primaryColor, setPrimaryColor] = useState(SCHEMA_DEFAULTS.primary_color)
  const [secondaryColor, setSecondaryColor] = useState('#7C3AED')
  const [accentColor, setAccentColor] = useState('#10B981')
  const [isEnabled, setIsEnabled] = useState(SCHEMA_DEFAULTS.is_enabled)
  const [useSecondary, setUseSecondary] = useState(false)
  const [useAccent, setUseAccent] = useState(false)

  const applyBrandingToForm = (b: BusinessBranding) => {
    setPrimaryColor(b.primary_color ?? SCHEMA_DEFAULTS.primary_color)
    if (b.secondary_color) { setSecondaryColor(b.secondary_color); setUseSecondary(true) }
    else { setUseSecondary(false) }
    if (b.accent_color) { setAccentColor(b.accent_color); setUseAccent(true) }
    else { setUseAccent(false) }
    setIsEnabled(b.is_enabled ?? true)
  }

  const fetchBranding = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/business/branding?bizId=${businessId}`)
      const json = await res.json()
      if (res.ok) {
        setBranding(json.branding ?? null)
        if (json.branding) applyBrandingToForm(json.branding)
      } else {
        setMsg({ type: 'error', text: json.error || 'Failed to load branding.' })
      }
    } catch {
      setMsg({ type: 'error', text: 'Network error. Please refresh.' })
    } finally {
      setLoading(false)
    }
  }, [businessId])

  useEffect(() => { startTransition(() => { fetchBranding() }) }, [fetchBranding])

  const handleSave = async () => {
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch('/api/business/branding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bizId: businessId,
          primary_color: primaryColor,
          primary_dark_color: primaryColor,
          primary_light_color: primaryColor,
          secondary_color: useSecondary ? secondaryColor : null,
          accent_color: useAccent ? accentColor : null,
          is_enabled: isEnabled,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setMsg({ type: 'error', text: json.error || 'Failed to save branding.' })
        return
      }
      setBranding(json.branding)
      setMsg({ type: 'success', text: 'Branding saved!' })
    } catch {
      setMsg({ type: 'error', text: 'Network error. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  const handleLogoUpload = async (file: File) => {
    const allowed = ['image/png', 'image/jpeg', 'image/webp']
    if (!allowed.includes(file.type)) {
      setMsg({ type: 'error', text: 'Only PNG, JPEG or WebP images are allowed.' })
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setMsg({ type: 'error', text: 'Image must be under 2 MB.' })
      return
    }
    setUploadLoading(true)
    setMsg(null)
    const form = new FormData()
    form.append('bizId', businessId)
    form.append('file', file)
    try {
      const res = await fetch('/api/business/branding', { method: 'POST', body: form })
      const json = await res.json()
      if (!res.ok) {
        setMsg({ type: 'error', text: json.error || 'Upload failed.' })
        return
      }
      setBranding(json.branding)
      setMsg({ type: 'success', text: 'Logo uploaded!' })
    } catch {
      setMsg({ type: 'error', text: 'Network error during upload.' })
    } finally {
      setUploadLoading(false)
    }
  }

  const handleLogoRemove = async () => {
    setRemoveLoading(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/business/branding?bizId=${businessId}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) {
        setMsg({ type: 'error', text: json.error || 'Failed to remove logo.' })
        return
      }
      setBranding((prev) => (prev ? { ...prev, logo_path: null } : null))
      setMsg({ type: 'success', text: 'Logo removed.' })
    } catch {
      setMsg({ type: 'error', text: 'Network error.' })
    } finally {
      setRemoveLoading(false)
    }
  }

  const handleReset = async () => {
    setSaving(true)
    setMsg(null)
    setPrimaryColor(SCHEMA_DEFAULTS.primary_color)
    setSecondaryColor('#7C3AED')
    setAccentColor('#10B981')
    setIsEnabled(true)
    setUseSecondary(false)
    setUseAccent(false)
    try {
      const res = await fetch('/api/business/branding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bizId: businessId,
          ...SCHEMA_DEFAULTS,
        }),
      })
      const json = await res.json()
      if (res.ok) {
        setBranding(json.branding)
        setMsg({ type: 'success', text: 'Branding reset to defaults.' })
      } else {
        setMsg({ type: 'error', text: json.error || 'Reset failed.' })
      }
    } catch {
      setMsg({ type: 'error', text: 'Network error.' })
    } finally {
      setSaving(false)
    }
  }

  const logoUrl = buildLogoUrl(branding?.logo_path)

  if (loading) {
    return (
      <div className="max-w-2xl space-y-4">
        <div className="h-20 bg-zinc-800 rounded-2xl animate-pulse" />
        <div className="h-40 bg-zinc-800 rounded-2xl animate-pulse" />
        <div className="h-56 bg-zinc-800 rounded-2xl animate-pulse" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Enable / disable */}
      <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
        <Toggle
          checked={isEnabled}
          onChange={setIsEnabled}
          label="Enable Custom Branding"
          description="Apply your brand colours and logo on customer-facing pages"
          badge="Pro"
          badgeColor="purple"
        />
      </div>

      {/* Logo */}
      <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 space-y-4">
        <div>
          <h3 className="font-bold text-white">Business Logo</h3>
          <p className="text-xs text-zinc-400 mt-0.5">PNG, JPEG or WebP — max 2 MB</p>
        </div>

        {logoUrl && (
          <div className="flex items-start gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl}
              alt="Business logo"
              className="h-20 w-20 object-contain rounded-xl border border-zinc-700 bg-zinc-800 p-2"
            />
            <Button
              variant="outline"
              size="sm"
              loading={removeLoading}
              onClick={handleLogoRemove}
            >
              Remove
            </Button>
          </div>
        )}

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleLogoUpload(file)
              // reset so the same file can be re-selected after removal
              e.target.value = ''
            }}
          />
          <Button
            variant="outline"
            loading={uploadLoading}
            onClick={() => fileInputRef.current?.click()}
          >
            {logoUrl ? 'Replace logo' : 'Upload logo'}
          </Button>
        </div>
      </div>

      {/* Colours */}
      <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 space-y-5">
        <h3 className="font-bold text-white">Brand Colours</h3>

        <ColorRow
          label="Primary colour"
          value={primaryColor}
          onChange={setPrimaryColor}
        />

        <OptionalColorRow
          label="Secondary colour"
          enabled={useSecondary}
          value={secondaryColor}
          defaultValue="#7C3AED"
          onToggle={(on) => {
            setUseSecondary(on)
            if (on && !secondaryColor) setSecondaryColor('#7C3AED')
          }}
          onChange={setSecondaryColor}
        />

        <OptionalColorRow
          label="Accent colour"
          enabled={useAccent}
          value={accentColor}
          defaultValue="#10B981"
          onToggle={(on) => {
            setUseAccent(on)
            if (on && !accentColor) setAccentColor('#10B981')
          }}
          onChange={setAccentColor}
        />
      </div>

      {msg && <Alert type={msg.type} message={msg.text} />}

      <div className="flex gap-3">
        <Button onClick={handleSave} loading={saving} className="flex-1">
          Save branding
        </Button>
        <Button variant="outline" onClick={handleReset} disabled={saving || uploadLoading}>
          Reset to defaults
        </Button>
      </div>
    </div>
  )
}
