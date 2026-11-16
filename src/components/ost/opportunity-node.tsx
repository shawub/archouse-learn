'use client'

import { useState } from 'react'
import type { Opportunity } from '@/lib/ost/data'
import { StatusChip } from './status-chip'

function EntityLabel({ kind, id, title }: { kind: string; id: string; title: string }) {
  return (
    <span className="min-w-0 flex-1">
      <span className="mr-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{kind}</span>
      <code className="mr-2 text-xs text-gray-500">{id}</code>
      <span className="text-gray-900">{title}</span>
    </span>
  )
}

export function OpportunityNode({ opportunity }: { opportunity: Opportunity }) {
  const [expanded, setExpanded] = useState(false)
  const hasSolutions = opportunity.solutions.length > 0

  return (
    <li className="rounded-lg border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        aria-expanded={expanded}
        className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-gray-50"
      >
        <span
          aria-hidden
          className={`mt-0.5 inline-block w-3 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
        >
          ▶
        </span>
        <EntityLabel kind="Opportunity" id={opportunity.id} title={opportunity.title} />
        <StatusChip status={opportunity.status} />
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3">
          {hasSolutions ? (
            <ul className="space-y-3 border-l-2 border-gray-200 pl-4 sm:ml-3">
              {opportunity.solutions.map(solution => (
                <li key={solution.id}>
                  <div className="flex items-start gap-3">
                    <EntityLabel kind="Solution" id={solution.id} title={solution.title} />
                    <StatusChip status={solution.status} />
                  </div>

                  {solution.experiments.length > 0 && (
                    <ul className="mt-2 space-y-2 border-l-2 border-gray-200 pl-4 sm:ml-3">
                      {solution.experiments.map(experiment => (
                        <li key={experiment.id}>
                          <div className="flex items-start gap-3">
                            <EntityLabel kind="Experiment" id={experiment.id} title={experiment.title} />
                            <StatusChip status={experiment.status} />
                          </div>

                          {experiment.insights && experiment.insights.length > 0 && (
                            <ul className="mt-2 space-y-1 border-l-2 border-gray-200 pl-4 sm:ml-3">
                              {experiment.insights.map(insight => (
                                <li key={insight.id} className="text-sm">
                                  <span className="mr-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                                    Insight
                                  </span>
                                  <a href={insight.href} className="text-brand-600 underline hover:text-brand-700">
                                    {insight.label}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No solutions yet.</p>
          )}
        </div>
      )}
    </li>
  )
}
