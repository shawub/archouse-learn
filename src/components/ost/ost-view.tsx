'use client'

import { useState } from 'react'
import { TEAM_ACCENTS, TEAM_ORDER, type TeamId } from '@/lib/ost/data'
import { buildOstGraph } from '@/lib/ost/graph'
import { OstGraph } from './ost-graph'
import { OstLegend } from './ost-legend'
import { OstTextAlternative } from './ost-text-alternative'

type Filter = TeamId | 'all'

const FILTERS: Filter[] = ['all', ...TEAM_ORDER]

const graph = buildOstGraph()

export function OstView() {
  const [filter, setFilter] = useState<Filter>('all')
  const [overlapsOnly, setOverlapsOnly] = useState(false)

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-3">
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
          onClick={() => setOverlapsOnly(o => !o)}
          aria-pressed={overlapsOnly}
          className={`inline-flex items-center gap-2 rounded-full border-2 border-dashed px-4 py-1.5 text-sm font-medium transition-colors ${
            overlapsOnly
              ? 'border-gray-900 bg-gray-900 text-white'
              : 'border-gray-500 bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <span aria-hidden>⧉</span>
          Overlaps only
        </button>
      </div>

      <div className="mb-4">
        <OstLegend />
      </div>

      <OstGraph graph={graph} team={filter} overlapsOnly={overlapsOnly} />

      <OstTextAlternative graph={graph} />
    </div>
  )
}
