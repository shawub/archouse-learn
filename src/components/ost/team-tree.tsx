import { TEAM_ACCENTS, type Team } from '@/lib/ost/data'
import { OpportunityNode } from './opportunity-node'

export function TeamTree({ team }: { team: Team }) {
  const accent = TEAM_ACCENTS[team.id]

  return (
    <section className={`rounded-xl border-l-4 ${accent.border} bg-white shadow-sm`}>
      <header className={`rounded-tr-xl px-5 py-4 ${accent.bg}`}>
        <div className={`flex items-center gap-2 text-sm font-semibold ${accent.text}`}>
          <span aria-hidden className={`inline-block h-2.5 w-2.5 rounded-full ${accent.dot}`} />
          {team.name} team
        </div>
        <h2 className="mt-1 text-lg font-semibold text-gray-900">
          <span className="mr-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Outcome</span>
          {team.outcome}
        </h2>
      </header>
      <ul className="space-y-2 p-4">
        {team.opportunities.map(opportunity => (
          <OpportunityNode key={opportunity.id} opportunity={opportunity} />
        ))}
      </ul>
    </section>
  )
}
