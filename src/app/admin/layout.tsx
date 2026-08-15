import { redirect } from 'next/navigation'
import { requireIntellicalAdmin } from '@/lib/auth'

export const metadata = {
  title: 'Intellical Labs Admin',
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  console.log('[DIAGNOSTIC] AdminLayout: Request received for /admin')
  const adminOrError = await requireIntellicalAdmin()
  if (adminOrError instanceof Response) {
    console.log('[DIAGNOSTIC] AdminLayout: Redirecting to /login due to unauthorized access')
    redirect('/login')
  }
  
  console.log('[DIAGNOSTIC] AdminLayout: Rendering admin dashboard')

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Admin Sidebar */}
      <aside className="w-64 bg-slate-900 text-white min-h-screen p-4">
        <div className="font-bold text-xl mb-8 tracking-tight">Intellical Labs</div>
        <nav className="space-y-2">
          <a href="/admin" className="block px-4 py-2 rounded bg-slate-800 text-white">
            Businesses
          </a>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  )
}
