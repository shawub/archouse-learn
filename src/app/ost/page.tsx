import type { Metadata } from 'next'
import { OstView } from '@/components/ost/ost-view'

export const metadata: Metadata = {
  title: 'Opportunity Solution Tree — Archouse Learn',
}

export default function OstPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Opportunity Solution Tree</h1>
        <p className="mt-2 max-w-3xl text-gray-600">
          Aggregated view of each team&apos;s continuous discovery tree: outcomes, opportunities, solutions and
          experiments. Click an opportunity to expand it.
        </p>
        <div className="mt-8">
          <OstView />
        </div>
      </main>
    </div>
  )
}
