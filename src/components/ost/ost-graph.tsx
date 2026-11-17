'use client'

import { useMemo, useState } from 'react'
import { EDGE_ACCENTS, TEAM_ACCENTS, TEAM_NAMES, type TeamId } from '@/lib/ost/data'
import {
  COLUMN_GAP,
  computeLayout,
  edgePath,
  filterGraph,
  isShared,
  KIND_LABELS,
  NODE_WIDTH,
  PADDING,
  pathNodeIds,
  type GraphNode,
  type OstGraph as Graph,
  type TeamFilter,
} from '@/lib/ost/graph'
import { StatusChip } from './status-chip'

const EDGE_SPACING = 4
const COLUMNS = ['Outcome', 'Opportunity', 'Solution', 'Experiment']

export function SharedStripe({ teams, className = '' }: { teams: TeamId[]; className?: string }) {
  return (
    <span aria-hidden className={`flex flex-col overflow-hidden ${className}`}>
      {teams.map(team => (
        <span key={team} className={`flex-1 ${TEAM_ACCENTS[team].dot}`} />
      ))}
    </span>
  )
}

export function sharedBadgeText(node: GraphNode, filter: TeamFilter): string {
  const base = `Shared · ${node.teams.length} teams`
  if (filter === 'all') return base
  const others = node.teams.filter(team => team !== filter).map(team => TEAM_NAMES[team])
  return `${base} · also ${others.join(', ')}`
}

function nodeLabel(node: GraphNode, filter: TeamFilter): string {
  const parts = [`${KIND_LABELS[node.kind]} ${node.id}: ${node.title}`]
  if (node.status) parts.push(`status ${node.status}`)
  parts.push(isShared(node) ? sharedBadgeText(node, filter) : `${TEAM_NAMES[node.teams[0]]} team`)
  return parts.join(', ')
}

function NodeBox({ node, filter }: { node: GraphNode; filter: TeamFilter }) {
  const shared = isShared(node)
  const accent = TEAM_ACCENTS[node.teams[0]]
  const teamTinted = node.kind === 'outcome' || node.kind === 'opportunity'

  return (
    <>
      {shared ? (
        <SharedStripe teams={node.teams} className="absolute inset-y-0 left-0 w-2 rounded-l-lg" />
      ) : (
        <span aria-hidden className={`absolute inset-y-0 left-0 w-1.5 rounded-l-lg ${accent.dot}`} />
      )}
      <div className="flex items-center gap-2">
        <span
          className={`text-[10px] font-semibold uppercase tracking-wide ${teamTinted ? accent.text : 'text-gray-500'}`}
        >
          {KIND_LABELS[node.kind]}
          {node.kind === 'outcome' && ` · ${TEAM_NAMES[node.teams[0]]}`}
        </span>
        <span className="ml-auto">{node.status && <StatusChip status={node.status} />}</span>
      </div>
      <p className="mt-1 line-clamp-3 text-xs leading-4 text-gray-900" title={node.title}>
        {node.title}
      </p>
      {shared && (
        <span className="mt-auto inline-flex w-fit items-center gap-1 rounded-full border border-dashed border-gray-500 bg-white px-1.5 text-[10px] font-semibold text-gray-800">
          <span aria-hidden>⧉</span>
          {sharedBadgeText(node, filter)}
        </span>
      )}
      {node.insights && node.insights.length > 0 && (
        <ul className="mt-1 space-y-0.5">
          {node.insights.map(insight => (
            <li key={insight.id} className="truncate text-[11px] leading-4">
              <a href={insight.href} className="text-indigo-600 underline hover:text-indigo-700">
                {insight.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

export function OstGraph({
  graph,
  filter,
  overlapsOnly,
}: {
  graph: Graph
  filter: TeamFilter
  overlapsOnly: boolean
}) {
  const visible = useMemo(() => filterGraph(graph, filter, overlapsOnly), [graph, filter, overlapsOnly])
  const layout = useMemo(() => computeLayout(visible), [visible])
  const [activeId, setActiveId] = useState<string | null>(null)

  const highlighted = useMemo(
    () => (activeId && layout.byId.has(activeId) ? pathNodeIds(visible, activeId) : null),
    [activeId, layout, visible],
  )

  // Parallel edges between the same two nodes (one per team) are fanned out slightly.
  const edgeOffsets = useMemo(() => {
    const groups = new Map<string, string[]>()
    for (const edge of visible.edges) {
      const key = `${edge.parentId}->${edge.childId}`
      groups.set(key, [...(groups.get(key) ?? []), edge.id])
    }
    const offsets = new Map<string, number>()
    for (const ids of groups.values()) {
      ids.forEach((id, index) => offsets.set(id, (index - (ids.length - 1) / 2) * EDGE_SPACING))
    }
    return offsets
  }, [visible])

  if (visible.nodes.length === 0) {
    return <p className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500">Nothing to show.</p>
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
      <div className="relative h-6" style={{ width: layout.width }} aria-hidden>
        {COLUMNS.map((label, index) => (
          <span
            key={label}
            className="absolute top-0 text-xs font-semibold uppercase tracking-wide text-gray-500"
            style={{ left: PADDING + index * (NODE_WIDTH + COLUMN_GAP), width: NODE_WIDTH }}
          >
            {label}
          </span>
        ))}
      </div>
      <div className="relative" style={{ width: layout.width, height: layout.height }} data-testid="ost-graph">
        <svg
          width={layout.width}
          height={layout.height}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          className="absolute inset-0"
          role="img"
          aria-labelledby="ost-graph-title ost-graph-desc"
        >
          <title id="ost-graph-title">Opportunity Solution Tree graph</title>
          <desc id="ost-graph-desc">
            Layered graph of team outcomes, opportunities, solutions and experiments, left to right. Lines connect each
            node to its children and take the colour of the team they belong to. Solutions and experiments shared by
            more than one team appear once with lines from every team. A text outline of the same hierarchy follows the
            graph.
          </desc>
          {visible.edges.map(edge => {
            const from = layout.byId.get(edge.parentId)!
            const to = layout.byId.get(edge.childId)!
            const onPath = highlighted ? highlighted.has(edge.parentId) && highlighted.has(edge.childId) : false
            return (
              <path
                key={edge.id}
                d={edgePath(from, to, edgeOffsets.get(edge.id))}
                fill="none"
                stroke={EDGE_ACCENTS[edge.team]}
                strokeWidth={onPath ? 3 : 2}
                strokeOpacity={highlighted ? (onPath ? 1 : 0.12) : 0.75}
                className="transition-[stroke-opacity] duration-150"
              />
            )
          })}
        </svg>

        {visible.nodes.map(node => {
          const pos = layout.byId.get(node.id)!
          const accent = TEAM_ACCENTS[node.teams[0]]
          const teamTinted = node.kind === 'outcome' || node.kind === 'opportunity'
          const dimmed = highlighted ? !highlighted.has(node.id) : false
          const active = highlighted?.has(node.id) ?? false
          const shared = isShared(node)
          return (
            <div
              key={node.id}
              tabIndex={0}
              role="group"
              aria-label={nodeLabel(node, filter)}
              data-node-id={node.id}
              data-shared={shared || undefined}
              onMouseEnter={() => setActiveId(node.id)}
              onMouseLeave={() => setActiveId(current => (current === node.id ? null : current))}
              onFocus={() => setActiveId(node.id)}
              onBlur={() => setActiveId(current => (current === node.id ? null : current))}
              className={`absolute flex flex-col overflow-hidden rounded-lg border py-1.5 pl-4 pr-2 shadow-sm outline-none transition-opacity duration-150 focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 ${
                teamTinted ? `${accent.bg} ${accent.border}` : 'bg-white'
              } ${shared ? 'border-2 border-gray-700' : teamTinted ? '' : 'border-gray-200'} ${
                dimmed ? 'opacity-25' : 'opacity-100'
              } ${active ? 'shadow-md' : ''}`}
              style={{ left: pos.x, top: pos.y, width: pos.width, height: pos.height }}
            >
              <NodeBox node={node} filter={filter} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
