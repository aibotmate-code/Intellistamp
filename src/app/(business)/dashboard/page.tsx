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
import StaffPinManager from '@/components/business/StaffPinManager'
import SocialLinksSettings from '@/components/business/SocialLinksSettings'
import Spinner from '@/components/ui/Spinner'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import { Icons } from '@/config/icons'
import BusinessVisual from '@/components/branding/BusinessVisual'
import { PendingView, SuspendedView, RejectedView, ExpiredView } from '@/components/business/LifecycleViews'
import { getBusinessAccessState } from '@/lib/businessState'
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

  // PIN Manager state
  const [pinManagerOpen, setPinManagerOpen] = useState(false)
  const [pinManagerAction, setPinManagerAction] = useState<'set' | 'change'>('set')

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
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `customers-${data.business.name.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      alert('Failed to export customers. Please try again.')
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
          audience: campaignAudience,
          message: campaignMessage.trim(),
        }),
      })
      const json = await res.json()
      if (res.ok) {
        setCampaignResult({
          type: 'success',
          msg: `Campaign sent to ${json.sent_count} customer${json.sent_count !== 1 ? 's' : ''}!`,
        })
        setCampaignMessage('')
      } else {
        setCampaignResult({ type: 'error', msg: json.error || 'Failed to send campaign' })
      }
    } catch {
      setCampaignResult({ type: 'error', msg: 'Network error. Please try again.' })
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
    router.push('/')
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
        <div className="text-center space-y-4 max-w-sm w-full">
          <Alert type="error" message={error || 'Something went wrong. Please try again.'} />
          <div className="flex gap-2 justify-center">
            <Button onClick={() => window.location.reload()} variant="secondary" size="sm">Retry</Button>
            <Button onClick={() => router.push('/onboarding')} size="sm">Setup Business</Button>
          </div>
        </div>
      </div>
    )
  }

  const state = getBusinessAccessState(data.business)
  
  if (state === 'pending') {
    return <PendingView business={data.business} onRefresh={fetchData} />
  }
  if (state === 'suspended') {
    return <SuspendedView business={data.business} />
  }
  if (state === 'rejected') {
    return <RejectedView business={data.business} />
  }
  if (state === 'expired') {
    return <ExpiredView business={data.business} onRefresh={fetchData} />
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {kioskMode && (
        <KioskMode
          bizId={business.id}
          businessName={business.name}
          businessEmoji={business.emoji}
          onExit={() => setKioskMode(false)}
        />
      )}

      {/* Topbar */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icons.Business size={16} className="text-zinc-400" aria-hidden="true" />
            <span className="font-semibold text-sm tracking-tight text-zinc-100">IntelliStamp</span>
            <span className="text-[11px] bg-zinc-900 border border-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-medium">Business</span>
          </div>
          {ownerEmail && (
            <span className="hidden sm:block text-xs text-zinc-500">{ownerEmail}</span>
          )}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setKioskMode(true)}
              className="hidden sm:flex items-center gap-1.5 text-xs"
            >
              <Icons.KioskMode size={14} aria-hidden="true" /> Counter Display
            </Button>
            <button
              onClick={() => setKioskMode(true)}
              className="sm:hidden text-zinc-400 hover:text-white p-2 text-base flex items-center justify-center rounded-md hover:bg-zinc-900"
              aria-label="Open Counter Display"
            >
              <Icons.KioskMode size={16} aria-hidden="true" />
            </button>
            <Button variant="ghost" size="sm" onClick={() => setActiveTab('settings')} className="flex items-center gap-1 text-xs">
              <Icons.Settings size={14} aria-hidden="true" /> Settings
            </Button>
            <Button variant="ghost" size="sm" onClick={() => router.push('/account')} className="flex items-center gap-1 text-xs">
              <Icons.Customers size={14} aria-hidden="true" /> Account
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200">
              <Icons.Logout size={14} aria-hidden="true" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Business header */}
        <div className="flex items-center gap-3.5 pb-2">
          <BusinessVisual 
            logoUrl={business.branding?.logo_url} 
            emoji={business.emoji} 
            name={business.name} 
            className="text-2xl max-h-10 w-auto max-w-[100px]" 
          />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-zinc-100">{business.name}</h1>
              {process.env.NEXT_PUBLIC_TENANT_BRANDING_ENABLED === 'true' && business.branding?.is_enabled !== false && (
                <span 
                  className="text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
                  style={{
                    background: (business.branding?.primary_color || '#FACC15') + '1A',
                    color: business.branding?.primary_color || '#FACC15',
                    border: '1px solid ' + (business.branding?.primary_color || '#FACC15') + '33'
                  }}
                >
                  Co-Branded
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400 mt-0.5">
              <span>{business.category}</span>
              {process.env.NEXT_PUBLIC_TENANT_BRANDING_ENABLED === 'true' && business.branding?.is_enabled !== false && (
                <button 
                  onClick={() => setActiveTab('branding')}
                  className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1 underline cursor-pointer"
                >
                  Preview Customer Card
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatsCard 
            icon={<Icons.TotalCustomers size={18} />} 
            label="Total Customers" 
            value={stats.total_customers} 
          />
          <StatsCard 
            icon={<Icons.StampsIssued size={18} />} 
            label="Stamps Issued" 
            value={stats.total_stamps} 
          />
          <StatsCard 
            icon={<Icons.RewardsRedeemed size={18} />} 
            label="Rewards Redeemed" 
            value={stats.rewards_redeemed} 
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-zinc-800/80 overflow-x-auto">
          {([
            { id: 'qr' as Tab,        label: 'Stamp QR', icon: <Icons.QrStamper size={15} /> },
            { id: 'customers' as Tab, label: `Customers (${customers.length})`, icon: <Icons.Customers size={15} /> },
            { id: 'rewards' as Tab,   label: 'Rewards', icon: <Icons.Rewards size={15} /> },
            { id: 'campaigns' as Tab, label: 'Messages', icon: <Icons.Campaigns size={15} /> },
            { id: 'settings' as Tab,  label: 'Settings', icon: <Icons.Settings size={15} /> },
            ...(process.env.NEXT_PUBLIC_TENANT_BRANDING_ENABLED === 'true'
              ? [{ id: 'branding' as Tab, label: 'Card Design', icon: <Icons.Branding size={15} /> }]
              : []),
          ]).map((tab) => {
            const isTabActive = activeTab === tab.id
            const activeColor = (process.env.NEXT_PUBLIC_TENANT_BRANDING_ENABLED === 'true' && business.branding && business.branding.is_enabled !== false)
              ? (business.branding.primary_color || '#FACC15')
              : '#FACC15'

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={isTabActive ? { color: activeColor, borderColor: activeColor } : undefined}
                className={`px-3.5 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
                  isTabActive
                    ? ''
                    : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Tab: Stamp QR */}
        {activeTab === 'qr' && (
          <div className="grid lg:grid-cols-2 gap-5">
            {/* Left: Customer Display */}
            <div className="bg-zinc-900/50 rounded-lg p-5 border border-zinc-800 shadow-xs space-y-4">
              <div>
                <p className="text-xs font-medium text-zinc-300">Customer QR Code</p>
                <p className="text-xs text-zinc-500 mt-0.5">Show this to your customers so they can scan and collect stamps.</p>
              </div>

              <div className="flex flex-col items-center py-2">
                <QRDisplay bizId={business.id} size={180} showToken={true} />
              </div>

              <div>
                <Button
                  onClick={() => setKioskMode(true)}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  Open Counter Display
                </Button>
              </div>
            </div>

            {/* Right: Staff Validator */}
            <div>
              {!business.staff_pin_enabled ? (
                <div className="bg-zinc-900/50 rounded-lg p-8 border border-zinc-800 h-full flex flex-col items-center justify-center text-center gap-2.5">
                  <div className="text-3xl text-zinc-400">⚡</div>
                  <h3 className="font-semibold text-sm text-zinc-100">Auto-Refresh QR Active</h3>
                  <p className="text-xs text-zinc-400 max-w-xs">
                    Customers stamp themselves by scanning the live dynamic QR.
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-2">
                    Enable Staff PIN in Settings for manual lookup &amp; stamping.
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
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-zinc-400">
                  {customers.length} customer{customers.length !== 1 ? 's' : ''} enrolled
                </p>
                <Button size="sm" variant="secondary" onClick={handleExport} className="text-xs">
                  Export CSV
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
          <div className="max-w-2xl space-y-4">
            <div className="bg-zinc-900/50 rounded-lg p-5 border border-zinc-800 space-y-4 shadow-xs">
              <div>
                <h3 className="font-semibold text-sm text-zinc-100">Send Campaign Message</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Reach out to opted-in loyalty customers on WhatsApp.</p>
              </div>

              {/* Audience */}
              <div>
                <p className="text-xs font-medium text-zinc-300 mb-2">Audience</p>
                <div className="space-y-2">
                  {([
                    { id: 'all' as const, label: 'All opted-in customers', count: audienceCounts.all },
                    { id: 'near_reward' as const, label: 'Near reward (1-2 stamps away)', count: audienceCounts.near_reward },
                    { id: 'inactive' as const, label: 'Inactive 30+ days', count: audienceCounts.inactive },
                  ]).map((opt) => (
                    <label
                      key={opt.id}
                      className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                        campaignAudience === opt.id
                          ? 'border-zinc-400 bg-zinc-800/60'
                          : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="audience"
                        value={opt.id}
                        checked={campaignAudience === opt.id}
                        onChange={() => setCampaignAudience(opt.id)}
                        className="accent-zinc-100"
                      />
                      <span className="text-xs text-zinc-200 flex-1">{opt.label}</span>
                      <span className="text-xs font-semibold text-zinc-400">{opt.count}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-zinc-300">Message</span>
                  <span className="text-[11px] text-zinc-500">{campaignMessage.length}/160</span>
                </div>
                <Textarea
                  value={campaignMessage}
                  onChange={(e) => setCampaignMessage(e.target.value)}
                  placeholder="Hi {name}! You have stamps waiting at our store..."
                  maxLength={160}
                  rows={3}
                />
                <p className="text-[11px] text-zinc-500 mt-1">Use {'{name}'} for personalized customer name.</p>
              </div>

              {/* Preview */}
              {campaignMessage && (
                <div className="bg-zinc-850/60 rounded-md p-3 border border-zinc-800">
                  <p className="text-[10px] uppercase font-semibold text-zinc-400 mb-1">Preview</p>
                  <p className="text-xs text-zinc-200 leading-relaxed">{previewMessage}</p>
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
                size="sm"
              >
                Send Campaign
              </Button>

              <p className="text-[11px] text-zinc-500 text-center">
                Est. ~₹{(audienceCounts[campaignAudience] * 0.5).toFixed(2)} ({audienceCounts[campaignAudience]} messages × ₹0.50)
              </p>
            </div>
          </div>
        )}

        {/* Tab: Branding */}
        {activeTab === 'branding' && process.env.NEXT_PUBLIC_TENANT_BRANDING_ENABLED === 'true' && (
          <BrandingTab business={business} onUpdate={fetchData} />
        )}

        {/* Tab: Settings */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl space-y-5">
            {/* Business Info */}
            <div className="bg-zinc-900/50 rounded-lg p-5 border border-zinc-800 shadow-xs">
              <h3 className="font-semibold text-sm text-zinc-100 mb-3">Business Info</h3>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-zinc-800/60">
                  <span className="text-zinc-400">Name</span>
                  <span className="text-zinc-100 font-medium">{business.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-800/60">
                  <span className="text-zinc-400">Category</span>
                  <span className="text-zinc-100">{business.category}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-800/60">
                  <span className="text-zinc-400">Stamps Required</span>
                  <span className="text-zinc-100">{business.stamps_required}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-800/60">
                  <span className="text-zinc-400">Reward</span>
                  <span className="text-zinc-100">{business.reward}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-zinc-400">Staff PIN</span>
                  <div className="flex items-center gap-2">
                    {business.has_staff_pin ? (
                      <span className="text-zinc-200">••••</span>
                    ) : (
                      <span className="text-zinc-500 italic">Not set</span>
                    )}
                    {business.plan === 'pro' && (
                      <button
                        onClick={() => {
                          setPinManagerAction(business.has_staff_pin ? 'change' : 'set')
                          setPinManagerOpen(true)
                        }}
                        className="text-xs text-zinc-300 hover:text-white underline ml-2 cursor-pointer"
                      >
                        {business.has_staff_pin ? 'Change' : 'Set PIN'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Google Review Link */}
              <div className="mt-4 pt-4 border-t border-zinc-800">
                <div className="flex items-center justify-between mb-1.5">
                  <div>
                    <p className="text-xs font-medium text-zinc-200">Google Review Link</p>
                    <p className="text-[11px] text-zinc-500">Customers get a bonus stamp for leaving a review.</p>
                  </div>
                  <button
                    onClick={() => {
                      setGmbInput(business.gmb_link ?? '')
                      setGmbError('')
                      setGmbSaved(false)
                      setEditModalOpen(true)
                    }}
                    className="text-xs text-zinc-300 hover:text-white underline cursor-pointer"
                  >
                    {business.gmb_link ? 'Edit' : 'Configure →'}
                  </button>
                </div>
                {business.gmb_link ? (
                  <p className="text-[11px] text-emerald-400">✓ Set — review prompt active in counter display</p>
                ) : (
                  <p className="text-[11px] text-zinc-500">Not set — review prompt hidden</p>
                )}
              </div>
            </div>

            <SocialLinksSettings business={business} />

            <FeatureToggles 
              business={business} 
              onSave={handleSaveToggles} 
              onOpenPinManager={(action) => {
                setPinManagerAction(action)
                setPinManagerOpen(true)
              }}
            />
          </div>
        )}
      </div>

      {/* GMB Link Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 rounded-lg p-5 border border-zinc-800 w-full max-w-sm space-y-4 shadow-xl">
            <h3 className="font-semibold text-sm text-zinc-100">Google Review Link</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Paste your Google Maps review link. Customers in counter display mode will be offered a bonus stamp for leaving a review.
            </p>
            <Input
              label="Google Review URL"
              placeholder="https://g.page/r/..."
              value={gmbInput}
              onChange={(e) => { setGmbInput(e.target.value); setGmbError(''); setGmbSaved(false) }}
            />
            {gmbError && <p className="text-xs text-rose-400">{gmbError}</p>}
            {gmbSaved && <p className="text-xs text-emerald-400">✓ Saved successfully</p>}
            <div className="flex gap-2 pt-1">
              <Button
                variant="secondary"
                size="sm"
                className="flex-1"
                onClick={() => setEditModalOpen(false)}
              >
                {gmbSaved ? 'Close' : 'Cancel'}
              </Button>
              <Button
                size="sm"
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

      {/* Staff PIN Modal */}
      {pinManagerOpen && data && (
        <StaffPinManager
          business={data.business}
          initialAction={pinManagerAction}
          onSuccess={async (hasPin) => {
            if (hasPin && !data.business.has_staff_pin && pinManagerAction === 'set') {
              setData((prev) => prev ? { ...prev, business: { ...prev.business, has_staff_pin: true, staff_pin_enabled: true } } : prev)
              await handleSaveToggles({ staff_pin_enabled: true })
            }
          }}
          onClose={() => setPinManagerOpen(false)}
        />
      )}
    </div>
  )
}
