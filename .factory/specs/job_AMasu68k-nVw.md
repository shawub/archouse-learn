# Spec: Build /ost view — aggregated OST presentation

## Summary
Add a presentational `/ost` route that renders a static, filterable aggregated Opportunity Solution Tree for all four teams with status chips and expand/collapse at the opportunity level.

## Acceptance Criteria
- Navigating to `/ost` renders the page without runtime errors and without requiring authentication (it is placed outside the `(platform)` auth-guarded group).
- All four teams (primary, secondary, teacher, platform) render, each with its outcome shown as a header and its full opportunity tree beneath.
- Each team header uses a distinct accent colour.
- Every entity (opportunity, solution, experiment, insight) renders a status chip coloured per the convention: open/hypothesis/planned = grey, running = amber, validated/complete = green, invalidated = red.
- A team filter control offers options: all | primary | secondary | teacher | platform; selecting a team shows only that team, selecting 'all' shows every team.
- Opportunities are collapsed by default (showing only to the opportunity level); clicking an opportunity expands to reveal its solutions, experiments, and insights, and clicking again collapses it.
- The hardcoded data exactly matches the entity IDs, titles, and statuses listed in the issue for all four teams.
- `npm run typecheck` (tsc --noEmit) passes with no TypeScript errors.
- Layout is responsive and readable on a laptop screen.

## Implementation Plan
### 1. `src/lib/ost/data.ts`
New file. Define and export TypeScript types and the hardcoded dataset. Types: `OstStatus = 'open' | 'validated' | 'invalidated' | 'hypothesis' | 'planned' | 'running' | 'complete'`; `TeamId = 'primary' | 'secondary' | 'teacher' | 'platform'`; `Insight { id: string; label: string; href: string }`; `Experiment { id: string; title: string; status: 'planned' | 'running' | 'complete'; insights?: Insight[] }`; `Solution { id: string; title: string; status: 'hypothesis' | 'validated' | 'invalidated'; experiments: Experiment[] }`; `Opportunity { id: string; title: string; status: 'open' | 'validated' | 'invalidated'; solutions: Solution[] }`; `Team { id: TeamId; name: string; outcome: string; opportunities: Opportunity[] }`. Export `const OST_TEAMS: Team[]` populated with the exact IDs, titles, and statuses from the issue for primary, secondary, teacher, and platform. Also export `TEAM_ACCENTS: Record<TeamId, { border: string; bg: string; text: string; dot: string }>` mapping each team to distinct Tailwind colour classes (e.g. primary=indigo, secondary=emerald, teacher=amber, platform=sky).

### 2. `src/lib/ost/status.ts`
New file. Export `statusChipClasses(status: OstStatus): string` returning Tailwind classes per colour convention — grey for open/hypothesis/planned, amber for running, green for validated/complete, red for invalidated. Also export `STATUS_LABELS: Record<OstStatus, string>` for human-readable chip text (e.g. 'open', 'running', 'validated').

### 3. `src/components/ost/status-chip.tsx`
New client-agnostic presentational component. `StatusChip({ status }: { status: OstStatus })` renders a small rounded pill using `statusChipClasses` and the label from `STATUS_LABELS`.

### 4. `src/components/ost/opportunity-node.tsx`
New client component (`'use client'`). Renders a single opportunity as a collapsible row: a clickable header showing the opportunity ID, title, and StatusChip plus a chevron; local `useState(false)` controls expansion. When expanded, renders nested solutions, each with its StatusChip, then nested experiments with StatusChips, then insights rendered as links (`<a href={insight.href}>`). Uses indentation/border-left to convey hierarchy. Accepts `opportunity: Opportunity` prop.

### 5. `src/components/ost/team-tree.tsx`
New server-safe component. `TeamTree({ team }: { team: Team })` renders the outcome header styled with the team accent (from TEAM_ACCENTS) and maps opportunities to `<OpportunityNode>`.

### 6. `src/components/ost/ost-view.tsx`
New client component (`'use client'`). Holds the team filter state via `useState<TeamId | 'all'>('all')`. Renders the filter control (a row of buttons or a <select> with options all/primary/secondary/teacher/platform), filters `OST_TEAMS` accordingly, and renders a `<TeamTree>` for each visible team. Imports data from `@/lib/ost/data`.

### 7. `src/app/ost/page.tsx`
New route (placed at `src/app/ost` — outside the `(platform)` group so no auth redirect applies). Default-export a server component that renders a page title/intro and `<OstView />`. Provide its own minimal page chrome (max-width container, padding) since it is outside the platform layout.

## Test Plan
- Manual: run `npm run dev`, visit `/ost`, confirm the page loads without auth redirect and without console/runtime errors.
- Manual: confirm all four teams render with their exact outcomes and that opportunity IDs/titles match the issue data.
- Manual: confirm each status chip colour matches the convention (e.g. `learn-opp-pl02` invalidated = red, `learn-exp-p01` running = amber, `learn-sol-p02` validated = green, `learn-opp-s01` open = grey).
- Manual: select 'platform' in the team filter and confirm only the platform team is shown; select 'all' and confirm all four reappear.
- Manual: confirm opportunities start collapsed; click `learn-opp-p01` to expand and reveal its solution/experiment, then click again to collapse.
- Automated: `npm run typecheck` passes with no errors.
- Automated (optional): `npm run build` compiles the `/ost` route successfully.

## Edge Cases
- Opportunities with no solutions (e.g. `learn-opp-s02`) — ensure expanding shows the opportunity with no child rows and no layout break.
- Solutions with no experiments (e.g. `learn-sol-s02`) — render solution chip with no nested experiment section.
- Experiments with no insights — insight list is optional and must not render an empty block or crash.
- Placing the route outside `(platform)` so it does not inherit the auth guard / sidebar; verify it is not accidentally matched by the platform layout.
- Team accent and status classes must be full static Tailwind class strings (not dynamically concatenated fragments) so Tailwind's JIT does not purge them.
- Filter set to a team that has data always yields a non-empty tree; ensure 'all' is the safe default state.
- Responsive: on narrow widths the filter control and nested indentation should remain readable (wrap buttons, avoid horizontal overflow).