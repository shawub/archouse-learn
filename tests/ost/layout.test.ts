import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildOstGraph, filterGraph } from '@/lib/ost/graph'
import { computeLayout } from '@/lib/ost/layout'

const graph = buildOstGraph()

test('layout is deterministic across runs', () => {
  assert.deepEqual(computeLayout(buildOstGraph()).positions, computeLayout(buildOstGraph()).positions)
  assert.deepEqual(computeLayout(graph), computeLayout(graph))
})

for (const filter of [
  { team: 'all', overlapsOnly: false },
  { team: 'all', overlapsOnly: true },
  { team: 'teacher', overlapsOnly: false },
] as const) {
  test(`no node boxes overlap (${filter.team}, overlapsOnly=${filter.overlapsOnly})`, () => {
    const sub = filterGraph(graph, filter)
    const boxes = [...computeLayout(sub).positions.values()]
    assert.equal(boxes.length, sub.nodes.size)
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i]
        const b = boxes[j]
        const overlap = a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
        assert.equal(overlap, false)
      }
    }
  })
}

test('each kind gets its own column', () => {
  const layout = computeLayout(graph)
  for (const node of graph.nodes.values()) {
    assert.ok(layout.columns[node.column].includes(node.id))
  }
  assert.deepEqual(
    layout.columns.map(c => c.length),
    [4, 8, 8, 8],
  )
})
