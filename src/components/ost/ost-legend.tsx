import { TEAM_ACCENTS, TEAM_NAMES, TEAM_ORDER } from '@/lib/ost/data'
import type { OstStatus } from '@/lib/ost/data'
import { StatusChip } from './status-chip'
import { SharedStripe } from './ost-graph'

const STATUS_GROUPS: { statuses: OstStatus[]; label: string }[] = [
  { statuses: ['open', 'hypothesis', 'planned'], label: 'not yet tested' },
  { statuses: ['running'], label: 'in progress' },
  { statuses: ['validated', 'complete'], label: 'validated / done' },
  { statuses: ['invalidated'], label: 'invalidated' },
]

export function OstLegend() {
  return (
    <section
      aria-label="Legend"
      className="grid gap-4 rounded-xl border border-gray-200 bg-white p-4 text-sm shadow-sm md:grid-cols-3"
    >
      <div>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Teams</h2>
        <ul className="flex flex-wrap gap-x-4 gap-y-1">
          {TEAM_ORDER.map(team => (
            <li key={team} className="inline-flex items-center gap-2 text-gray-700">
              <span aria-hidden className={`inline-block h-2.5 w-6 rounded-full ${TEAM_ACCENTS[team].dot}`} />
              {TEAM_NAMES[team]}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-gray-500">Lines take the colour of the team they belong to.</p>
      </div>
      <div>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Status</h2>
        <ul className="space-y-1">
          {STATUS_GROUPS.map(group => (
            <li key={group.label} className="flex flex-wrap items-center gap-1 text-gray-700">
              {group.statuses.map(status => (
                <StatusChip key={status} status={status} />
              ))}
              <span className="ml-1 text-xs text-gray-500">{group.label}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Shared node</h2>
        <div className="relative flex h-14 w-56 flex-col justify-center overflow-hidden rounded-lg border-2 border-gray-700 bg-white pl-4 pr-2">
          <SharedStripe teams={['primary', 'teacher']} className="absolute inset-y-0 left-0 w-2" />
          <span className="text-xs text-gray-900">Serves more than one team</span>
          <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-full border border-dashed border-gray-500 px-1.5 text-[10px] font-semibold text-gray-800">
            <span aria-hidden>⧉</span>
            Shared · 2 teams
          </span>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Dark border, striped edge with each team&apos;s colour, and a badge naming the team count.
        </p>
      </div>
    </section>
  )
}
