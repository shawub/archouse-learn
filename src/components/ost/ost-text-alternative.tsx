'use client'

import { useState } from 'react'
import { EXPERIMENTS, OST_TEAMS, SOLUTIONS, TEAM_NAMES, type TeamId } from '@/lib/ost/data'
import type { OstStatus } from '@/lib/ost/data'
import { deriveTeams } from '@/lib/ost/graph'

const derived = deriveTeams()

function Entry({ kind, id, title, status, team }: {
  kind: string
  id: string
  title: string
  status?: OstStatus
  team?: TeamId
}) {
  const others = team ? (derived.get(id) ?? []).filter(t => t !== team) : []
  return (
    <>
      <span className="font-semibold">{kind}:</span> {title} <code className="text-xs text-gray-500">({id})</code>
      {status && <span className="text-gray-600"> — {status}</span>}
      {others.length > 0 && (
        <strong className="text-gray-800"> — shared with: {others.map(t => TEAM_NAMES[t]).join(', ')}</strong>
      )}
    </>
  )
}

export function OstTextAlternative() {
  const [visible, setVisible] = useState(false)

  return (
    <section aria-labelledby="ost-outline-heading" className="mt-6">
      <button
        type="button"
        onClick={() => setVisible(v => !v)}
        aria-expanded={visible}
        aria-controls="ost-outline"
        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        {visible ? 'Hide text outline' : 'Show text outline'}
      </button>
      {/* Always in the accessibility tree; only visually hidden until toggled on. */}
      <div id="ost-outline" className={visible ? 'mt-4 rounded-xl border border-gray-200 bg-white p-4 text-sm' : 'sr-only'}>
        <h2 id="ost-outline-heading" className="mb-2 font-semibold text-gray-900">
          Opportunity Solution Tree outline
        </h2>
        <ul className="space-y-3">
          {OST_TEAMS.map(team => (
            <li key={team.id}>
              <span className="font-semibold">{team.name} team</span> — <Entry kind="Outcome" id={`outcome-${team.id}`} title={team.outcome} />
              <ul className="ml-5 mt-1 list-disc space-y-1">
                {team.opportunities.map(opportunity => (
                  <li key={opportunity.id}>
                    <Entry kind="Opportunity" id={opportunity.id} title={opportunity.title} status={opportunity.status} />
                    {opportunity.solutionIds.length > 0 && (
                      <ul className="ml-5 list-[circle] space-y-1">
                        {opportunity.solutionIds.map(solutionId => {
                          const solution = SOLUTIONS[solutionId]
                          return (
                            <li key={solution.id}>
                              <Entry kind="Solution" {...solution} team={team.id} />
                              {solution.experimentIds.length > 0 && (
                                <ul className="ml-5 list-[square] space-y-1">
                                  {solution.experimentIds.map(experimentId => {
                                    const experiment = EXPERIMENTS[experimentId]
                                    return (
                                      <li key={experiment.id}>
                                        <Entry kind="Experiment" {...experiment} team={team.id} />
                                        {experiment.insights && experiment.insights.length > 0 && (
                                          <ul className="ml-5 list-disc">
                                            {experiment.insights.map(insight => (
                                              <li key={insight.id}>
                                                Insight:{' '}
                                                <a href={insight.href} className="text-indigo-600 underline hover:text-indigo-700">
                                                  {insight.label}
                                                </a>
                                              </li>
                                            ))}
                                          </ul>
                                        )}
                                      </li>
                                    )
                                  })}
                                </ul>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
