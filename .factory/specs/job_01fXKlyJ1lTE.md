# Spec: Redesign /ost as a graph that highlights overlapping solutions and experiments

## Summary
Redesign /ost as a deterministic, layered left-to-right graph that normalizes OST data into shared nodes, highlights overlaps where solutions/experiments serve multiple teams, and supports path-highlighting, filtering, an overlaps-only toggle, a legend, and an accessible text alternative.

## Acceptance Criteria
- /ost renders a single layered graph with four columns (Outcome, Opportunity, Solution, Experiment) without runtime or hydration errors.
- Each of the four specified overlaps renders as exactly one node with incoming edges from multiple teams, a multi-colour/segmented-stripe border, and a 'Shared · N teams' badge; the shared treatment is distinguishable without colour (badge text plus border/shape).
- Shared-node team sets are derived from the data (opportunities that reach the node), not hand-stored; a unit test asserts the derived team sets for learn-sol-t02, learn-sol-pl01, learn-exp-x01, and learn-sol-s02.
- Hovering or keyboard-focusing any node highlights the full path(s) to every outcome it serves and dims unrelated nodes and edges.
- Team filter (all | primary | secondary | teacher | platform) works; with one team selected, shared nodes remain visibly marked as shared and their badge lists the other teams.
- An 'Overlaps only' toggle shows only shared nodes and the paths leading to them.
- A legend is present showing team colours, status colours, and the shared-node treatment.
- A visually hidden (or toggleable) nested list presents the full hierarchy with shared nodes marked 'shared with: <teams>'.
- The SVG edge layer has a <title> and <desc>; every node is keyboard focusable in logical order (outcome, then its opportunities, solutions, experiments).
- Layout is deterministic: a test renders the layout twice from the same data and asserts identical node positions.
- Status chips remain on every node following the existing grey/amber/green/red convention.
- /ost remains in middleware publicPaths; brand-* insight link classes are replaced with a defined palette colour.
- pnpm/npm typecheck passes with no TypeScript errors and all existing tests pass.

## Implementation Plan
### 1. `src/lib/ost/data.ts`
Restructure static data into normalized shape. Keep OstStatus, TeamId, TEAM_ACCENTS. Define new types: Experiment { id, title, status } (no nested), Solution { id, title, status, experiments: string[] } where experiments is a list of experiment IDs, Opportunity { id, title, status, solutions: string[] } referencing solution IDs, Team { id, name, outcome, opportunities: Opportunity[] }. Add top-level record maps SOLUTIONS: Record<string, Solution> and EXPERIMENTS: Record<string, Experiment> defined once by ID. Port every existing ID/title/status from PR #10 unchanged. Wire the four overlaps: learn-opp-p01.solutions includes learn-sol-t02 and learn-sol-pl01; add EXPERIMENTS['learn-exp-x01'] { title 'Re-engagement cohort study', status 'planned' } and add it to learn-sol-p01.experiments and learn-sol-t02.experiments; add learn-sol-s02 to learn-opp-t02.solutions. Keep brand replacement note: insights palette colour.
*Lines: whole file*

### 2. `src/lib/ost/graph.ts`
New module. Build a normalized graph from OST_TEAMS + SOLUTIONS + EXPERIMENTS. Export buildOstGraph() returning nodes (keyed by id, each with kind 'outcome'|'opportunity'|'solution'|'experiment', title, status, column index, and derived teams: TeamId[]) and edges (parentId -> childId, each carrying a teamId for colouring/dedup). Derive teams for each solution/experiment by traversing from every opportunity that reaches it (BFS over the reference graph), deduped and ordered by a fixed TeamId order. Expose helper isShared(node) => teams.length > 1. Provide getPathsForNode(id) returning the set of node ids and edge keys on all paths from the node up to every outcome it serves (and optionally down to descendants) for highlighting.
*Lines: new file*

### 3. `src/lib/ost/layout.ts`
New module. computeLayout(graph) producing deterministic x/y positions. Columns at fixed x by kind (0..3). Within each column, order nodes deterministically (stable sort by a computed key: parent order then insertion order then id) so positions are identical across renders. Assign y by index with fixed row height and gap; no overlapping boxes. Return Map<nodeId, {x,y,width,height}> plus overall svg width/height. Pure function, no randomness, no Date/Math.random.
*Lines: new file*

### 4. `src/components/ost/ost-graph.tsx`
New client component replacing team-tree rendering inside OstView. Consume buildOstGraph + computeLayout. Render an SVG edge layer (absolutely positioned) with <title>/<desc>, drawing one path per edge coloured by its team accent, routed to avoid passing behind boxes where avoidable (orthogonal/curved connectors entering/exiting node midpoints). Render nodes as positioned HTML divs over the SVG. Manage state for hovered/focused node, active filter, and overlaps-only toggle. On hover/focus compute highlight set via getPathsForNode and apply full-opacity to in-path nodes/edges and dim (opacity/greyscale) others. Nodes are buttons/focusable in logical DOM order (outcome then its opportunities, solutions, experiments) even if visually positioned.
*Lines: new file*

### 5. `src/components/ost/ost-node.tsx`
New component for a single positioned node. Shows kind label, id code, title, StatusChip. If shared, render segmented stripe border (one segment per team accent) plus a 'Shared · N teams' badge; use a distinct border style/shape so it is distinguishable without colour. Non-shared outcome/opportunity nodes take their single team's accent border. Use only fully static Tailwind class strings (lookup maps keyed by TeamId/status, no dynamic string concatenation of colour classes).
*Lines: new file*

### 6. `src/components/ost/ost-legend.tsx`
New component rendering the legend: team colour swatches with names, status colour chips with labels, and a sample of the shared-node treatment (segmented stripe + badge).
*Lines: new file*

### 7. `src/components/ost/ost-text-alternative.tsx`
New component rendering a nested <ul> hierarchy (outcome > opportunity > solution > experiment) from the graph, with shared nodes annotated 'shared with: <teams>'. Visually hidden by default (sr-only) with a toggle button to reveal it for sighted users.
*Lines: new file*

### 8. `src/components/ost/ost-view.tsx`
Rework to orchestrate the new graph: keep the team filter buttons, add an 'Overlaps only' toggle button (aria-pressed), render OstLegend, OstGraph (passing filter + overlapsOnly), and OstTextAlternative. Pass filter so that when a single team is selected the graph still marks shared nodes and lists other teams in badges. Remove direct TeamTree usage.
*Lines: whole file*

### 9. `src/components/ost/status-chip.tsx`
No logic change; ensure it still imports OstStatus from data after type refactor.
*Lines: n/a*

### 10. `src/components/ost/team-tree.tsx`
Remove (no longer used) or repurpose; delete file and any import.
*Lines: whole file*

### 11. `src/components/ost/opportunity-node.tsx`
Remove (collapsible list replaced by graph). Delete file; move the brand-* insight link fix into wherever insights still render (text alternative or node) using a defined palette colour (e.g. indigo-600/indigo-700 or a new palette token) instead of brand-600/brand-700.
*Lines: whole file*

### 12. `src/app/ost/page.tsx`
Update intro copy from 'Click an opportunity to expand it' to reflect the graph interaction ('Hover or focus a node to trace its paths; shared nodes are marked'). Consider widening max-w for laptop presentation (e.g. max-w-7xl) since the graph is horizontal.
*Lines: page body*

### 13. `src/middleware.ts`
No change required; confirm '/ost' stays in publicPaths (regression guard in tests).
*Lines: publicPaths*

### 14. `tests/ost/graph.test.ts`
New test: build graph and assert derived team sets — learn-sol-t02 => {primary, teacher}, learn-sol-pl01 => {primary, platform}, learn-exp-x01 => {primary, teacher}, learn-sol-s02 => {secondary, teacher}. Assert isShared true for these four and that each has exactly one normalized node with multiple incoming edges.
*Lines: new file*

### 15. `tests/ost/layout.test.ts`
New test: compute layout twice from the same graph and deep-equal the node position map (determinism). Assert no two node boxes in the same column overlap.
*Lines: new file*

### 16. `tests/ost/public.test.ts`
New/updated test asserting '/ost' is present in middleware publicPaths (or that middleware allows it).
*Lines: new file*

## Test Plan
- graph.test.ts: derived teams for learn-sol-t02 equal [primary, teacher] (order by fixed TeamId order).
- graph.test.ts: derived teams for learn-sol-pl01 equal [primary, platform].
- graph.test.ts: derived teams for learn-exp-x01 equal [primary, teacher].
- graph.test.ts: derived teams for learn-sol-s02 equal [secondary, teacher].
- graph.test.ts: each of the four overlap nodes appears exactly once in the node map and has >=2 incoming edges with distinct teamIds.
- graph.test.ts: non-overlap solution (e.g. learn-sol-p02) has exactly one team and isShared is false.
- layout.test.ts: computeLayout(graph) called twice returns identical position maps (deterministic).
- layout.test.ts: within each column no two node boxes' bounding rects overlap.
- public.test.ts: middleware publicPaths includes '/ost'.
- getPathsForNode returns, for learn-exp-x01, node ids spanning both the primary and teacher outcome paths.
- typecheck: npm run typecheck exits 0.
- existing suite: npm test passes with no regressions.

## Edge Cases