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
              <div className="text-sm text-gray-500">Owner ID</div>
              <div className="font-mono text-sm">{business.owner_id}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Slug</div>
              <div>/{business.slug}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Created</div>
              <div>{new Date(business.created_at).toLocaleString()}</div>
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
