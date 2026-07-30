'use client'

import { startTransition, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { createBrowserClient } from '@supabase/auth-helpers-nextjs'
import StatsCard from '@/components/business/StatsCard'
import CustomerTable from '@/components/business/CustomerTable'
import CustomerLookup from '@/components/business/CustomerLookup'
import FeatureToggles from '@/components/business/FeatureToggles'
import RewardsTab from '@/components/business/RewardsTab'
import BrandingTab from '@/components/business/BrandingTab'
import Spinner from '@/components/ui/Spinner'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'
import Input from '@/components/ui/Input'
import type { Business, Customer, BusinessCustomer, Milestone } from '@/types'

const QRDisplay = dynamic(() => import('@/components/business/QRDisplay'), { ssr: false })
const KioskMode = dynamic(() => import('@/components/business/KioskMode'), { ssr: false })

type Tab = 'qr' | 'customers' | 'rewards' | 'campaigns' | 'settings' | 'branding'

interface CustomerRow extends BusinessCustomer {
  customer: Customer
  total_stamps: number
  card_stamps: number
  can_stamp: boolean
  cooldown_hours?: number
  last_stamp?: string
}

interface DashboardData {
  business: Business
  stats: { total_customers: number; total_stamps: number; rewards_redeemed: number }
  customers: CustomerRow[]
}

const PAGE_LOAD_TS = Date.now()

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<DashboardData | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('qr')
  const [kioskMode, setKioskMode] = useState(false)
  const [error, setError] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')

  // Rewards tab state
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [milestonesLoaded, setMilestonesLoaded] = useState(false)

  // Campaign state
  const [campaignAudience, setCampaignAudience] = useState<'all' | 'inactive' | 'near_reward'>('all')
  const [campaignMessage, setCampaignMessage] = useState('')
  const [campaignLoading, setCampaignLoading] = useState(false)
  const [campaignResult, setCampaignResult] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  // GMB link edit state
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [gmbInput, setGmbInput] = useState('')
  const [gmbSaving, setGmbSaving] = useState(false)
  const [gmbError, setGmbError] = useState('')
  const [gmbSaved, setGmbSaved] = useState(false)

  const fetchData = useCallback(async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }
    setOwnerEmail(session.user.email ?? '')
    try {
      const res = await fetch(`/api/business/get?ownerId=${session.user.id}`)
      const json = await res.json()
      if (!res.ok) {
        if (res.status === 404) {
          router.push('/onboarding')
          return
        }
        setError(json.error || 'Failed to load dashboard')
        setLoading(false)
        return
      }
      setData({
        business: json.business,
        stats: json.stats,
        customers: json.customers,
      })
    } catch {
      setError('Network error. Please refresh.')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    startTransition(() => { fetchData() })
  }, [fetchData])

  // Lazy-load milestones when Rewards tab is first opened
  useEffect(() => {
    if (activeTab !== 'rewards' || milestonesLoaded || !data) return
    fetch(`/api/milestones/${data.business.id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.milestones) setMilestones(json.milestones)
      })
      .catch(() => {})
      .finally(() => setMilestonesLoaded(true))
  }, [activeTab, milestonesLoaded, data])

  const handleSaveToggles = async (updates: Partial<Business>) => {
    if (!data) return
    try {
      await fetch('/api/business/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: data.business.id, ...updates }),
      })
      setData((prev) => prev ? { ...prev, business: { ...prev.business, ...updates } } : prev)
    } catch {
      // silent
    }
  }

  const handleRewardsSave = (updatedBusiness: Business, updatedMilestones: Milestone[]) => {
    setData((prev) => prev ? { ...prev, business: updatedBusiness } : prev)
    setMilestones(updatedMilestones)
  }

  const handleExport = async () => {
    if (!data) return
    try {
      const res = await fetch(`/api/business/export-customers?bizId=${data.business.id}`)
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const date = new Date().toISOString().split('T')[0]
      a.href = url
      a.download = `${data.business.slug || data.business.id.slice(0, 8)}-customers-${date}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      // silent fail — no external state to show
    }
  }

  const handleSendCampaign = async () => {
    if (!data || !campaignMessage.trim()) return
    setCampaignLoading(true)
    setCampaignResult(null)
    try {
      const res = await fetch('/api/campaign/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: data.business.id,
          message: campaignMessage,
          audience: campaignAudience,
        }),
      })
      const json = await res.json()
      if (res.ok) {
        setCampaignResult({ type: 'success', msg: `Campaign sent to ${json.total_sent} customers!` })
        setCampaignMessage('')
      } else {
        setCampaignResult({ type: 'error', msg: json.error || 'Failed to send' })
      }
    } catch {
      setCampaignResult({ type: 'error', msg: 'Network error' })
    } finally {
      setCampaignLoading(false)
    }
  }

  const handleLogout = async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Alert type="error" message={error || 'Failed to load'} />
          <Button onClick={() => router.push('/onboarding')}>Setup New Business</Button>
        </div>
      </div>
    )
  }

  const { business, stats, customers } = data

  const optedInCount = customers.filter((c) => c.customer?.whatsapp_optin).length
  const nearRewardCount = customers.filter((c) => {
    const remaining = business.stamps_required - c.card_stamps
    return remaining <= 2 && remaining > 0
  }).length
  const inactiveCount = customers.filter((c) => {
    if (!c.last_stamp) return true
    return new Date(c.last_stamp).getTime() < PAGE_LOAD_TS - 30 * 24 * 60 * 60 * 1000
  }).length

  const audienceCounts = {
    all: optedInCount,
    inactive: inactiveCount,
    near_reward: nearRewardCount,
  }

  const previewMessage = campaignMessage.replace('{name}', 'Rahul')

  return (
    <div className="min-h-screen bg-zinc-950">
      {kioskMode && (
        <KioskMode
          bizId={business.id}
          businessName={business.name}
          businessEmoji={business.emoji}
          onExit={() => setKioskMode(false)}
        />
      )}

      {/* Topbar */}
      <header className="border-b border-zinc-800 bg-zinc-950 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏷️</span>
            <span className="font-black text-white">IntelliStamp</span>
            <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded font-medium">Business</span>
          </div>
          {ownerEmail && (
            <span className="hidden sm:block text-xs text-zinc-500">{ownerEmail}</span>
          )}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setKioskMode(true)}
              className="hidden sm:flex"
            >
              ⛶ Kiosk Mode
            </Button>
            <button
              onClick={() => setKioskMode(true)}
              className="sm:hidden text-zinc-400 hover:text-white px-3 py-1.5 text-lg"
            >
              ⛶
            </button>
            <Button variant="ghost" size="sm" onClick={() => setActiveTab('settings')}>
              Settings
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Business header */}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl">{business.emoji}</span>
          <div>
            <h1 className="text-xl font-black text-white">{business.name}</h1>
            <p className="text-sm text-zinc-400">{business.category}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatsCard icon="👥" label="Total Customers" value={stats.total_customers} />
          <StatsCard icon="🔖" label="Stamps Issued" value={stats.total_stamps} />
          <StatsCard icon="🎁" label="Rewards Redeemed" value={stats.rewards_redeemed} />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-zinc-800 mb-6 overflow-x-auto">
          {([
            { id: 'qr' as Tab,        label: 'QR Stamper' },
            { id: 'customers' as Tab, label: `Customers (${customers.length})` },
            { id: 'rewards' as Tab,   label: 'Rewards' },
            { id: 'campaigns' as Tab, label: 'Campaigns' },
            { id: 'settings' as Tab,  label: 'Settings' },
            ...(process.env.NEXT_PUBLIC_TENANT_BRANDING_ENABLED === 'true'
              ? [{ id: 'branding' as Tab, label: '🎨 Branding' }]
              : []),
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-yellow-400 text-yellow-400'
                  : 'border-transparent text-zinc-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab: QR Stamper */}
        {activeTab === 'qr' && (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Left: Customer Display */}
            <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1">
                CUSTOMER SCANS THIS
              </p>
              <p className="text-xs text-zinc-500 mb-6">Keep this screen visible at your counter</p>

              <div className="flex flex-col items-center">
                <QRDisplay bizId={business.id} size={200} showToken={true} />
              </div>

              <div className="mt-6">
                <Button
                  onClick={() => setKioskMode(true)}
                  variant="outline"
                  className="w-full"
                >
                  ⛶ Enter Kiosk Mode
                </Button>
              </div>
            </div>

            {/* Right: Staff Validator */}
            <div>
              {!business.staff_pin_enabled ? (
                <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 h-full flex flex-col items-center justify-center text-center gap-3 py-8">
                  <div className="text-4xl">⚡</div>
                  <h3 className="font-bold text-white">Smart Mode Active</h3>
                  <p className="text-sm text-zinc-400">
                    Customers stamp themselves by scanning the QR
                  </p>
                  <p className="text-xs text-zinc-500">
                    Enable Staff PIN in Settings for manual stamp issuing
                  </p>
                </div>
              ) : (
                <CustomerLookup
                  businessId={business.id}
                  stampsRequired={business.stamps_required}
                  onStamped={fetchData}
                />
              )}
            </div>
          </div>
        )}

        {/* Tab: Customers */}
        {activeTab === 'customers' && (
          <div className="space-y-6">
            <CustomerLookup
              businessId={business.id}
              stampsRequired={business.stamps_required}
              onStamped={fetchData}
            />
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-zinc-400">
                  {customers.length} customer{customers.length !== 1 ? 's' : ''} enrolled
                </p>
                <Button size="sm" variant="secondary" onClick={handleExport}>
                  ⬇ Export Customers
                </Button>
              </div>
              <CustomerTable customers={customers} stampsRequired={business.stamps_required} />
            </div>
          </div>
        )}

        {/* Tab: Rewards */}
        {activeTab === 'rewards' && (
          <RewardsTab
            business={business}
            milestones={milestones}
            onSave={handleRewardsSave}
          />
        )}

        {/* Tab: Campaigns */}
        {activeTab === 'campaigns' && (
          <div className="max-w-2xl space-y-6">
            <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 space-y-4">
              <h3 className="font-bold text-white">Send Campaign</h3>

              {/* Audience */}
              <div>
                <p className="text-sm font-medium text-zinc-300 mb-2">Audience</p>
                <div className="space-y-2">
                  {([
                    { id: 'all' as const, label: 'All opted-in customers', count: audienceCounts.all },
                    { id: 'near_reward' as const, label: 'Near reward — 1-2 stamps away', count: audienceCounts.near_reward },
                    { id: 'inactive' as const, label: 'Inactive 30+ days', count: audienceCounts.inactive },
                  ]).map((opt) => (
                    <label
                      key={opt.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                        campaignAudience === opt.id
                          ? 'border-yellow-400 bg-yellow-400/5'
                          : 'border-zinc-700 hover:border-zinc-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name="audience"
                        value={opt.id}
                        checked={campaignAudience === opt.id}
                        onChange={() => setCampaignAudience(opt.id)}
                        className="accent-yellow-400"
                      />
                      <span className="text-sm text-white flex-1">{opt.label}</span>
                      <span className="text-sm font-bold text-yellow-400">{opt.count}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-sm font-medium text-zinc-300">Message</p>
                  <span className="text-xs text-zinc-500">{campaignMessage.length}/160</span>
                </div>
                <textarea
                  value={campaignMessage}
                  onChange={(e) => setCampaignMessage(e.target.value)}
                  placeholder="Hi {name}! ..."
                  maxLength={160}
                  rows={4}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/50 resize-none"
                />
                <p className="text-xs text-zinc-500 mt-1">Use {'{name}'} for personalisation</p>
              </div>

              {/* Preview */}
              {campaignMessage && (
                <div className="bg-zinc-800 rounded-lg p-3">
                  <p className="text-xs text-zinc-400 mb-1">Preview</p>
                  <p className="text-sm text-white">{previewMessage}</p>
                </div>
              )}

              {campaignResult && (
                <Alert type={campaignResult.type} message={campaignResult.msg} />
              )}

              <Button
                onClick={handleSendCampaign}
                loading={campaignLoading}
                disabled={audienceCounts[campaignAudience] === 0 || !campaignMessage.trim()}
                className="w-full"
              >
                Send Campaign
              </Button>

              <p className="text-xs text-zinc-500 text-center">
                ~₹{(audienceCounts[campaignAudience] * 0.5).toFixed(2)} ({audienceCounts[campaignAudience]} messages × ₹0.50)
              </p>
            </div>
          </div>
        )}

        {/* Tab: Branding */}
        {activeTab === 'branding' && process.env.NEXT_PUBLIC_TENANT_BRANDING_ENABLED === 'true' && (
          <BrandingTab businessId={business.id} />
        )}

        {/* Tab: Settings */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl space-y-6">
            {/* Business Info */}
            <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
              <h3 className="font-bold text-white mb-4">Business Info</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Name</span>
                  <span className="text-white font-medium">{business.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Category</span>
                  <span className="text-white">{business.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Stamps Required</span>
                  <span className="text-white">{business.stamps_required}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Reward</span>
                  <span className="text-white">{business.reward}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Staff PIN</span>
                  <span className="text-white">••••</span>
                </div>
              </div>

              {/* Google Review Link */}
              <div className="mt-5 pt-5 border-t border-zinc-800">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-white">Google Review Link</p>
                    <p className="text-xs text-zinc-500">Customers get a bonus stamp for leaving a review</p>
                  </div>
                  <button
                    onClick={() => {
                      setGmbInput(business.gmb_link ?? '')
                      setGmbError('')
                      setGmbSaved(false)
                      setEditModalOpen(true)
                    }}
                    className="text-xs text-yellow-400 hover:text-yellow-300"
                  >
                    {business.gmb_link ? 'Edit' : 'Set up →'}
                  </button>
                </div>
                {business.gmb_link ? (
                  <p className="text-xs text-green-400">✓ Set — review prompt active in kiosk</p>
                ) : (
                  <p className="text-xs text-zinc-600">Not set — review prompt hidden in kiosk</p>
                )}
              </div>
            </div>

            <FeatureToggles business={business} onSave={handleSaveToggles} />
          </div>
        )}
      </div>

      {/* GMB Link Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 w-full max-w-sm space-y-4">
            <h3 className="font-bold text-white">Google Review Link</h3>
            <p className="text-sm text-zinc-400">
              Paste your Google Maps review link. Customers in kiosk mode will be offered a bonus stamp for leaving a review.
            </p>
            <Input
              label="Google Review URL"
              placeholder="https://g.page/r/..."
              value={gmbInput}
              onChange={(e) => { setGmbInput(e.target.value); setGmbError(''); setGmbSaved(false) }}
            />
            {gmbError && <p className="text-sm text-red-400">{gmbError}</p>}
            {gmbSaved && <p className="text-sm text-green-400">✓ Saved successfully</p>}
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setEditModalOpen(false)}
              >
                {gmbSaved ? 'Close' : 'Cancel'}
              </Button>
              <Button
                className="flex-1"
                loading={gmbSaving}
                onClick={async () => {
                  if (gmbInput && !/^https?:\/\/.+/.test(gmbInput)) {
                    setGmbError('Enter a valid URL starting with https://')
                    return
                  }
                  setGmbSaving(true)
                  setGmbError('')
                  try {
                    const res = await fetch('/api/business/update', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ id: data!.business.id, gmb_link: gmbInput || '' }),
                    })
                    if (res.ok) {
                      const json = await res.json()
                      setData((prev) => prev ? { ...prev, business: json.business } : prev)
                      setGmbSaved(true)
                    } else {
                      setGmbError('Failed to save. Try again.')
                    }
                  } catch {
                    setGmbError('Network error.')
                  } finally {
                    setGmbSaving(false)
                  }
                }}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
