import { requireIntellicalAdmin, adminClient } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AdminBusinessDetailClient from './AdminBusinessDetailClient'

export const dynamic = 'force-dynamic'

export default async function AdminManageBusiness({ params }: { params: Promise<{ bizId: string }> }) {
  const { bizId } = await params
  const adminOrError = await requireIntellicalAdmin()
  if (adminOrError instanceof Response) {
    redirect('/login')
  }

  const { data: business, error } = await adminClient
    .from('businesses')
    .select('*')
    .eq('id', bizId)
    .single()

  if (error || !business) {
    return <div className="text-red-500">Business not found.</div>
  }

  let ownerEmail = 'Email unavailable'
  let ownerName = ''
  
  if (business.owner_id) {
    const { data: userData } = await adminClient.auth.admin.getUserById(business.owner_id)
    if (userData?.user) {
      ownerEmail = userData.user.email || 'Email unavailable'
      ownerName = userData.user.user_metadata?.name || userData.user.user_metadata?.full_name || ''
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/admin" className="text-sm text-indigo-600 hover:text-indigo-900 mb-2 inline-block">
            &larr; Back to Businesses
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Manage: {business.name}</h1>
          <p className="text-gray-500 text-sm mt-1">ID: {business.id}</p>
        </div>
      </div>

      <AdminBusinessDetailClient
        business={business}
        ownerEmail={ownerEmail}
        ownerName={ownerName}
      />
    </div>
  )
}
