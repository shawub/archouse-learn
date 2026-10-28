import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/nav/sidebar'

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <div className="flex min-h-screen">
      <Sidebar role={session.user.role} userName={session.user.name ?? session.user.email ?? 'User'} />
      <main className="flex-1 bg-gray-50 overflow-auto">
        <div className="max-w-5xl mx-auto px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
