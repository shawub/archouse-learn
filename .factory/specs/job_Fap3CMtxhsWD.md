# Spec: Redesign /ost as a graph that highlights overlapping solutions and experiments (rerun)

## Summary
Redesign /ost as a single deterministic layered left-to-right graph that highlights solutions/experiments shared across teams, using ID-referenced many-to-many static data with derived team sets.

## Acceptance Criteria
- /ost renders a single layered graph with four columns (Outcome, Opportunity, Solution, Experiment) and no runtime/console errors
- Solutions and experiments are defined once by ID; opportunities list solution IDs and solutions list experiment IDs (many-to-many); no node stores its team set by hand
- Each solution/experiment's team set is derived from the opportunities that reach it via graph traversal
- All existing IDs, titles and statuses from PR #10 are preserved
- The four new overlaps exist in data: (1) learn-sol-t02 also addresses learn-opp-p01; (2) learn-sol-pl01 also addresses learn-opp-p01; (3) new experiment learn-exp-x01 'Re-engagement cohort study' (planned) tests learn-sol-p01 and learn-sol-t02; (4) learn-sol-s02 also addresses learn-opp-t02
- Each of the four overlaps appears as a single node with incoming edges from multiple teams, a shared visual treatment (multi-colour segmented stripe/border), and a 'Shared · N teams' badge; distinguishable without relying on colour alone (badge text + stripe)
- A unit test asserts the derived team set for each of the four overlap nodes
- Team accent colours (indigo/emerald/amber/sky) are preserved; outcome and opportunity nodes take their team's accent; each edge takes the colour of the team it belongs to
- Status chips appear on every node using the existing grey/amber/green/red convention
- Hover or keyboard focus on any node highlights its full path(s) to every outcome it serves and dims unrelated nodes and edges
- Team filter (all | primary | secondary | teacher | platform) works; with one team selected, shared nodes stay visibly marked and the badge names the other teams
- 'Overlaps only' toggle shows only shared nodes and the paths leading to them
- A legend shows team colours, status colours and the shared-node treatment
- Every node is keyboard focusable in logical order (outcome, then its opportunities, solutions, experiments)
- A visually hidden or toggleable nested list presents the same hierarchy, marking shared nodes 'shared with: <teams>'
- The SVG has a <title> and <desc>
- /ost remains in middleware publicPaths
- Layout is deterministic: same data produces identical node positions on every render; a test renders twice and compares positions
- No overlapping node boxes; edges avoid passing behind node boxes where possible
- brand-* classes in the ost components are replaced with a defined palette colour
- No TypeScript errors (npm run typecheck) and existing tests pass

## Implementation Plan
### 1. `src/lib/ost/data.ts`
Rewrite the data model. Keep OstStatus, TeamId, Insight, TEAM_ACCENTS. Replace nested Team/Opportunity/Solution/Experiment with ID-referenced records: Experiment { id, title, status, insights? }; Solution { id, title, status, experimentIds: string[] }; Opportunity { id, title, status, solutionIds: string[] }; Team { id, name, outcome, opportunityIds: string[] } OR keep opportunities nested under team but reference solution/experiment IDs. Export OST_TEAMS (outcomes+opportunities with solutionIds), SOLUTIONS: Record<string,Solution>, EXPERIMENTS: Record<string,Experiment>. Preserve every existing id/title/status. Add overlaps: learn-opp-p01.solutionIds includes learn-sol-p01, learn-sol-t02, learn-sol-pl01; learn-opp-t02.solutionIds includes learn-sol-t02; learn-sol-p01.experimentIds and learn-sol-t02.experimentIds both include learn-exp-x01; add EXPERIMENTS['learn-exp-x01'] = { title: 'Re-engagement cohort study', status: 'planned' }. Add an EDGE_ACCENTS/stroke colour map keyed by TeamId for SVG edge stroke hex values (indigo/emerald/amber/sky).

### 2. `src/lib/ost/graph.ts`
New file. Build a normalized graph from the data: resolve opportunity->solution->experiment references. Provide buildGraph() returning nodes (with kind, id, title, status, teams: Set<TeamId> derived via traversal) and edges (parentId, childId, team). Implement deriveTeams: for each solution/experiment, collect teams of every opportunity that reaches it. Export a deterministic layered layout function computeLayout(graph) that assigns each node an integer column (0=outcome,1=opportunity,2=solution,3=experiment) and a deterministic row ordering (stable sort by a fixed order: team order primary<secondary<teacher<platform, then parent order, then id) producing x/y pixel coordinates with fixed column widths and row heights and no vertical overlap. Keep all numbers constant so output is identical across renders. Export helpers: nodesForOverlapsOnly(graph), pathNodeIds(graph, nodeId) returning the set of ancestor+self node ids that form every path to outcomes, and sharedNodes list.

### 3. `src/lib/ost/graph.test-helpers.ts`
Optional: export pure functions used by tests (buildGraph, deriveTeams, computeLayout) — or just import from graph.ts in tests.

### 4. `src/components/ost/ost-graph.tsx`
New client component rendering the SVG graph. Compute graph+layout once (useMemo on static data, deterministic). Render an <svg> with <title> and <desc>, edges as <path>/<line> coloured per edge team, and nodes as foreignObject or positioned absolute HTML boxes over the SVG. Manage state: filter, overlapsOnly, focusedNodeId. On hover/focus compute pathNodeIds and apply highlight/dim classes. Nodes keyboard focusable (tabIndex, onFocus/onBlur) in logical order. Render shared treatment (segmented stripe of each team accent) + 'Shared · N teams' badge for nodes with teams.size>1; when filtered to one team, badge names the other teams. Include StatusChip on each node.

### 5. `src/components/ost/ost-legend.tsx`
New component: legend for team colours, status colours, and shared-node treatment.

### 6. `src/components/ost/ost-text-alternative.tsx`
New component: visually hidden (sr-only) or toggleable nested list of the full hierarchy (outcome>opportunity>solution>experiment) with shared nodes marked 'shared with: <teams>'.

### 7. `src/components/ost/ost-view.tsx`
Rewrite to orchestrate: filter buttons (all|primary|secondary|teacher|platform), 'Overlaps only' toggle, legend, graph, and text alternative. Pass filter/overlapsOnly state down to OstGraph. Remove dependence on old TeamTree/OpportunityNode nesting.

### 8. `src/components/ost/team-tree.tsx`
Remove (no longer used) or repurpose; delete to avoid dead code referencing old model.

### 9. `src/components/ost/opportunity-node.tsx`
Remove (no longer used); its brand-600/brand-700 insight link classes are replaced in the new graph/text-alternative with a defined palette colour (e.g. indigo-600/indigo-700 or a tailwind brand-* that stays defined). Delete this file.

### 10. `src/components/ost/status-chip.tsx`
Keep as-is (reused by graph nodes).

### 11. `src/app/ost/page.tsx`
Update intro copy to describe the graph (remove 'Click an opportunity to expand it'); keep metadata; widen max-w container (e.g. max-w-7xl) for the laptop-width graph.

### 12. `tests/ost-graph.test.ts`
New test file. Assert: deriveTeams for learn-sol-t02 = {primary, teacher}; learn-sol-pl01 = {primary, platform}; learn-exp-x01 = {primary, teacher}; learn-sol-s02 = {secondary, teacher}. Assert computeLayout is deterministic (call twice, deep-equal positions). Assert overlapsOnly subset contains only shared nodes + their ancestors. Assert no two node boxes overlap (bounding box check).

### 13. `tailwind.config.ts`
Keep brand palette OR ensure the palette colour chosen to replace brand-* link classes is defined. If replacing brand-* with indigo there is no config change; if keeping a 'brand' usage ensure classes referenced are defined.
*Lines: optional*

### 14. `src/middleware.ts`
No change required; confirm '/ost' stays in publicPaths.

## Test Plan
- tests/ost-graph.test.ts: deriveTeams returns the exact derived team set for each overlap node (learn-sol-t02, learn-sol-pl01, learn-exp-x01, learn-sol-s02)
- tests/ost-graph.test.ts: computeLayout called twice on the same graph produces deep-equal node position arrays (determinism)
- tests/ost-graph.test.ts: no two node bounding boxes overlap in the computed layout
- tests/ost-graph.test.ts: nodesForOverlapsOnly returns only shared nodes and their ancestor path nodes (no non-shared leaf nodes)
- tests/ost-graph.test.ts: every existing PR #10 id/title/status is still present in SOLUTIONS/EXPERIMENTS/OST_TEAMS
- tests/ost-graph.test.ts: pathNodeIds for a shared node includes all outcomes it serves (e.g. learn-exp-x01 path reaches both primary and teacher outcomes)
- npm run typecheck passes with no errors
- npm run test passes including all pre-existing tests
- Manual/Build: next build succeeds and /ost renders the graph without errors

## Edge Cases