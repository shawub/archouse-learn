import type { OstEdge, OstGraph } from './graph'

export const NODE_WIDTH = 264
export const NODE_HEIGHT = 132
export const COLUMN_GAP = 56
export const ROW_GAP = 12
export const COLUMN_COUNT = 4
/** Vertical spacing between parallel edges that share a parent→child link but belong to different teams. */
export const LANE_SPACING = 4

export interface NodeBox {
  x: number
  y: number
  width: number
  height: number
}

export interface OstLayout {
  positions: Map<string, NodeBox>
  /** Node ids per column, top to bottom. */
  columns: string[][]
  width: number
  height: number
}

export function columnX(column: number): number {
  return column * (NODE_WIDTH + COLUMN_GAP)
}

const center = (box: NodeBox) => box.y + box.height / 2
const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length

/**
 * Deterministic layered layout: one fixed-x column per node kind. Within a column nodes are
 * ordered by the mean rank of their parents (shared nodes settle between the teams they serve),
 * ties broken by insertion order then id. Rows are then placed as close as possible to their
 * neighbours without overlapping. Pure: no randomness, no time, no DOM measurement.
 */
export function computeLayout(graph: OstGraph): OstLayout {
  const insertion = new Map<string, number>()
  let i = 0
  for (const id of graph.nodes.keys()) insertion.set(id, i++)

  const columns: string[][] = Array.from({ length: COLUMN_COUNT }, () => [])
  for (const node of graph.nodes.values()) columns[node.column].push(node.id)

  const rank = new Map<string, number>()
  columns.forEach((ids, column) => {
    if (column > 0) {
      const key = new Map<string, number>()
      for (const id of ids) {
        const parentRanks = (graph.parents.get(id) ?? []).filter(p => rank.has(p)).map(p => rank.get(p)!)
        key.set(id, parentRanks.length > 0 ? mean(parentRanks) : Number.POSITIVE_INFINITY)
      }
      ids.sort(
        (a, b) =>
          key.get(a)! - key.get(b)! ||
          insertion.get(a)! - insertion.get(b)! ||
          (a < b ? -1 : a > b ? 1 : 0),
      )
    }
    ids.forEach((id, index) => rank.set(id, index))
  })

  const positions = new Map<string, NodeBox>()

  const place = (column: number, neighbours: (id: string) => string[]) => {
    let nextFreeY = 0
    for (const id of columns[column]) {
      const placed = neighbours(id).filter(n => positions.has(n)).map(n => center(positions.get(n)!))
      const desired = placed.length > 0 ? mean(placed) - NODE_HEIGHT / 2 : nextFreeY
      const y = Math.round(Math.max(desired, nextFreeY, 0))
      positions.set(id, { x: columnX(column), y, width: NODE_WIDTH, height: NODE_HEIGHT })
      nextFreeY = y + NODE_HEIGHT + ROW_GAP
    }
  }

  // Opportunities are the spine; solutions and experiments follow their parents,
  // and each outcome centres on its opportunities.
  const parentsOf = (id: string) => graph.parents.get(id) ?? []
  const childrenOf = (id: string) => graph.children.get(id) ?? []
  place(1, () => [])
  place(2, parentsOf)
  place(3, parentsOf)
  place(0, childrenOf)

  let height = 0
  for (const box of positions.values()) height = Math.max(height, box.y + box.height)
  const usedColumns = columns.filter(c => c.length > 0).length

  return {
    positions,
    columns,
    width: usedColumns > 0 ? columnX(COLUMN_COUNT - 1) + NODE_WIDTH : 0,
    height,
  }
}

/**
 * SVG path for an edge: a horizontal S-curve from the parent's right edge to the child's left
 * edge. Columns are adjacent, so every curve stays inside the gutter and never runs behind a box.
 * `lane` offsets parallel edges for different teams on the same parent→child link.
 */
export function edgePath(layout: OstLayout, edge: OstEdge, lane = 0): string | null {
  const from = layout.positions.get(edge.from)
  const to = layout.positions.get(edge.to)
  if (!from || !to) return null
  const x1 = from.x + from.width
  const y1 = center(from) + lane * LANE_SPACING
  const x2 = to.x
  const y2 = center(to) + lane * LANE_SPACING
  const mid = (x1 + x2) / 2
  return `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`
}

/** Lane offset per edge key: parallel team edges on one link are spread symmetrically. */
export function edgeLanes(edges: OstEdge[]): Map<string, number> {
  const groups = new Map<string, OstEdge[]>()
  for (const e of edges) {
    const k = `${e.from}->${e.to}`
    const g = groups.get(k)
    if (g) g.push(e)
    else groups.set(k, [e])
  }
  const lanes = new Map<string, number>()
  for (const group of groups.values()) {
    group.forEach((e, index) => lanes.set(e.key, index - (group.length - 1) / 2))
  }
  return lanes
}
