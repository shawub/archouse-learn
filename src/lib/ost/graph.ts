import {
  EXPERIMENTS,
  OST_TEAMS,
  SOLUTIONS,
  TEAM_ORDER,
  type Insight,
  type OstStatus,
  type Team,
  type TeamId,
} from './data'

export type NodeKind = 'outcome' | 'opportunity' | 'solution' | 'experiment'

export const KIND_COLUMN: Record<NodeKind, number> = {
  outcome: 0,
  opportunity: 1,
  solution: 2,
  experiment: 3,
}

export const KIND_LABELS: Record<NodeKind, string> = {
  outcome: 'Outcome',
  opportunity: 'Opportunity',
  solution: 'Solution',
  experiment: 'Experiment',
}

export interface GraphNode {
  id: string
  kind: NodeKind
  title: string
  // Outcomes carry no status in the data.
  status: OstStatus | null
  // Derived from the opportunities that reach this node, in TEAM_ORDER.
  teams: TeamId[]
  insights?: Insight[]
}

export interface GraphEdge {
  id: string
  parentId: string
  childId: string
  team: TeamId
}

export interface OstGraph {
  // Depth-first pre-order: outcome, its first opportunity, that opportunity's
  // solutions and their experiments, then the next opportunity, and so on.
  // Shared nodes appear once, at their first visit.
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export function outcomeId(team: TeamId): string {
  return `outcome-${team}`
}

function sortTeams(teams: Iterable<TeamId>): TeamId[] {
  const set = new Set(teams)
  return TEAM_ORDER.filter(team => set.has(team))
}

/** Teams reaching each solution and experiment, derived by walking opportunity → solution → experiment. */
export function deriveTeams(teams: Team[] = OST_TEAMS): Map<string, TeamId[]> {
  const reached = new Map<string, Set<TeamId>>()
  const add = (id: string, team: TeamId) => {
    let set = reached.get(id)
    if (!set) reached.set(id, (set = new Set()))
    set.add(team)
  }
  for (const team of teams) {
    for (const opportunity of team.opportunities) {
      for (const solutionId of opportunity.solutionIds) {
        add(solutionId, team.id)
        for (const experimentId of SOLUTIONS[solutionId]?.experimentIds ?? []) add(experimentId, team.id)
      }
    }
  }
  return new Map([...reached].map(([id, set]) => [id, sortTeams(set)]))
}

export function buildGraph(teams: Team[] = OST_TEAMS): OstGraph {
  const derived = deriveTeams(teams)
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []
  const seen = new Set<string>()
  const edgeIds = new Set<string>()

  const visit = (node: GraphNode) => {
    if (seen.has(node.id)) return false
    seen.add(node.id)
    nodes.push(node)
    return true
  }
  const connect = (parentId: string, childId: string, team: TeamId) => {
    const id = `${parentId}->${childId}@${team}`
    if (edgeIds.has(id)) return
    edgeIds.add(id)
    edges.push({ id, parentId, childId, team })
  }

  for (const team of teams) {
    const oid = outcomeId(team.id)
    visit({ id: oid, kind: 'outcome', title: team.outcome, status: null, teams: [team.id] })

    for (const opportunity of team.opportunities) {
      visit({
        id: opportunity.id,
        kind: 'opportunity',
        title: opportunity.title,
        status: opportunity.status,
        teams: [team.id],
      })
      connect(oid, opportunity.id, team.id)

      for (const solutionId of opportunity.solutionIds) {
        const solution = SOLUTIONS[solutionId]
        if (!solution) throw new Error(`Unknown solution ${solutionId} on ${opportunity.id}`)
        const solutionTeams = derived.get(solution.id)!
        visit({
          id: solution.id,
          kind: 'solution',
          title: solution.title,
          status: solution.status,
          teams: solutionTeams,
        })
        connect(opportunity.id, solution.id, team.id)

        for (const experimentId of solution.experimentIds) {
          const experiment = EXPERIMENTS[experimentId]
          if (!experiment) throw new Error(`Unknown experiment ${experimentId} on ${solution.id}`)
          visit({
            id: experiment.id,
            kind: 'experiment',
            title: experiment.title,
            status: experiment.status,
            teams: derived.get(experiment.id)!,
            insights: experiment.insights,
          })
          // One edge per team that reaches the experiment through this solution.
          for (const t of solutionTeams) connect(solution.id, experiment.id, t)
        }
      }
    }
  }

  return { nodes, edges }
}

export function isShared(node: GraphNode): boolean {
  return node.teams.length > 1
}

export function sharedNodes(graph: OstGraph): GraphNode[] {
  return graph.nodes.filter(isShared)
}

/** The node plus every ancestor, i.e. every node on every path from it up to an outcome. */
export function pathNodeIds(graph: OstGraph, nodeId: string): Set<string> {
  const parents = new Map<string, string[]>()
  for (const edge of graph.edges) {
    const list = parents.get(edge.childId) ?? []
    list.push(edge.parentId)
    parents.set(edge.childId, list)
  }
  const result = new Set<string>()
  const stack = [nodeId]
  while (stack.length > 0) {
    const id = stack.pop()!
    if (result.has(id)) continue
    result.add(id)
    stack.push(...(parents.get(id) ?? []))
  }
  return result
}

/** Shared nodes and every node on the paths leading to them. */
export function nodesForOverlapsOnly(graph: OstGraph): Set<string> {
  const result = new Set<string>()
  for (const node of sharedNodes(graph)) {
    for (const id of pathNodeIds(graph, node.id)) result.add(id)
  }
  return result
}

export type TeamFilter = TeamId | 'all'

/**
 * Subgraph shown for a team filter and the "overlaps only" toggle. Nodes keep
 * their full derived team list so shared nodes stay marked under a team filter.
 */
export function filterGraph(graph: OstGraph, team: TeamFilter, overlapsOnly: boolean): OstGraph {
  const overlapIds = overlapsOnly ? nodesForOverlapsOnly(graph) : null
  const nodes = graph.nodes.filter(
    node => (team === 'all' || node.teams.includes(team)) && (!overlapIds || overlapIds.has(node.id)),
  )
  const kept = new Set(nodes.map(node => node.id))
  const edges = graph.edges.filter(
    edge => kept.has(edge.parentId) && kept.has(edge.childId) && (team === 'all' || edge.team === team),
  )
  return { nodes, edges }
}

// Layout constants. Fixed numbers keep the layout identical on every render.
export const NODE_WIDTH = 256
export const NODE_HEIGHT = 96
export const INSIGHT_HEIGHT = 16
export const COLUMN_GAP = 56
export const ROW_GAP = 12
export const TEAM_GAP = 24
export const PADDING = 8

export interface NodePosition {
  id: string
  x: number
  y: number
  width: number
  height: number
}

export interface Layout {
  positions: NodePosition[]
  byId: Map<string, NodePosition>
  width: number
  height: number
}

function nodeHeight(node: GraphNode): number {
  return NODE_HEIGHT + (node.insights?.length ?? 0) * INSIGHT_HEIGHT
}

function columnX(kind: NodeKind): number {
  return PADDING + KIND_COLUMN[kind] * (NODE_WIDTH + COLUMN_GAP)
}

/**
 * Layered left-to-right layout. Opportunities are stacked in team order; each
 * outcome is centred on its opportunities; solutions and experiments are placed
 * at the mean height of their parents, then pushed down just enough to avoid
 * overlapping the node above. Edges only ever span adjacent columns, so they
 * run through the gutters rather than behind node boxes.
 */
export function computeLayout(graph: OstGraph): Layout {
  const order = new Map(graph.nodes.map((node, index) => [node.id, index]))
  const byId = new Map<string, NodePosition>()
  const parents = new Map<string, string[]>()
  for (const edge of graph.edges) {
    const list = parents.get(edge.childId) ?? []
    if (!list.includes(edge.parentId)) list.push(edge.parentId)
    parents.set(edge.childId, list)
  }
  const ofKind = (kind: NodeKind) => graph.nodes.filter(node => node.kind === kind)
  const centre = (id: string) => {
    const pos = byId.get(id)!
    return pos.y + pos.height / 2
  }

  // Opportunities: stacked in data order with extra space between teams.
  let cursor = PADDING
  let previousTeam: TeamId | null = null
  for (const node of ofKind('opportunity')) {
    if (previousTeam && previousTeam !== node.teams[0]) cursor += TEAM_GAP
    const height = nodeHeight(node)
    byId.set(node.id, { id: node.id, x: columnX('opportunity'), y: cursor, width: NODE_WIDTH, height })
    cursor += height + ROW_GAP
    previousTeam = node.teams[0]
  }

  const placeByParents = (kind: NodeKind, childrenOf?: (id: string) => string[]) => {
    const wanted = ofKind(kind).map(node => {
      const related = childrenOf ? childrenOf(node.id) : (parents.get(node.id) ?? [])
      const placed = related.filter(id => byId.has(id))
      const desired = placed.length > 0 ? placed.reduce((sum, id) => sum + centre(id), 0) / placed.length : 0
      return { node, desired }
    })
    wanted.sort((a, b) => a.desired - b.desired || order.get(a.node.id)! - order.get(b.node.id)!)
    let bottom = PADDING - ROW_GAP
    for (const { node, desired } of wanted) {
      const height = nodeHeight(node)
      const y = Math.max(Math.round(desired - height / 2), bottom + ROW_GAP, PADDING)
      byId.set(node.id, { id: node.id, x: columnX(kind), y, width: NODE_WIDTH, height })
      bottom = y + height
    }
  }

  const children = new Map<string, string[]>()
  for (const edge of graph.edges) {
    const list = children.get(edge.parentId) ?? []
    if (!list.includes(edge.childId)) list.push(edge.childId)
    children.set(edge.parentId, list)
  }
  placeByParents('outcome', id => children.get(id) ?? [])
  placeByParents('solution')
  placeByParents('experiment')

  const positions = graph.nodes.map(node => byId.get(node.id)!)
  const width = positions.reduce((max, p) => Math.max(max, p.x + p.width), 0) + PADDING
  const height = positions.reduce((max, p) => Math.max(max, p.y + p.height), 0) + PADDING
  return { positions, byId, width, height }
}

/** SVG path for an edge: a horizontal S-curve from the parent's right edge to the child's left edge. */
export function edgePath(from: NodePosition, to: NodePosition, offset = 0): string {
  const x1 = from.x + from.width
  const y1 = from.y + from.height / 2 + offset
  const x2 = to.x
  const y2 = to.y + to.height / 2 + offset
  const mid = (x1 + x2) / 2
  return `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`
}
