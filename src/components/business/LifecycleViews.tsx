import React from 'react'
import Button from '@/components/ui/Button'
import { Icons } from '@/config/icons'
import type { Business } from '@/types'

interface BaseViewProps {
  business: Business
  title: string
  message: string
  badgeText?: string
  badgeColor?: string
  primaryAction?: { label: string; onClick: () => void }
}

function LifecycleBaseView({ business, title, message, badgeText, badgeColor, primaryAction }: BaseViewProps) {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      <header className="border-b border-zinc-800 bg-zinc-950 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icons.Business size={18} className="text-zinc-400" aria-hidden="true" />
            <span className="font-black text-white">IntelliStamp</span>
            <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded font-medium">Business</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => window.location.href = '/'} className="flex items-center gap-1">
            <Icons.Logout size={16} aria-hidden="true" /> Exit
          </Button>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-zinc-900 rounded-2xl p-8 border border-zinc-800 max-w-lg w-full text-center space-y-6">
          <div className="text-6xl">{business.emoji}</div>
          
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">{title}</h1>
            <p className="text-zinc-400 text-sm leading-relaxed">{message}</p>
          </div>

          {badgeText && (
            <div className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${badgeColor || 'bg-zinc-800 text-zinc-400'}`}>
              {badgeText}
            </div>
          )}

          <div className="bg-zinc-950 rounded-xl p-4 text-left border border-zinc-800 mt-6">
            <div className="text-xs text-zinc-500 mb-1">Business</div>
            <div className="font-medium text-white">{business.name}</div>
            {business.plan && (
              <div className="text-xs text-zinc-500 mt-2">
                Plan: <span className="capitalize text-zinc-300">{business.plan}</span>
              </div>
            )}
            <div className="text-xs text-zinc-500 mt-1">
              Registered: {new Date(business.created_at).toLocaleDateString()}
            </div>
          </div>

          <div className="pt-4 space-y-3">
            {primaryAction && (
              <Button onClick={primaryAction.onClick} className="w-full">
                {primaryAction.label}
              </Button>
            )}
            <div className="pt-4 border-t border-zinc-800">
              <p className="text-sm text-zinc-500 font-medium mb-3">Need help?</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <a 
                  href="https://wa.me/919286799934?text=Hi%20Intellical%20Labs%2C%20I%20need%20help%20with%20my%20IntelliStamp%20account." 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-4 py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  WhatsApp Support
                </a>
                <a 
                  href="mailto:hello@intellicallabs.com"
                  className="w-full sm:w-auto text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-4 py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  Email Support
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function PendingView({ business, onRefresh }: { business: Business, onRefresh: () => void }) {
  return (
    <LifecycleBaseView
      business={business}
      title="Review in progress"
      message="Your setup is complete. Intellical Labs is reviewing your account. Once approved, you can start using your stamp QR and loyalty features."
      badgeText="⏳ Review in progress"
      badgeColor="bg-yellow-400/10 text-yellow-400"
      primaryAction={{ label: 'Refresh Status', onClick: onRefresh }}
    />
  )
}

export function SuspendedView({ business }: { business: Business }) {
  return (
    <LifecycleBaseView
      business={business}
      title="Account temporarily suspended"
      message="Your IntelliStamp account is currently suspended. Your business data and customer records remain safe, but operational features are temporarily unavailable."
      badgeText="⛔ Suspended"
      badgeColor="bg-red-500/10 text-red-500"
    />
  )
}

export function RejectedView({ business }: { business: Business }) {
  return (
    <LifecycleBaseView
      business={business}
      title="Account could not be approved"
      message="We could not activate this business account at this time."
      badgeText="❌ Rejected"
      badgeColor="bg-red-500/10 text-red-500"
    />
  )
}

export function ExpiredView({ business, onRefresh }: { business: Business, onRefresh: () => void }) {
  return (
    <LifecycleBaseView
      business={business}
      title="Your IntelliStamp plan has expired"
      message="Your loyalty data is safe, but new operational activity is paused until your plan is renewed."
      badgeText="⚠️ Plan Expired"
      badgeColor="bg-orange-500/10 text-orange-500"
      primaryAction={{ label: 'Refresh Status', onClick: onRefresh }}
    />
  )
}
