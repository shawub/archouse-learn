import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/nav/sidebar'
import { Footer } from '@/components/footer'

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <div className="flex min-h-screen">
      <Sidebar role={session.user.role} userName={session.user.name ?? session.user.email ?? 'User'} />
      <main className="flex-1 flex flex-col bg-gray-50 overflow-auto">
        <div className="flex-1 w-full max-w-5xl mx-auto px-8 py-8">
          {children}
        </div>
        <Footer />
      </main>
    </div>
  )
}
