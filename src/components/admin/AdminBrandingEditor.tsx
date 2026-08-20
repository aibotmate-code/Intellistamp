'use client'

import React, { useState, useEffect, useRef } from 'react'
import type { Business, BusinessBranding } from '@/types'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'
import StampCard from '@/components/customer/StampCard'
import { Check, UploadSimple, Trash, ArrowCounterClockwise, Eye } from '@phosphor-icons/react'
import { isValidHexColor } from '@/lib/branding/validation'
import { cn } from '@/lib/utils'

const normalizeHexColor = (c: string) => (c.startsWith('#') ? c : `#${c}`).slice(0, 7)

interface AdminBrandingEditorProps {
  business: Business
}

interface ColorControlProps {
  label: string
  description?: string
  value: string
  fallbackValue?: string
  onChange: (val: string) => void
  allowClear?: boolean
}

function ColorControl({
  label,
  description,
  value,
  fallbackValue = '#18181B',
  onChange,
  allowClear = false,
}: ColorControlProps) {
  const displayColor = value && isValidHexColor(value) ? value : fallbackValue

  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-zinc-800/50 last:border-0">
      <div className="min-w-0">
        <label className="block text-xs font-medium text-zinc-200">{label}</label>
        {description && <p className="text-[11px] text-zinc-400 mt-0.5">{description}</p>}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Color picker swatch button */}
        <div className="relative w-8 h-8 rounded-md border border-zinc-700 overflow-hidden shadow-xs shrink-0 cursor-pointer group">
          <div
            className="w-full h-full"
            style={{ background: displayColor }}
          />
          <input
            type="color"
            value={isValidHexColor(displayColor) ? normalizeHexColor(displayColor) : '#F59E0B'}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            title={`Pick ${label}`}
          />
        </div>

        {/* Hex Text input */}
        <input
          type="text"
          value={value}
          placeholder={fallbackValue}
          onChange={(e) => onChange(e.target.value.trim())}
          maxLength={7}
          className="w-24 px-2 py-1 text-xs font-mono bg-zinc-900 border border-zinc-700 rounded-md text-zinc-100 placeholder-zinc-500 focus:outline-hidden focus:border-zinc-500"
        />

        {allowClear && value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-zinc-500 hover:text-zinc-300 text-xs p-1"
            title="Reset to default resolver"
          >
            &times;
          </button>
        )}
      </div>
    </div>
  )
}

export default function AdminBrandingEditor({ business }: AdminBrandingEditorProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Form State
  const [isEnabled, setIsEnabled] = useState(true)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)

  // Primary & Standard Brand Colors
  const [primaryColor, setPrimaryColor] = useState('#F59E0B')
  const [primaryDarkColor, setPrimaryDarkColor] = useState('#D97706')
  const [primaryLightColor, setPrimaryLightColor] = useState('#FEF3C7')
  const [textOnPrimary, setTextOnPrimary] = useState('#09090B')
  const [secondaryColor, setSecondaryColor] = useState('')
  const [accentColor, setAccentColor] = useState('')

  // Card Surfaces & Semantic Loyalty Punch Colors
  const [surfaceColor, setSurfaceColor] = useState('#18181B')
  const [backgroundColor, setBackgroundColor] = useState('#09090B')
  const [cardTextColor, setCardTextColor] = useState('#F5F5F5')
  const [cardMutedTextColor, setCardMutedTextColor] = useState('#A1A1AA')
  const [emptyStampColor, setEmptyStampColor] = useState('#27272A')
  const [emptyStampBorderColor, setEmptyStampBorderColor] = useState('#3F3F46')

  // Preview interactive controls
  const [previewStamps, setPreviewStamps] = useState(2)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load existing branding
  useEffect(() => {
    let active = true
    const loadBranding = async () => {
      setLoading(true)
      setErrorMsg('')
      try {
        const res = await fetch(`/api/admin/business/${business.id}/branding`, { cache: 'no-store' })
        if (!res.ok) {
          throw new Error('Failed to load branding data')
        }
        const data = await res.json()
        if (!active) return
        if (data.branding) {
          const b = data.branding
          setIsEnabled(b.is_enabled !== false)
          setLogoPreview(b.logo_url ?? null)
          if (b.primary_color) setPrimaryColor(b.primary_color)
          if (b.primary_dark_color) setPrimaryDarkColor(b.primary_dark_color)
          if (b.primary_light_color) setPrimaryLightColor(b.primary_light_color)
          if (b.text_on_primary) setTextOnPrimary(b.text_on_primary)
          if (b.secondary_color) setSecondaryColor(b.secondary_color)
          if (b.accent_color) setAccentColor(b.accent_color)
          if (b.surface_color) setSurfaceColor(b.surface_color)
          if (b.background_color) setBackgroundColor(b.background_color)
          if (b.card_text_color) setCardTextColor(b.card_text_color)
          if (b.card_muted_text_color) setCardMutedTextColor(b.card_muted_text_color)
          if (b.empty_stamp_color) setEmptyStampColor(b.empty_stamp_color)
          if (b.empty_stamp_border_color) setEmptyStampBorderColor(b.empty_stamp_border_color)
        }
      } catch (err) {
        if (active) {
          setErrorMsg(err instanceof Error ? err.message : 'Failed to load branding')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadBranding()
    return () => { active = false }
  }, [business.id])

  // Handle Logo selection
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg('Logo file exceeds 2 MB limit')
      return
    }

    setLogoFile(file)
    const reader = new FileReader()
    reader.onload = () => {
      setLogoPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  // Handle Remove Logo
  const handleRemoveLogo = async () => {
    setErrorMsg('')
    setSuccessMsg('')
    setLogoFile(null)
    setLogoPreview(null)

    try {
      const res = await fetch(`/api/admin/business/${business.id}/branding?action=remove-logo`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const err = await res.json()
        setErrorMsg(err.error || 'Failed to remove logo')
        return
      }
      setSuccessMsg('Logo removed successfully')
    } catch {
      setErrorMsg('Network error while removing logo')
    }
  }

  // Handle Reset to Defaults
  const handleResetDefaults = async () => {
    if (!confirm('Reset all co-branding for this business to default IntelliStamp styling?')) return

    setErrorMsg('')
    setSuccessMsg('')
    try {
      const res = await fetch(`/api/admin/business/${business.id}/branding?action=reset-branding`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const err = await res.json()
        setErrorMsg(err.error || 'Failed to reset branding')
        return
      }

      setIsEnabled(true)
      setLogoPreview(null)
      setLogoFile(null)
      setPrimaryColor('#F59E0B')
      setPrimaryDarkColor('#D97706')
      setPrimaryLightColor('#FEF3C7')
      setTextOnPrimary('#09090B')
      setSecondaryColor('')
      setAccentColor('')
      setSurfaceColor('#18181B')
      setBackgroundColor('#09090B')
      setCardTextColor('#F5F5F5')
      setCardMutedTextColor('#A1A1AA')
      setEmptyStampColor('#27272A')
      setEmptyStampBorderColor('#3F3F46')

      setSuccessMsg('Branding reset to platform defaults')
    } catch {
      setErrorMsg('Network error while resetting branding')
    }
  }

  // Handle Save
  const handleSave = async () => {
    setErrorMsg('')
    setSuccessMsg('')

    if (!isValidHexColor(primaryColor)) {
      setErrorMsg('Primary color must be a valid hex format (e.g. #F59E0B)')
      return
    }

    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('business_id', business.id)
      fd.append('is_enabled', String(isEnabled))
      fd.append('primary_color', primaryColor)
      fd.append('primary_dark_color', primaryDarkColor || primaryColor)
      fd.append('primary_light_color', primaryLightColor || primaryColor)
      fd.append('text_on_primary', textOnPrimary || '#09090B')

      if (secondaryColor) fd.append('secondary_color', secondaryColor)
      if (accentColor) fd.append('accent_color', accentColor)
      if (surfaceColor) fd.append('surface_color', surfaceColor)
      if (backgroundColor) fd.append('background_color', backgroundColor)
      if (cardTextColor) fd.append('card_text_color', cardTextColor)
      if (cardMutedTextColor) fd.append('card_muted_text_color', cardMutedTextColor)
      if (emptyStampColor) fd.append('empty_stamp_color', emptyStampColor)
      if (emptyStampBorderColor) fd.append('empty_stamp_border_color', emptyStampBorderColor)

      if (logoFile) {
        fd.append('logo', logoFile)
      }

      const res = await fetch(`/api/admin/business/${business.id}/branding`, {
        method: 'POST',
        body: fd,
      })

      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to save branding')
        return
      }

      if (data.branding?.logo_url) {
        setLogoPreview(data.branding.logo_url)
      }
      setLogoFile(null)
      setSuccessMsg('Branding saved successfully! Customer loyalty card updated.')
    } catch {
      setErrorMsg('Network error. Failed to save branding.')
    } finally {
      setSaving(false)
    }
  }

  // Live branding object for the real StampCard preview
  const liveBranding: BusinessBranding = {
    business_id: business.id,
    logo_url: logoPreview,
    primary_color: primaryColor,
    primary_dark_color: primaryDarkColor || primaryColor,
    primary_light_color: primaryLightColor || primaryColor,
    text_on_primary: textOnPrimary || '#09090B',
    secondary_color: secondaryColor || null,
    accent_color: accentColor || null,
    surface_color: surfaceColor || null,
    background_color: backgroundColor || null,
    card_text_color: cardTextColor || null,
    card_muted_text_color: cardMutedTextColor || null,
    empty_stamp_color: emptyStampColor || null,
    empty_stamp_border_color: emptyStampBorderColor || null,
    is_enabled: isEnabled,
  }

  return (
    <div className="space-y-6">
      {errorMsg && <Alert type="error" message={errorMsg} />}
      {successMsg && <Alert type="success" message={successMsg} />}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Admin Branding Controls (7 cols) */}
        <div className="lg:col-span-7 bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 space-y-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
            <div>
              <h2 className="text-base font-semibold text-zinc-100">Co-Branding Settings</h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Admin controls for customer-facing loyalty card styling
              </p>
            </div>
            <label className="flex items-center gap-2 text-xs text-zinc-300 font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={(e) => setIsEnabled(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-amber-500 focus:ring-amber-500/20"
              />
              <span>Co-Branding Active</span>
            </label>
          </div>

          {/* Logo Section */}
          <div className="space-y-3 pb-4 border-b border-zinc-800">
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Merchant Logo
            </label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg border border-zinc-700 bg-zinc-950 flex items-center justify-center overflow-hidden shrink-0">
                {logoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoPreview} alt="Logo Preview" className="max-w-full max-h-full object-contain" />
                ) : (
                  <span className="text-2xl">{business.emoji || '☕'}</span>
                )}
              </div>

              <div className="space-y-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleLogoChange}
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                />
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 text-xs"
                  >
                    <UploadSimple size={14} />
                    <span>Upload Logo</span>
                  </Button>

                  {logoPreview && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleRemoveLogo}
                      className="text-rose-400 hover:text-rose-300 border-zinc-800 flex items-center gap-1.5 text-xs"
                    >
                      <Trash size={14} />
                      <span>Remove</span>
                    </Button>
                  )}
                </div>
                <p className="text-[11px] text-zinc-500">PNG, JPG, WebP up to 2MB. Transparent background recommended.</p>
              </div>
            </div>
          </div>

          {/* Primary & Punch Colors */}
          <div className="space-y-1 pb-4 border-b border-zinc-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
              Primary &amp; Stamp Punch
            </h3>

            <ColorControl
              label="Primary Brand Color"
              description="Filled stamps, primary CTAs, and milestone accents"
              value={primaryColor}
              onChange={(val) => {
                setPrimaryColor(val)
                if (val && isValidHexColor(val)) {
                  setPrimaryDarkColor(val)
                  setPrimaryLightColor(val)
                }
              }}
            />

            <ColorControl
              label="Text on Primary"
              description="Checkmark icon and text on filled stamps"
              value={textOnPrimary}
              fallbackValue="#09090B"
              onChange={setTextOnPrimary}
            />

            <ColorControl
              label="Empty Stamp Background"
              description="Unfilled circular slot background"
              value={emptyStampColor}
              fallbackValue="#27272A"
              onChange={setEmptyStampColor}
              allowClear
            />

            <ColorControl
              label="Empty Stamp Border"
              description="Border ring on unfilled slots"
              value={emptyStampBorderColor}
              fallbackValue="#3F3F46"
              onChange={setEmptyStampBorderColor}
              allowClear
            />
          </div>

          {/* Card Surface & Typography */}
          <div className="space-y-1 pb-4 border-b border-zinc-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
              Card Surface &amp; Text
            </h3>

            <ColorControl
              label="Card Surface (Background)"
              description="Main background container of the loyalty card"
              value={surfaceColor}
              fallbackValue="#18181B"
              onChange={setSurfaceColor}
              allowClear
            />

            <ColorControl
              label="Card Text Color"
              description="Merchant name and visit heading typography"
              value={cardTextColor}
              fallbackValue="#F5F5F5"
              onChange={setCardTextColor}
              allowClear
            />

            <ColorControl
              label="Muted Text Color"
              description="Reward subtitle, visits remaining, and metadata"
              value={cardMutedTextColor}
              fallbackValue="#A1A1AA"
              onChange={setCardMutedTextColor}
              allowClear
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetDefaults}
              className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5 text-xs"
            >
              <ArrowCounterClockwise size={14} />
              <span>Reset Defaults</span>
            </Button>

            <Button
              type="button"
              size="sm"
              loading={saving}
              disabled={saving || loading}
              onClick={handleSave}
              className="flex items-center gap-1.5"
            >
              <Check size={16} weight="bold" />
              <span>Save Branding</span>
            </Button>
          </div>
        </div>

        {/* Right Column: Live Customer Loyalty Card Preview (5 cols) */}
        <div className="lg:col-span-5 sticky top-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
              <Eye size={15} className="text-amber-500" />
              <span>Live Customer Card Preview</span>
            </div>
            {/* Stamp count toggle for preview */}
            <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-md border border-zinc-800 text-[11px]">
              <button
                type="button"
                onClick={() => setPreviewStamps(1)}
                className={cn(
                  'px-2 py-0.5 rounded cursor-pointer transition-colors',
                  previewStamps === 1 ? 'bg-zinc-800 text-zinc-100 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
                )}
              >
                1 stamp
              </button>
              <button
                type="button"
                onClick={() => setPreviewStamps(Math.max(2, Math.floor((business.stamps_required || 6) / 2)))}
                className={cn(
                  'px-2 py-0.5 rounded cursor-pointer transition-colors',
                  previewStamps !== 1 && previewStamps < (business.stamps_required || 6) ? 'bg-zinc-800 text-zinc-100 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
                )}
              >
                Mid
              </button>
              <button
                type="button"
                onClick={() => setPreviewStamps(business.stamps_required || 6)}
                className={cn(
                  'px-2 py-0.5 rounded cursor-pointer transition-colors',
                  previewStamps === (business.stamps_required || 6) ? 'bg-zinc-800 text-zinc-100 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
                )}
              >
                Full (Claim)
              </button>
            </div>
          </div>

          <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 shadow-sm is-dot-grid">
            <StampCard
              stampsRequired={business.stamps_required || 6}
              cardStamps={previewStamps}
              businessName={business.name}
              businessEmoji={business.emoji}
              reward={business.reward}
              redeemable={previewStamps >= (business.stamps_required || 6)}
              businessBranding={liveBranding}
              totalVisits={previewStamps}
            />
          </div>

          <p className="text-[11px] text-zinc-500 text-center">
            This preview uses the exact production <code className="text-zinc-400 font-mono">StampCard</code> component with your live co-branding values.
          </p>
        </div>
      </div>
    </div>
  )
}
