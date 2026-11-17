import { TEAM_ACCENTS, TEAM_NAMES, type TeamId } from '@/lib/ost/data'
import { isShared, KIND_LABELS, type OstNode as OstNodeData } from '@/lib/ost/graph'
import type { NodeBox } from '@/lib/ost/layout'
import { StatusChip } from './status-chip'

export type NodeEmphasis = 'normal' | 'highlighted' | 'dimmed'

const EMPHASIS_CLASSES: Record<NodeEmphasis, string> = {
  normal: 'opacity-100',
  highlighted: 'opacity-100 shadow-md',
  dimmed: 'opacity-30',
}

// Shared nodes use a dashed, thicker border and squarer corners so the treatment
// reads without colour; single-team nodes keep a thin solid border.
const SHAPE_CLASSES = {
  shared: 'rounded-sm border-2 border-dashed border-gray-700 bg-white',
  outcome: 'rounded-xl border border-gray-200',
  single: 'rounded-lg border border-gray-200 bg-white',
}

export function teamList(teams: TeamId[]): string {
  return teams.map(t => TEAM_NAMES[t]).join(', ')
}

/** Segmented stripe: one equal segment per team accent. */
export function TeamStripe({ teams, shared }: { teams: TeamId[]; shared: boolean }) {
  return (
    <span aria-hidden className={`flex w-full overflow-hidden ${shared ? 'h-2 gap-0.5' : 'h-1.5'}`}>
      {teams.map(team => (
        <span key={team} className={`block h-full flex-1 ${TEAM_ACCENTS[team].dot}`} />
      ))}
    </span>
  )
}

export function SharedBadge({ teams, filterTeam }: { teams: TeamId[]; filterTeam: TeamId | 'all' }) {
  const others = filterTeam === 'all' ? [] : teams.filter(t => t !== filterTeam)
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded border border-gray-700 bg-gray-900 px-1.5 py-0.5 text-[11px] font-semibold text-white">
      <span aria-hidden>⧉</span>
      Shared · {teams.length} teams
      {others.length > 0 && <span className="font-normal text-gray-200">· also {teamList(others)}</span>}
    </span>
  )
}

interface OstNodeProps {
  node: OstNodeData
  box: NodeBox
  filterTeam: TeamId | 'all'
  emphasis: NodeEmphasis
  pinned: boolean
  onEnter: (id: string, via: 'hover' | 'focus') => void
  onLeave: (id: string, via: 'hover' | 'focus') => void
  onToggle: (id: string) => void
}

export function OstNode({ node, box, filterTeam, emphasis, pinned, onEnter, onLeave, onToggle }: OstNodeProps) {
  const shared = isShared(node)
  const shape = shared ? SHAPE_CLASSES.shared : node.kind === 'outcome' ? SHAPE_CLASSES.outcome : SHAPE_CLASSES.single
  const tint = node.kind === 'outcome' ? TEAM_ACCENTS[node.teams[0]].bg : ''
  const label = `${KIND_LABELS[node.kind]}${node.kind === 'outcome' ? '' : ` ${node.id}`}: ${node.title}. ${
    node.status ? `Status ${node.status}. ` : ''
  }${shared ? `Shared by ${node.teams.length} teams: ${teamList(node.teams)}.` : `${TEAM_NAMES[node.teams[0]]} team.`}`

  return (
    <button
      type="button"
      data-node-id={node.id}
      aria-label={label}
      aria-pressed={pinned}
      onMouseEnter={() => onEnter(node.id, 'hover')}
      onMouseLeave={() => onLeave(node.id, 'hover')}
      onFocus={() => onEnter(node.id, 'focus')}
      onBlur={() => onLeave(node.id, 'focus')}
      onClick={() => onToggle(node.id)}
      style={{ left: box.x, top: box.y, width: box.width, height: box.height }}
      className={`absolute flex flex-col overflow-hidden text-left transition-opacity duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 ${shape} ${tint} ${EMPHASIS_CLASSES[emphasis]} ${
        pinned ? 'ring-2 ring-gray-900' : ''
      }`}
    >
      <TeamStripe teams={node.teams} shared={shared} />
      <span className="flex min-h-0 flex-1 flex-col px-3 pb-2 pt-1.5">
        <span className="flex items-baseline gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            {KIND_LABELS[node.kind]}
          </span>
          {node.kind === 'outcome' ? (
            <span className={`text-[11px] font-semibold ${TEAM_ACCENTS[node.teams[0]].text}`}>
              {TEAM_NAMES[node.teams[0]]} team
            </span>
          ) : (
            <code className="truncate text-[11px] text-gray-500">{node.id}</code>
          )}
        </span>
        <span className="mt-0.5 line-clamp-3 text-[13px] leading-[18px] text-gray-900">{node.title}</span>
        <span className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
          {node.status && <StatusChip status={node.status} />}
          {shared && <SharedBadge teams={node.teams} filterTeam={filterTeam} />}
        </span>
      </span>
    </button>
  )
}
