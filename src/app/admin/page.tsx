import { requireIntellicalAdmin, adminClient } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const adminOrError = await requireIntellicalAdmin()
  if (adminOrError instanceof Response) {
    redirect('/login')
  }

  // Fetch all businesses using the service role to bypass RLS
  const { data: businesses, error } = await adminClient
    .from('businesses')
    .select('id, name, slug, plan, approval_status, plan_expires_at, created_at, owner_id')
    .order('created_at', { ascending: false })

  if (error) {
    return <div className="text-red-500">Error loading businesses: {error.message}</div>
  }

  // Resolve unique owner IDs to emails securely
  const ownerIds = Array.from(new Set(businesses?.map((b) => b.owner_id) || []))
  const ownersMap = new Map<string, { email: string; name?: string }>()

  await Promise.all(
    ownerIds.map(async (ownerId) => {
      if (!ownerId) return
      const { data } = await adminClient.auth.admin.getUserById(ownerId)
      if (data?.user) {
        ownersMap.set(ownerId, {
          email: data.user.email || 'Email unavailable',
          name: data.user.user_metadata?.name || data.user.user_metadata?.full_name || undefined,
        })
      } else {
        ownersMap.set(ownerId, { email: 'Email unavailable' })
      }
    })
  )

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Businesses</h1>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Business</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {businesses?.map((business) => (
              <tr key={business.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-gray-900">{business.name}</div>
                  <div className="text-sm text-gray-500">/{business.slug}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{ownersMap.get(business.owner_id)?.email || 'Email unavailable'}</div>
                  {ownersMap.get(business.owner_id)?.name && (
                    <div className="text-xs text-gray-500">{ownersMap.get(business.owner_id)?.name}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span className="capitalize">{business.plan}</span>
                  {business.plan_expires_at && (
                    <div className="text-xs mt-1">Exp: {new Date(business.plan_expires_at).toLocaleDateString()}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${business.approval_status === 'approved' ? 'bg-green-100 text-green-800' : 
                      business.approval_status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-red-100 text-red-800'}`}>
                    {business.approval_status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(business.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Link href={`/admin/business/${business.id}`} className="text-indigo-600 hover:text-indigo-900">
                    Manage
                  </Link>
                </td>
              </tr>
            ))}
            {(!businesses || businesses.length === 0) && (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  No businesses found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
