'use client'

import { useMemo, useState } from 'react'
import { TEAM_ACCENTS, type TeamId } from '@/lib/ost/data'
import { filterGraph, focusOrder, getPathsForNode, KIND_LABELS, type OstGraph as OstGraphData } from '@/lib/ost/graph'
import { columnX, computeLayout, edgeLanes, edgePath, NODE_WIDTH } from '@/lib/ost/layout'
import { OstNode, type NodeEmphasis } from './ost-node'

const COLUMN_KINDS = ['outcome', 'opportunity', 'solution', 'experiment'] as const
const HEADER_HEIGHT = 28

interface OstGraphProps {
  graph: OstGraphData
  team: TeamId | 'all'
  overlapsOnly: boolean
}

export function OstGraph({ graph, team, overlapsOnly }: OstGraphProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [pinnedId, setPinnedId] = useState<string | null>(null)

  const visible = useMemo(() => filterGraph(graph, { team, overlapsOnly }), [graph, team, overlapsOnly])
  const layout = useMemo(() => computeLayout(visible), [visible])
  const lanes = useMemo(() => edgeLanes(visible.edges), [visible])
  const order = useMemo(() => focusOrder(visible), [visible])

  const activeId = [hoveredId, focusedId, pinnedId].find(id => id !== null && visible.nodes.has(id)) ?? null
  const highlight = useMemo(() => (activeId ? getPathsForNode(visible, activeId) : null), [visible, activeId])

  const emphasis = (id: string): NodeEmphasis =>
    !highlight ? 'normal' : highlight.nodeIds.has(id) ? 'highlighted' : 'dimmed'

  if (visible.nodes.size === 0) {
    return <p className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500">No nodes match this filter.</p>
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="relative" style={{ width: layout.width, height: layout.height + HEADER_HEIGHT }}>
        {COLUMN_KINDS.map((kind, column) => (
          <div
            key={kind}
            aria-hidden
            style={{ left: columnX(column), width: NODE_WIDTH }}
            className="absolute top-0 text-xs font-semibold uppercase tracking-wide text-gray-500"
          >
            {KIND_LABELS[kind]}
          </div>
        ))}

        <div className="absolute inset-x-0 bottom-0" style={{ top: HEADER_HEIGHT }}>
          <svg
            role="img"
            aria-labelledby="ost-graph-title ost-graph-desc"
            width={layout.width}
            height={layout.height}
            viewBox={`0 0 ${layout.width} ${layout.height}`}
            className="pointer-events-none absolute left-0 top-0"
          >
            <title id="ost-graph-title">Opportunity Solution Tree graph</title>
            <desc id="ost-graph-desc">
              Connectors from each outcome to its opportunities, solutions and experiments, coloured by team. A
              solution or experiment shared by several teams appears once with connectors from each team. The full
              hierarchy is available as a text list below the graph.
            </desc>
            {visible.edges.map(edge => {
              const d = edgePath(layout, edge, lanes.get(edge.key))
              if (!d) return null
              const lit = highlight?.edgeKeys.has(edge.key)
              return (
                <path
                  key={edge.key}
                  d={d}
                  fill="none"
                  strokeLinecap="round"
                  strokeWidth={lit ? 3 : 2}
                  strokeOpacity={!highlight ? 0.75 : lit ? 1 : 0.12}
                  className={`${TEAM_ACCENTS[edge.team].stroke} transition-[stroke-opacity] duration-150`}
                />
              )
            })}
          </svg>

          {order.map(id => {
            const node = visible.nodes.get(id)!
            return (
              <OstNode
                key={id}
                node={node}
                box={layout.positions.get(id)!}
                filterTeam={team}
                emphasis={emphasis(id)}
                pinned={pinnedId === id}
                onEnter={(enteredId, via) => (via === 'hover' ? setHoveredId : setFocusedId)(enteredId)}
                onLeave={(leftId, via) =>
                  (via === 'hover' ? setHoveredId : setFocusedId)(current => (current === leftId ? null : current))
                }
                onToggle={toggledId => setPinnedId(current => (current === toggledId ? null : toggledId))}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
