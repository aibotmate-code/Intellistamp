'use client'

import React, { useState, useRef, useEffect } from 'react'
import { DownloadSimple, FilePdf, FileCsv, CaretDown, SpinnerGap } from '@phosphor-icons/react'
import type { AnalyticsPeriod } from '@/lib/server/analytics'
import { cn } from '@/lib/utils'

interface AdminExportMenuProps {
  businessId: string
  period: AnalyticsPeriod
}

export default function AdminExportMenu({ businessId, period }: AdminExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [downloading, setDownloading] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleDownload = async (type: 'pdf' | 'customers' | 'activity') => {
    setDownloading(type)
    setIsOpen(false)
    try {
      let endpoint = ''
      if (type === 'pdf') {
        endpoint = `/api/admin/business/${businessId}/export/pdf?period=${period}`
      } else if (type === 'customers') {
        endpoint = `/api/admin/business/${businessId}/export/customers`
      } else if (type === 'activity') {
        endpoint = `/api/admin/business/${businessId}/export/activity`
      }

      const res = await fetch(endpoint)
      if (!res.ok) {
        throw new Error('Export failed')
      }

      // Trigger browser download
      const blob = await res.blob()
      const contentDisposition = res.headers.get('Content-Disposition')
      let filename = 'export'
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^";]+)"?/)
        if (match && match[1]) filename = match[1]
      }

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export download error', err)
    } finally {
      setDownloading(null)
    }
  }

  const periodLabel = period.toUpperCase()

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={downloading !== null}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all',
          'bg-zinc-800 text-zinc-100 hover:bg-zinc-700 border border-zinc-700/80 shadow-xs active:scale-98',
          downloading !== null && 'opacity-75 cursor-not-allowed'
        )}
      >
        {downloading ? (
          <SpinnerGap size={14} className="animate-spin text-amber-400" />
        ) : (
          <DownloadSimple size={14} className="text-zinc-300" />
        )}
        <span>{downloading ? 'Exporting...' : 'Export'}</span>
        <CaretDown size={11} className={cn('text-zinc-400 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-1.5 w-60 origin-top-right rounded-xl bg-zinc-950 border border-zinc-800 p-1.5 shadow-2xl backdrop-blur-md">
          <div className="px-2.5 py-1.5 border-b border-zinc-800/80 text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">
            Client-Facing Exports
          </div>

          <div className="space-y-0.5 pt-1">
            {/* PDF Report Option */}
            <button
              type="button"
              onClick={() => handleDownload('pdf')}
              className="w-full flex items-start gap-2.5 p-2 rounded-lg text-left hover:bg-zinc-900 transition-colors cursor-pointer group"
            >
              <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:bg-amber-500/20">
                <FilePdf size={16} />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-zinc-200 group-hover:text-amber-400 transition-colors">
                  Download Performance PDF
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5">
                  Branded report for selected {periodLabel} window
                </div>
              </div>
            </button>

            {/* Customers CSV Option */}
            <button
              type="button"
              onClick={() => handleDownload('customers')}
              className="w-full flex items-start gap-2.5 p-2 rounded-lg text-left hover:bg-zinc-900 transition-colors cursor-pointer group"
            >
              <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 group-hover:bg-blue-500/20">
                <FileCsv size={16} />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-zinc-200 group-hover:text-blue-400 transition-colors">
                  Export Customers CSV
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5">
                  Tenant customer progress, stamps &amp; status
                </div>
              </div>
            </button>

            {/* Activity CSV Option */}
            <button
              type="button"
              onClick={() => handleDownload('activity')}
              className="w-full flex items-start gap-2.5 p-2 rounded-lg text-left hover:bg-zinc-900 transition-colors cursor-pointer group"
            >
              <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:bg-emerald-500/20">
                <FileCsv size={16} />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-zinc-200 group-hover:text-emerald-400 transition-colors">
                  Export Activity CSV
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5">
                  Chronological scan and audit events
                </div>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
