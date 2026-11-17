'use client'

import { useMemo, useState } from 'react'
import { TEAM_ACCENTS } from '@/lib/ost/data'
import { buildGraph, type TeamFilter } from '@/lib/ost/graph'
import { OstGraph } from './ost-graph'
import { OstLegend } from './ost-legend'
import { OstTextAlternative } from './ost-text-alternative'

const FILTERS: TeamFilter[] = ['all', 'primary', 'secondary', 'teacher', 'platform']

export function OstView() {
  const [filter, setFilter] = useState<TeamFilter>('all')
  const [overlapsOnly, setOverlapsOnly] = useState(false)
  const graph = useMemo(() => buildGraph(), [])

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div role="group" aria-label="Filter by team" className="flex flex-wrap gap-2">
          {FILTERS.map(option => {
            const active = option === filter
            return (
              <button
                key={option}
                type="button"
                onClick={() => setFilter(option)}
                aria-pressed={active}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
                  active
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {option !== 'all' && (
                  <span aria-hidden className={`inline-block h-2 w-2 rounded-full ${TEAM_ACCENTS[option].dot}`} />
                )}
                {option}
              </button>
            )
          })}
        </div>
        <button
          type="button"
          onClick={() => setOverlapsOnly(v => !v)}
          aria-pressed={overlapsOnly}
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
            overlapsOnly
              ? 'border-gray-900 bg-gray-900 text-white'
              : 'border-dashed border-gray-500 bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <span aria-hidden>⧉</span>
          Overlaps only
        </button>
      </div>

      <div className="mb-4">
        <OstLegend />
      </div>

      <OstGraph graph={graph} filter={filter} overlapsOnly={overlapsOnly} />

      <OstTextAlternative />
    </div>
  )
}
