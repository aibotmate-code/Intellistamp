'use client'

import { useState } from 'react'
import type { Business } from '@/types'
import AdminBusinessForm from './AdminBusinessForm'
import AdminBrandingEditor from '@/components/admin/AdminBrandingEditor'
import {
  GearSix,
  Palette,
  Gift,
  Users,
  ChartLineUp,
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
    { id: 'overview' as AdminTab, label: 'Overview & Plan', icon: <GearSix size={16} /> },
    { id: 'branding' as AdminTab, label: 'Branding', icon: <Palette size={16} /> },
    { id: 'loyalty' as AdminTab, label: 'Loyalty', icon: <Gift size={16} /> },
    { id: 'customers' as AdminTab, label: 'Customers', icon: <Users size={16} /> },
    { id: 'activity' as AdminTab, label: 'Activity', icon: <ChartLineUp size={16} /> },
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

      {/* Tab: Overview & Plan */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Approval &amp; Plan</h2>
            <AdminBusinessForm business={business} />
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Business Info (Read Only)</h2>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-xs text-gray-500 font-medium">Owner</div>
                <div className="font-medium text-gray-900">{ownerEmail}</div>
                {ownerName && <div className="text-xs text-gray-600">{ownerName}</div>}
              </div>
              <div>
                <div className="text-xs text-gray-500 font-medium">Owner ID</div>
                <div className="font-mono text-xs text-gray-600 break-all">{business.owner_id}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 font-medium">Business ID</div>
                <div className="font-mono text-xs text-gray-600 break-all">{business.id}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 font-medium">Slug</div>
                <div className="text-gray-900">/{business.slug}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 font-medium">Created</div>
                <div className="text-gray-900">{new Date(business.created_at).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 font-medium">Active Features</div>
                <ul className="list-disc pl-5 text-xs text-gray-700 mt-1 space-y-0.5">
                  {business.dynamic_qr_enabled && <li>Dynamic Signed QR</li>}
                  {business.staff_pin_enabled && <li>Staff PIN Validation</li>}
                  {business.whatsapp_enabled && <li>WhatsApp Notifications</li>}
                </ul>
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

      {/* Tab: Loyalty */}
      {activeTab === 'loyalty' && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 space-y-4 max-w-xl">
          <h2 className="text-lg font-semibold text-gray-900">Loyalty Program Settings</h2>
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
              <span className="text-gray-500">Emoji / Icon</span>
              <span className="text-lg">{business.emoji}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500">Staff PIN Enabled</span>
              <span className="font-mono">{business.staff_pin_enabled ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Customers */}
      {activeTab === 'customers' && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 space-y-3 max-w-xl">
          <h2 className="text-lg font-semibold text-gray-900">Customers Overview</h2>
          <p className="text-xs text-gray-500">
            Enrolled customers are tracked under the multi-tenant <code className="font-mono">business_customers</code> table with tenant isolation.
          </p>
          <div className="p-4 bg-gray-50 rounded-md border border-gray-200 text-sm">
            <span className="text-gray-700 font-medium">Tenant ID: </span>
            <code className="font-mono text-xs text-gray-900">{business.id}</code>
          </div>
        </div>
      )}

      {/* Tab: Activity */}
      {activeTab === 'activity' && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 space-y-3 max-w-xl">
          <h2 className="text-lg font-semibold text-gray-900">Activity &amp; Audit Logs</h2>
          <p className="text-xs text-gray-500">
            Recent stamping, redemption, and admin approval logs for this tenant.
          </p>
          <div className="p-4 bg-gray-50 rounded-md border border-gray-200 text-xs text-gray-600">
            Last status change recorded at {new Date(business.created_at).toLocaleDateString()}.
          </div>
        </div>
      )}
    </div>
  )
}
