import { requireIntellicalAdmin, adminClient } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AdminBusinessForm from './AdminBusinessForm'

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
          <h1 className="text-3xl font-bold">Manage: {business.name}</h1>
          <p className="text-gray-500 text-sm mt-1">ID: {business.id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Approval & Plan</h2>
          <AdminBusinessForm business={business} />
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Business Info (Read Only)</h2>
          <div className="space-y-3">
            <div>
              <div className="text-sm text-gray-500">Owner</div>
              <div className="font-medium text-gray-900">{ownerEmail}</div>
              {ownerName && <div className="text-sm text-gray-600">{ownerName}</div>}
            </div>
            <div>
              <div className="text-sm text-gray-500">Owner ID</div>
              <div className="font-mono text-xs text-gray-600 break-all">{business.owner_id}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Business ID</div>
              <div className="font-mono text-xs text-gray-600 break-all">{business.id}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Slug</div>
              <div className="text-gray-900">/{business.slug}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Created</div>
              <div className="text-gray-900">{new Date(business.created_at).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Features</div>
              <ul className="list-disc pl-5 text-sm mt-1">
                {business.dynamic_qr_enabled && <li>Dynamic QR</li>}
                {business.staff_pin_enabled && <li>Staff PIN</li>}
                {business.whatsapp_enabled && <li>WhatsApp</li>}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
