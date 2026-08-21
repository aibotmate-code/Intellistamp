'use client'

import { useState } from 'react'
import type { Business } from '@/types'
import AdminBusinessForm from './AdminBusinessForm'
import AdminBrandingEditor from '@/components/admin/AdminBrandingEditor'
import AdminAnalyticsView from '@/components/admin/AdminAnalyticsView'
import AdminCustomersTable from '@/components/admin/AdminCustomersTable'
import AdminActivityFeed from '@/components/admin/AdminActivityFeed'
import {
  ChartLineUp,
  Palette,
  Gift,
  Users,
  ClockCounterClockwise,
  GearSix,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

type AdminTab = 'overview' | 'branding' | 'loyalty' | 'customers' | 'activity'

interface AdminBusinessDetailClientProps {
  business: Business
  ownerEmail: string
  ownerName: string
}

export default function AdminBusinessDetailClient({
  business,
  ownerEmail,
  ownerName,
}: AdminBusinessDetailClientProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview')

  const tabs = [
    { id: 'overview' as AdminTab, label: 'Overview & Analytics', icon: <ChartLineUp size={16} /> },
    { id: 'branding' as AdminTab, label: 'Co-Branding', icon: <Palette size={16} /> },
    { id: 'customers' as AdminTab, label: 'Customers', icon: <Users size={16} /> },
    { id: 'activity' as AdminTab, label: 'Activity Feed', icon: <ClockCounterClockwise size={16} /> },
    { id: 'loyalty' as AdminTab, label: 'Program Rules', icon: <Gift size={16} /> },
  ]

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 cursor-pointer',
                isActive
                  ? 'border-indigo-600 text-indigo-600 font-semibold'
                  : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
              )}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Tab: Overview & Analytics */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Main Visual Analytics Section */}
          <div className="bg-slate-950 text-zinc-100 p-6 rounded-xl border border-zinc-800 shadow-md">
            <AdminAnalyticsView businessId={business.id} />
          </div>

          {/* Business Configuration & Account Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-xs border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <GearSix size={18} className="text-gray-700" />
                <h2 className="text-base font-semibold text-gray-900">Approval &amp; Plan Configuration</h2>
              </div>
              <AdminBusinessForm business={business} />
            </div>

            <div className="bg-white p-6 rounded-xl shadow-xs border border-gray-200">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Tenant Identity &amp; Capabilities</h2>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-xs text-gray-500 font-medium">Owner Email</div>
                  <div className="font-medium text-gray-900">{ownerEmail}</div>
                  {ownerName && <div className="text-xs text-gray-600">{ownerName}</div>}
                </div>
                <div>
                  <div className="text-xs text-gray-500 font-medium">Owner ID</div>
                  <div className="font-mono text-xs text-gray-600 break-all">{business.owner_id || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 font-medium">Tenant ID</div>
                  <div className="font-mono text-xs text-gray-600 break-all">{business.id}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 font-medium">Public Slug</div>
                  <div className="text-gray-900 font-mono text-xs">/{business.slug}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 font-medium">Created Timestamp</div>
                  <div className="text-gray-900 text-xs">{new Date(business.created_at).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 font-medium">Active Capabilities</div>
                  <ul className="list-disc pl-5 text-xs text-gray-700 mt-1 space-y-0.5">
                    {business.dynamic_qr_enabled && <li>Dynamic Signed QR</li>}
                    {business.staff_pin_enabled && <li>Staff PIN Validation</li>}
                    {business.whatsapp_enabled && <li>WhatsApp Notifications</li>}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Branding */}
      {activeTab === 'branding' && (
        <div className="bg-slate-950 text-zinc-100 p-6 rounded-xl border border-zinc-800 shadow-md">
          <AdminBrandingEditor business={business} />
        </div>
      )}

      {/* Tab: Customers */}
      {activeTab === 'customers' && (
        <div className="bg-slate-950 text-zinc-100 p-6 rounded-xl border border-zinc-800 shadow-md">
          <AdminCustomersTable businessId={business.id} />
        </div>
      )}

      {/* Tab: Activity */}
      {activeTab === 'activity' && (
        <div className="bg-slate-950 text-zinc-100 p-6 rounded-xl border border-zinc-800 shadow-md">
          <AdminActivityFeed businessId={business.id} />
        </div>
      )}

      {/* Tab: Loyalty Rules */}
      {activeTab === 'loyalty' && (
        <div className="bg-white p-6 rounded-xl shadow-xs border border-gray-200 space-y-4 max-w-2xl">
          <h2 className="text-base font-semibold text-gray-900">Loyalty Program Specifications</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Stamps Required for Reward</span>
              <span className="font-semibold text-gray-900">{business.stamps_required} stamps</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Reward Description</span>
              <span className="font-medium text-gray-900">{business.reward}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Emoji / Visual Icon</span>
              <span className="text-lg">{business.emoji}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500">Staff PIN Enabled</span>
              <span className="font-mono">{business.staff_pin_enabled ? 'Enabled' : 'Disabled'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
