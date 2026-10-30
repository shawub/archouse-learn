import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 bg-gray-50 flex flex-col">
      <div className="px-6 py-4">
        <Link href="/" className="text-lg font-bold text-brand-600">Archouse Learn</Link>
      </div>
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {children}
        </div>
      </div>
    </div>
  )
}
