import {
  EXPERIMENTS,
  OST_TEAMS,
  SOLUTIONS,
  TEAM_ORDER,
  type Experiment,
  type Insight,
  type OstStatus,
  type Solution,
  type Team,
  type TeamId,
} from './data'

export type OstNodeKind = 'outcome' | 'opportunity' | 'solution' | 'experiment'

export const KIND_COLUMNS: Record<OstNodeKind, number> = {
  outcome: 0,
  opportunity: 1,
  solution: 2,
  experiment: 3,
}

export const KIND_LABELS: Record<OstNodeKind, string> = {
  outcome: 'Outcome',
  opportunity: 'Opportunity',
  solution: 'Solution',
  experiment: 'Experiment',
}

export interface OstNode {
  id: string
  kind: OstNodeKind
  title: string
  /** Outcomes carry no status. */
  status: OstStatus | null
  column: number
  /** Teams whose opportunities reach this node, in TEAM_ORDER. Derived, never hand-stored. */
  teams: TeamId[]
  insights?: Insight[]
}

export interface OstEdge {
  key: string
  from: string
  to: string
  /** The team whose path this edge belongs to; a parent→child link serving two teams yields two edges. */
  team: TeamId
}

export interface OstGraph {
  /** Nodes keyed by id; insertion order is depth-first from each outcome in team order. */
  nodes: Map<string, OstNode>
  edges: OstEdge[]
  /** Child node ids per node, in data order. */
  children: Map<string, string[]>
  /** Parent node ids per node, in discovery order. */
  parents: Map<string, string[]>
}

export interface OstData {
  teams: Team[]
  solutions: Record<string, Solution>
  experiments: Record<string, Experiment>
}

const DEFAULT_DATA: OstData = { teams: OST_TEAMS, solutions: SOLUTIONS, experiments: EXPERIMENTS }

export function outcomeId(team: TeamId): string {
  return `outcome-${team}`
}

export function edgeKey(from: string, to: string, team: TeamId): string {
  return `${from}->${to}@${team}`
}

function sortTeams(teams: Iterable<TeamId>): TeamId[] {
  const set = new Set(teams)
  return TEAM_ORDER.filter(t => set.has(t))
}

function pushUnique(map: Map<string, string[]>, key: string, value: string) {
  const list = map.get(key)
  if (!list) map.set(key, [value])
  else if (!list.includes(value)) list.push(value)
}

export function buildOstGraph(data: OstData = DEFAULT_DATA): OstGraph {
  const nodes = new Map<string, OstNode>()
  const teamSets = new Map<string, Set<TeamId>>()
  const edges = new Map<string, OstEdge>()
  const children = new Map<string, string[]>()
  const parents = new Map<string, string[]>()

  const addNode = (node: Omit<OstNode, 'teams' | 'column'>, team: TeamId) => {
    if (!nodes.has(node.id)) {
      nodes.set(node.id, { ...node, column: KIND_COLUMNS[node.kind], teams: [] })
      teamSets.set(node.id, new Set())
    }
    teamSets.get(node.id)!.add(team)
  }

  const link = (from: string, to: string, team: TeamId) => {
    const key = edgeKey(from, to, team)
    if (!edges.has(key)) edges.set(key, { key, from, to, team })
    pushUnique(children, from, to)
    pushUnique(parents, to, from)
  }

  const teams = [...data.teams].sort((a, b) => TEAM_ORDER.indexOf(a.id) - TEAM_ORDER.indexOf(b.id))

  // Depth-first walk from every opportunity: every node reached from a team's opportunity
  // serves that team, which is how shared solutions/experiments get their team sets.
  for (const team of teams) {
    const root = outcomeId(team.id)
    addNode({ id: root, kind: 'outcome', title: team.outcome, status: null }, team.id)

    for (const opp of team.opportunities) {
      addNode({ id: opp.id, kind: 'opportunity', title: opp.title, status: opp.status }, team.id)
      link(root, opp.id, team.id)

      for (const solId of opp.solutions) {
        const sol = data.solutions[solId]
        if (!sol) throw new Error(`Unknown solution ${solId} referenced by ${opp.id}`)
        addNode({ id: sol.id, kind: 'solution', title: sol.title, status: sol.status }, team.id)
        link(opp.id, sol.id, team.id)

        for (const expId of sol.experiments) {
          const exp = data.experiments[expId]
          if (!exp) throw new Error(`Unknown experiment ${expId} referenced by ${sol.id}`)
          addNode(
            { id: exp.id, kind: 'experiment', title: exp.title, status: exp.status, insights: exp.insights },
            team.id,
          )
          link(sol.id, exp.id, team.id)
        }
      }
    }
  }

  for (const [id, node] of nodes) node.teams = sortTeams(teamSets.get(id)!)

  return { nodes, edges: [...edges.values()], children, parents }
}

export function isShared(node: Pick<OstNode, 'teams'>): boolean {
  return node.teams.length > 1
}

function reach(start: string, next: Map<string, string[]>): Set<string> {
  const seen = new Set<string>([start])
  const queue = [start]
  while (queue.length > 0) {
    const id = queue.shift()!
    for (const n of next.get(id) ?? []) {
      if (!seen.has(n)) {
        seen.add(n)
        queue.push(n)
      }
    }
  }
  return seen
}

export interface PathHighlight {
  nodeIds: Set<string>
  edgeKeys: Set<string>
}

/**
 * Every node and edge on a path from `id` up to each outcome it serves, plus everything
 * below it (its solutions/experiments), so hovering a node shows its whole slice of the tree.
 */
export function getPathsForNode(graph: OstGraph, id: string): PathHighlight {
  const up = reach(id, graph.parents)
  const down = reach(id, graph.children)
  const edgeKeys = new Set<string>()
  for (const edge of graph.edges) {
    if ((up.has(edge.from) && up.has(edge.to)) || (down.has(edge.from) && down.has(edge.to))) {
      edgeKeys.add(edge.key)
    }
  }
  return { nodeIds: new Set([...up, ...down]), edgeKeys }
}

export interface GraphFilter {
  team: TeamId | 'all'
  overlapsOnly: boolean
}

/**
 * Subgraph for the current filter. Nodes keep their full derived team sets, so a shared node
 * stays marked as shared (and can name its other teams) even when only one team is shown.
 */
export function filterGraph(graph: OstGraph, filter: GraphFilter): OstGraph {
  let keepNodes = new Set(graph.nodes.keys())

  if (filter.overlapsOnly) {
    keepNodes = new Set()
    for (const node of graph.nodes.values()) {
      if (isShared(node)) for (const id of reach(node.id, graph.parents)) keepNodes.add(id)
    }
  }

  const edges = graph.edges.filter(
    e =>
      keepNodes.has(e.from) &&
      keepNodes.has(e.to) &&
      (filter.team === 'all' || e.team === filter.team),
  )

  const nodes = new Map<string, OstNode>()
  for (const [id, node] of graph.nodes) {
    if (!keepNodes.has(id)) continue
    if (filter.team !== 'all' && !node.teams.includes(filter.team)) continue
    nodes.set(id, node)
  }

  const children = new Map<string, string[]>()
  const parents = new Map<string, string[]>()
  for (const e of edges) {
    pushUnique(children, e.from, e.to)
    pushUnique(parents, e.to, e.from)
  }
  return { nodes, edges, children, parents }
}

/** Logical reading/focus order: each outcome, then its opportunities, solutions and experiments. */
export function focusOrder(graph: OstGraph): string[] {
  const order: string[] = []
  const seen = new Set<string>()
  const visit = (id: string) => {
    if (seen.has(id)) return
    seen.add(id)
    order.push(id)
    for (const child of graph.children.get(id) ?? []) visit(child)
  }
  for (const node of graph.nodes.values()) if (node.kind === 'outcome') visit(node.id)
  for (const id of graph.nodes.keys()) visit(id)
  return order
}
