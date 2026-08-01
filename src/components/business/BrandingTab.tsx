'use client'

import React, { useState, useEffect, useRef } from 'react'
import type { Business, BusinessBranding } from '@/types'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Alert from '@/components/ui/Alert'
import StampCard from '@/components/customer/StampCard'
import BrandingWrapper from '@/components/branding/BrandingWrapper'
import { extractPaletteFromImage, ensureWcagContrast, ExtractedColors } from '@/lib/branding/palette'

interface BrandingTabProps {
  business: Business
  onUpdate: () => void
}

export default function BrandingTab({ business, onUpdate }: BrandingTabProps) {
  const isFeatureEnabled =
    process.env.NEXT_PUBLIC_TENANT_BRANDING_ENABLED === 'true'

  const [isEnabled, setIsEnabled] = useState(true)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  
  // Colors state
  const [primaryColor, setPrimaryColor] = useState('#FACC15')
  const [primaryDarkColor, setPrimaryDarkColor] = useState('#CA8A04')
  const [primaryLightColor, setPrimaryLightColor] = useState('#FEF9C3')
  const [secondaryColor, setSecondaryColor] = useState('#E2E8F0')
  const [accentColor, setAccentColor] = useState('#3B82F6')
  const [backgroundColor, setBackgroundColor] = useState('#09090B')
  const [surfaceColor, setSurfaceColor] = useState('#18181B')
  const [textOnPrimary, setTextOnPrimary] = useState('#000000')

  const [suggestedPalette, setSuggestedPalette] = useState<ExtractedColors | null>(null)
  
  // UI states
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Initialize form by fetching branding from the server on mount
  useEffect(() => {
    let active = true
    const loadBranding = async () => {
      if (!business?.id) return
      setLoading(true)
      setErrorMsg('')
      try {
        const res = await fetch(`/api/business/branding?businessId=${business.id}`, {
          cache: 'no-store'
        })
        if (!res.ok) {
          throw new Error('Failed to load branding settings')
        }
        const data = await res.json()
        if (!active) return
        if (data.branding) {
          const b = data.branding
          setIsEnabled(b.is_enabled)
          setLogoPreview(b.logo_url ?? null)
          setPrimaryColor(b.primary_color)
          setPrimaryDarkColor(b.primary_dark_color)
          setPrimaryLightColor(b.primary_light_color)
          setSecondaryColor(b.secondary_color || '#E2E8F0')
          setAccentColor(b.accent_color || '#3B82F6')
          setBackgroundColor(b.background_color || '#09090B')
          setSurfaceColor(b.surface_color || '#18181B')
          setTextOnPrimary(b.text_on_primary)
        }
      } catch (err) {
        if (active) {
          const msg = err instanceof Error ? err.message : 'Failed to load branding settings. Please try again.'
          setErrorMsg(msg)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadBranding()
    return () => {
      active = false
    }
  }, [business.id])

  if (!isFeatureEnabled) {
    return (
      <div className="p-6 text-center text-zinc-400">
        <p>Tenant co-branding features are currently disabled by the system administrator.</p>
      </div>
    )
  }

  // Handle color picker change
  const handleColorChange = (key: string, val: string) => {
    // Basic hex color validation and normalization to upper case
    const normalized = val.toUpperCase()
    if (key === 'primary') {
      setPrimaryColor(normalized)
      // Automatically suggest text_on_primary when primary changes
      const { textHex } = ensureWcagContrast(normalized)
      setTextOnPrimary(textHex)
    }
    else if (key === 'primaryDark') setPrimaryDarkColor(normalized)
    else if (key === 'primaryLight') setPrimaryLightColor(normalized)
    else if (key === 'secondary') setSecondaryColor(normalized)
    else if (key === 'accent') setAccentColor(normalized)
    else if (key === 'bg') setBackgroundColor(normalized)
    else if (key === 'surface') setSurfaceColor(normalized)
    else if (key === 'text') setTextOnPrimary(normalized)
  }

  // Process image for palette extraction
  const processImageFile = (file: File) => {
    setLogoFile(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      setLogoPreview(dataUrl)

      // Create an image element to extract color palette
      const img = new Image()
      img.src = dataUrl
      img.onload = () => {
        try {
          const palette = extractPaletteFromImage(img)
          // Store suggested palette, do not auto-apply to respect manual edits
          setSuggestedPalette(palette)
          setErrorMsg('')
        } catch {
          setErrorMsg('Failed to extract color suggestions from the image.')
        }
      }
    }
    reader.readAsDataURL(file)
  }

  // Handle logo file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processImageFile(file)
  }

  // Handle drag and drop logo files
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) processImageFile(file)
  }

  // Handle clipboard paste logo files
  const handlePaste = (e: React.ClipboardEvent) => {
    const item = e.clipboardData.items[0]
    if (item && item.type.indexOf('image') === 0) {
      const file = item.getAsFile()
      if (file) processImageFile(file)
    }
  }

  // Apply suggested palette
  const applySuggestedPalette = () => {
    if (suggestedPalette) {
      setPrimaryColor(suggestedPalette.primary_color)
      setPrimaryDarkColor(suggestedPalette.primary_dark_color)
      setPrimaryLightColor(suggestedPalette.primary_light_color)
      setSecondaryColor(suggestedPalette.secondary_color)
      setAccentColor(suggestedPalette.accent_color)
      setTextOnPrimary(suggestedPalette.text_on_primary)
      setSuggestedPalette(null)
    }
  }

  // Call API to remove logo
  const handleRemoveLogo = async () => {
    setErrorMsg('')
    setSuccessMsg('')
    setLoading(true)
    try {
      const res = await fetch(`/api/business/branding?businessId=${business.id}&action=remove-logo`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to remove logo')
        return
      }
      setLogoPreview(null)
      setLogoFile(null)
      setSuccessMsg('Logo removed successfully')
      onUpdate()
    } catch {
      setErrorMsg('Network error. Failed to remove logo.')
    } finally {
      setLoading(false)
    }
  }

  // Call API to reset branding row
  const handleResetBranding = async () => {
    setErrorMsg('')
    setSuccessMsg('')
    setLoading(true)
    try {
      const res = await fetch(`/api/business/branding?businessId=${business.id}&action=reset-branding`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to reset branding')
        return
      }
      // Revert states
      setIsEnabled(true)
      setLogoPreview(null)
      setLogoFile(null)
      setPrimaryColor('#FACC15')
      setPrimaryDarkColor('#CA8A04')
      setPrimaryLightColor('#FEF9C3')
      setSecondaryColor('#E2E8F0')
      setAccentColor('#3B82F6')
      setBackgroundColor('#09090B')
      setSurfaceColor('#18181B')
      setTextOnPrimary('#000000')
      setSuggestedPalette(null)
      setSuccessMsg('Branding reset successfully')
      onUpdate()
    } catch {
      setErrorMsg('Network error. Failed to reset branding.')
    } finally {
      setLoading(false)
    }
  }

  // Save branding settings
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')
    setLoading(true)

    try {
      const formData = new FormData()
      formData.append('business_id', business.id)
      formData.append('primary_color', primaryColor)
      formData.append('primary_dark_color', primaryDarkColor)
      formData.append('primary_light_color', primaryLightColor)
      formData.append('secondary_color', secondaryColor)
      formData.append('accent_color', accentColor)
      formData.append('background_color', backgroundColor)
      formData.append('surface_color', surfaceColor)
      formData.append('text_on_primary', textOnPrimary)
      formData.append('is_enabled', String(isEnabled))
      
      if (logoFile) {
        formData.append('logo', logoFile)
      }

      const res = await fetch('/api/business/branding', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to save branding settings')
        return
      }

      setSuccessMsg('Branding settings saved successfully')
      setLogoFile(null)
      onUpdate()
    } catch {
      setErrorMsg('Network error. Failed to save branding settings.')
    } finally {
      setLoading(false)
    }
  }

  // Render a mock branding object for preview
  const mockBranding: BusinessBranding = {
    id: 'mock',
    business_id: business.id,
    logo_path: null,
    logo_url: logoPreview,
    primary_color: primaryColor,
    primary_dark_color: primaryDarkColor,
    primary_light_color: primaryLightColor,
    secondary_color: secondaryColor,
    accent_color: accentColor,
    background_color: backgroundColor,
    surface_color: surfaceColor,
    text_on_primary: textOnPrimary,
    is_enabled: isEnabled,
    created_at: '',
    updated_at: '',
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 p-6 bg-zinc-950 rounded-2xl border border-zinc-900">
      
      {/* Configuration Form */}
      <form onSubmit={handleSave} className="lg:col-span-7 space-y-6" onPaste={handlePaste}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Client Co-Branding</h2>
            <p className="text-sm text-zinc-400">Customize the colors and logos for customer stamp pages</p>
          </div>
          <div className="flex items-center gap-2 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800">
            <input
              type="checkbox"
              id="is_enabled"
              checked={isEnabled}
              onChange={(e) => setIsEnabled(e.target.checked)}
              className="w-4 h-4 text-yellow-400 bg-zinc-800 border-zinc-700 rounded focus:ring-yellow-400/50"
            />
            <label htmlFor="is_enabled" className="text-sm font-medium text-zinc-300 cursor-pointer select-none">
              Enabled
            </label>
          </div>
        </div>

        {errorMsg && <Alert type="error" message={errorMsg} />}
        {successMsg && <Alert type="success" message={successMsg} />}

        {/* Logo upload block */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-zinc-300">Brand Logo</label>
          <div 
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="border-2 border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-900/50 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors relative"
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/png, image/jpeg, image/webp" 
              className="hidden" 
            />
            {logoPreview ? (
              <div className="flex flex-col items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoPreview} alt="Logo preview" className="max-h-20 object-contain rounded-lg" />
                <p className="text-xs text-zinc-500">Click or drag new image to replace. Paste image from clipboard is also supported.</p>
              </div>
            ) : (
              <div className="text-center space-y-2">
                <div className="text-4xl text-zinc-600">🖼️</div>
                <p className="text-sm text-zinc-300 font-medium">Click, paste or drag logo here</p>
                <p className="text-xs text-zinc-500">Supports PNG, JPEG, WebP. Max 2MB.</p>
              </div>
            )}
          </div>

          {logoPreview && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); void handleRemoveLogo() }}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Remove Logo
            </button>
          )}
        </div>

        {/* Color extraction suggestion card */}
        {suggestedPalette && (
          <div className="bg-yellow-400/10 border border-yellow-400/20 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-yellow-400 font-semibold">Suggested Color Palette Extracted</p>
              <button
                type="button"
                onClick={applySuggestedPalette}
                className="bg-yellow-400 text-black text-xs font-bold px-3 py-1 rounded hover:bg-yellow-300 transition-colors"
              >
                Apply Palette
              </button>
            </div>
            <div className="flex gap-2">
              <span className="w-6 h-6 rounded border border-zinc-800" style={{ background: suggestedPalette.primary_color }} title="Primary" />
              <span className="w-6 h-6 rounded border border-zinc-800" style={{ background: suggestedPalette.secondary_color }} title="Secondary" />
              <span className="w-6 h-6 rounded border border-zinc-800" style={{ background: suggestedPalette.accent_color }} title="Accent" />
              <span className="w-6 h-6 rounded border border-zinc-800" style={{ background: suggestedPalette.text_on_primary }} title="Text on Primary" />
            </div>
          </div>
        )}

        {/* Colors Inputs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400 font-semibold uppercase">Primary Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => handleColorChange('primary', e.target.value)}
                className="w-10 h-10 p-0 border-0 bg-transparent rounded cursor-pointer"
              />
              <Input
                value={primaryColor}
                onChange={(e) => handleColorChange('primary', e.target.value)}
                placeholder="#FACC15"
                maxLength={7}
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400 font-semibold uppercase">Primary Hover (Dark)</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={primaryDarkColor}
                onChange={(e) => handleColorChange('primaryDark', e.target.value)}
                className="w-10 h-10 p-0 border-0 bg-transparent rounded cursor-pointer"
              />
              <Input
                value={primaryDarkColor}
                onChange={(e) => handleColorChange('primaryDark', e.target.value)}
                placeholder="#CA8A04"
                maxLength={7}
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400 font-semibold uppercase">Primary Soft (Light)</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={primaryLightColor}
                onChange={(e) => handleColorChange('primaryLight', e.target.value)}
                className="w-10 h-10 p-0 border-0 bg-transparent rounded cursor-pointer"
              />
              <Input
                value={primaryLightColor}
                onChange={(e) => handleColorChange('primaryLight', e.target.value)}
                placeholder="#FEF9C3"
                maxLength={7}
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400 font-semibold uppercase">Text on Primary (WCAG AA Contrast)</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={textOnPrimary}
                onChange={(e) => handleColorChange('text', e.target.value)}
                className="w-10 h-10 p-0 border-0 bg-transparent rounded cursor-pointer"
              />
              <Input
                value={textOnPrimary}
                onChange={(e) => handleColorChange('text', e.target.value)}
                placeholder="#000000"
                maxLength={7}
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400 font-semibold uppercase">Secondary Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={secondaryColor}
                onChange={(e) => handleColorChange('secondary', e.target.value)}
                className="w-10 h-10 p-0 border-0 bg-transparent rounded cursor-pointer"
              />
              <Input
                value={secondaryColor}
                onChange={(e) => handleColorChange('secondary', e.target.value)}
                placeholder="#E2E8F0"
                maxLength={7}
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400 font-semibold uppercase">Accent Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => handleColorChange('accent', e.target.value)}
                className="w-10 h-10 p-0 border-0 bg-transparent rounded cursor-pointer"
              />
              <Input
                value={accentColor}
                onChange={(e) => handleColorChange('accent', e.target.value)}
                placeholder="#3B82F6"
                maxLength={7}
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400 font-semibold uppercase">Background Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={backgroundColor}
                onChange={(e) => handleColorChange('bg', e.target.value)}
                className="w-10 h-10 p-0 border-0 bg-transparent rounded cursor-pointer"
              />
              <Input
                value={backgroundColor}
                onChange={(e) => handleColorChange('bg', e.target.value)}
                placeholder="#09090B"
                maxLength={7}
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400 font-semibold uppercase">Surface Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={surfaceColor}
                onChange={(e) => handleColorChange('surface', e.target.value)}
                className="w-10 h-10 p-0 border-0 bg-transparent rounded cursor-pointer"
              />
              <Input
                value={surfaceColor}
                onChange={(e) => handleColorChange('surface', e.target.value)}
                placeholder="#18181B"
                maxLength={7}
                className="flex-1"
              />
            </div>
          </div>

        </div>

        {/* Buttons */}
        <div className="flex gap-4 pt-4 border-t border-zinc-900">
          <Button type="submit" loading={loading} className="flex-1">
            Save Changes
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleResetBranding}
            disabled={loading}
            className="flex-1"
          >
            Reset Branding
          </Button>
        </div>
      </form>

      {/* Real-time Preview Pane */}
      <div className="lg:col-span-5 flex flex-col items-center justify-start space-y-4">
        <h3 className="text-sm font-semibold text-zinc-400 uppercase self-start">Live Card Preview</h3>
        <div 
          className="w-full flex justify-center items-center p-4 rounded-2xl border min-h-[380px]"
          style={{
            background: isEnabled && backgroundColor ? backgroundColor : 'rgba(24, 24, 27, 0.3)',
            borderColor: isEnabled && surfaceColor ? surfaceColor : '#27272a',
          }}
        >
          <BrandingWrapper branding={mockBranding} className="w-full max-w-sm">
            <StampCard
              stampsRequired={business.stamps_required}
              cardStamps={Math.min(business.stamps_required - 1, 3)}
              businessName={business.name}
              businessEmoji={business.emoji}
              reward={business.reward}
              newStampIndex={undefined}
              redeemable={false}
              onClaim={() => {}}
              // Make sure to pass the mock branding configuration directly
              businessBranding={mockBranding}
            />
          </BrandingWrapper>
        </div>
        <p className="text-xs text-zinc-500 text-center">Preview simulates a card with 3 collected stamps. Text contrast matches WCAG AA rules.</p>
      </div>

    </div>
  )
}
