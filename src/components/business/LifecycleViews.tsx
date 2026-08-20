import React from 'react'
import Button from '@/components/ui/Button'
import { Icons } from '@/config/icons'
import Logo from '@/components/brand/Logo'
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
    <div className="min-h-screen bg-zinc-950 flex flex-col text-zinc-100">
      <header className="border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo size="sm" />
            <span className="text-[11px] bg-zinc-900 border border-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-medium">Business</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => window.location.href = '/account'} className="flex items-center gap-1 text-xs">
            <Icons.Settings size={14} aria-hidden="true" /> Account
          </Button>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-zinc-900/50 rounded-lg p-6 sm:p-8 border border-zinc-800 max-w-md w-full text-center space-y-5 shadow-xs">
          <div className="text-4xl">{business.emoji}</div>
          
          <div className="space-y-1.5">
            <h1 className="text-xl font-semibold tracking-tight text-zinc-100">{title}</h1>
            <p className="text-zinc-400 text-xs leading-relaxed max-w-sm mx-auto">{message}</p>
          </div>

          {badgeText && (
            <div>
              <span className={`inline-block px-2.5 py-0.5 text-xs font-medium rounded-full border ${badgeColor || 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>
                {badgeText}
              </span>
            </div>
          )}

          <div className="bg-zinc-950/80 rounded-md p-3.5 text-left border border-zinc-800/80 text-xs space-y-1">
            <div className="text-zinc-500 font-medium">Business Details</div>
            <div className="font-semibold text-zinc-100 text-sm">{business.name}</div>
            {business.plan && (
              <div className="text-zinc-400 pt-1">
                Plan: <span className="capitalize text-zinc-200">{business.plan}</span>
              </div>
            )}
            <div className="text-zinc-500 text-[11px]">
              Registered on {new Date(business.created_at).toLocaleDateString()}
            </div>
          </div>

          <div className="pt-2 space-y-3">
            {primaryAction && (
              <Button onClick={primaryAction.onClick} size="sm" className="w-full">
                {primaryAction.label}
              </Button>
            )}
            <div className="pt-4 border-t border-zinc-800/80">
              <p className="text-xs text-zinc-500 font-medium mb-2.5">Need help with your account?</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                <a 
                  href="https://wa.me/919286799934?text=Hi%20Intellical%20Labs%2C%20I%20need%20help%20with%20my%20IntelliStamp%20account." 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto text-xs font-medium text-zinc-300 hover:text-white bg-zinc-850 hover:bg-zinc-800 border border-zinc-800 px-3 py-2 rounded-md transition-colors flex items-center justify-center gap-1.5"
                >
                  WhatsApp Support
                </a>
                <a 
                  href="mailto:hello@intellicallabs.com"
                  className="w-full sm:w-auto text-xs font-medium text-zinc-300 hover:text-white bg-zinc-850 hover:bg-zinc-800 border border-zinc-800 px-3 py-2 rounded-md transition-colors flex items-center justify-center gap-1.5"
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
      title="Review in Progress"
      message="Your setup is complete. Intellical Labs is reviewing your business account. Once approved, all loyalty and QR stamping features will activate automatically."
      badgeText="Review Pending"
      badgeColor="bg-amber-500/10 border-amber-500/20 text-amber-400"
      primaryAction={{ label: 'Refresh Status', onClick: onRefresh }}
    />
  )
}

export function SuspendedView({ business }: { business: Business }) {
  return (
    <LifecycleBaseView
      business={business}
      title="Account Suspended"
      message="Your IntelliStamp account is currently suspended. Your customer records and loyalty stamps remain safe, but operational features are temporarily paused."
      badgeText="Suspended"
      badgeColor="bg-rose-500/10 border-rose-500/20 text-rose-400"
    />
  )
}

export function RejectedView({ business }: { business: Business }) {
  return (
    <LifecycleBaseView
      business={business}
      title="Account Not Approved"
      message="We could not activate this business account at this time. Please contact support if you believe this is an error."
      badgeText="Rejected"
      badgeColor="bg-rose-500/10 border-rose-500/20 text-rose-400"
    />
  )
}

export function ExpiredView({ business, onRefresh }: { business: Business, onRefresh: () => void }) {
  return (
    <LifecycleBaseView
      business={business}
      title="Plan Expired"
      message="Your loyalty data is safe, but new stamp issuing is paused until your subscription is renewed."
      badgeText="Plan Expired"
      badgeColor="bg-amber-500/10 border-amber-500/20 text-amber-400"
      primaryAction={{ label: 'Refresh Status', onClick: onRefresh }}
    />
  )
}
