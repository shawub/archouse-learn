import { TEAM_ACCENTS, TEAM_NAMES, TEAM_ORDER, type OstStatus } from '@/lib/ost/data'
import { SharedBadge, TeamStripe } from './ost-node'
import { StatusChip } from './status-chip'

// One row per chip colour: grey / amber / green / red.
const STATUS_GROUPS: OstStatus[][] = [
  ['open', 'hypothesis', 'planned'],
  ['running'],
  ['validated', 'complete'],
  ['invalidated'],
]

export function OstLegend() {
  return (
    <section aria-labelledby="ost-legend-heading" className="rounded-xl border border-gray-200 bg-white p-4 text-sm">
      <h2 id="ost-legend-heading" className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        Legend
      </h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-3">
        <div>
          <h3 className="font-medium text-gray-900">Teams</h3>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {TEAM_ORDER.map(team => (
              <li key={team} className="flex items-center gap-2 text-gray-700">
                <span aria-hidden className={`inline-block h-2.5 w-5 rounded-sm ${TEAM_ACCENTS[team].dot}`} />
                {TEAM_NAMES[team]}
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-gray-500">Connector colour = the team that path belongs to.</p>
        </div>
        <div>
          <h3 className="font-medium text-gray-900">Status</h3>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {STATUS_GROUPS.flat().map(status => (
              <li key={status}>
                <StatusChip status={status} />
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-medium text-gray-900">Shared node</h3>
          <div className="mt-2 flex items-center gap-3">
            <span
              aria-hidden
              className="flex w-24 flex-col overflow-hidden rounded-sm border-2 border-dashed border-gray-700 bg-white"
            >
              <TeamStripe teams={['primary', 'teacher']} shared />
              <span className="h-5" />
            </span>
            <SharedBadge teams={['primary', 'teacher']} filterTeam="all" />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Dashed border, one stripe segment per team, and a badge counting the teams it serves.
          </p>
        </div>
      </div>
    </section>
  )
}
