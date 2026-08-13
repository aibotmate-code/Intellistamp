'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminBusinessForm({ business }: { business: any }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [formData, setFormData] = useState({
    approval_status: business.approval_status || 'pending',
    plan: business.plan || 'free',
    plan_expires_at: business.plan_expires_at ? new Date(business.plan_expires_at).toISOString().split('T')[0] : ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch(`/api/admin/business/${business.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update business')
      }

      setSuccess('Business updated successfully')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded">{error}</div>}
      {success && <div className="p-3 bg-green-50 text-green-700 text-sm rounded">{success}</div>}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Approval Status</label>
        <select
          value={formData.approval_status}
          onChange={(e) => setFormData({ ...formData, approval_status: e.target.value })}
          className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
        >
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="suspended">Suspended</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
        <select
          value={formData.plan}
          onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
          className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
        >
          <option value="free">Free</option>
          <option value="pro">Pro</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Plan Expires At (Optional)</label>
        <input
          type="date"
          value={formData.plan_expires_at}
          onChange={(e) => setFormData({ ...formData, plan_expires_at: e.target.value })}
          className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
        />
        <p className="text-xs text-gray-500 mt-1">Leave empty for no expiration.</p>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  )
}
