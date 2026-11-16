'use client'

import { useState } from 'react'
import { OST_TEAMS, TEAM_ACCENTS, type TeamId } from '@/lib/ost/data'
import { TeamTree } from './team-tree'

type Filter = TeamId | 'all'

const FILTERS: Filter[] = ['all', 'primary', 'secondary', 'teacher', 'platform']

export function OstView() {
  const [filter, setFilter] = useState<Filter>('all')
  const visibleTeams = filter === 'all' ? OST_TEAMS : OST_TEAMS.filter(team => team.id === filter)

  return (
    <div>
      <div role="group" aria-label="Filter by team" className="mb-6 flex flex-wrap gap-2">
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

      <div className="space-y-6">
        {visibleTeams.map(team => (
          <TeamTree key={team.id} team={team} />
        ))}
      </div>
    </div>
  )
}
