'use client'

import { useState } from 'react'
import type { TeamId } from '@/lib/ost/data'
import { isShared, KIND_LABELS, type OstGraph } from '@/lib/ost/graph'
import { teamList } from './ost-node'

function NodeList({ graph, ids, team }: { graph: OstGraph; ids: string[]; team: TeamId }) {
  if (ids.length === 0) return null
  return (
    <ul className="ml-4 list-disc space-y-1">
      {ids.map(id => {
        const node = graph.nodes.get(id)
        if (!node) return null
        const others = node.teams.filter(t => t !== team)
        return (
          <li key={id}>
            <span className="font-medium">{KIND_LABELS[node.kind]}</span> <code className="text-xs">{node.id}</code>:{' '}
            {node.title}
            {node.status && <> ({node.status})</>}
            {isShared(node) && <strong className="ml-1">— shared with: {teamList(others)}</strong>}
            {node.insights && node.insights.length > 0 && (
              <ul className="ml-4 list-disc">
                {node.insights.map(insight => (
                  <li key={insight.id}>
                    Insight:{' '}
                    <a href={insight.href} className="text-indigo-600 underline hover:text-indigo-700">
                      {insight.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
            <NodeList graph={graph} ids={graph.children.get(id) ?? []} team={team} />
          </li>
        )
      })}
    </ul>
  )
}

/** Nested list of the same hierarchy (outcome › opportunity › solution › experiment); hidden visually until toggled. */
export function OstTextAlternative({ graph }: { graph: OstGraph }) {
  const [open, setOpen] = useState(false)
  const outcomes = [...graph.nodes.values()].filter(n => n.kind === 'outcome')

  return (
    <section aria-labelledby="ost-text-heading" className="mt-6">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="ost-text-alternative"
        onClick={() => setOpen(o => !o)}
        className="text-sm font-medium text-indigo-600 underline hover:text-indigo-700"
      >
        {open ? 'Hide' : 'Show'} the tree as a text list
      </button>
      <div
        id="ost-text-alternative"
        className={open ? 'mt-3 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-800' : 'sr-only'}
      >
        <h2 id="ost-text-heading" className="mb-2 font-semibold text-gray-900">
          Opportunity Solution Tree as a list
        </h2>
        {outcomes.length === 0 ? (
          <p>No nodes match this filter.</p>
        ) : (
          <ul className="space-y-3">
            {outcomes.map(outcome => (
              <li key={outcome.id}>
                <span className="font-semibold">{teamList(outcome.teams)} team outcome:</span> {outcome.title}
                <NodeList graph={graph} ids={graph.children.get(outcome.id) ?? []} team={outcome.teams[0]} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
