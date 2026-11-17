import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildOstGraph, filterGraph, focusOrder, getPathsForNode, isShared, outcomeId } from '@/lib/ost/graph'

const graph = buildOstGraph()

const OVERLAPS = {
  'learn-sol-t02': ['primary', 'teacher'],
  'learn-sol-pl01': ['primary', 'platform'],
  'learn-exp-x01': ['primary', 'teacher'],
  'learn-sol-s02': ['secondary', 'teacher'],
} as const

for (const [id, teams] of Object.entries(OVERLAPS)) {
  test(`${id} derives teams ${teams.join(' + ')}`, () => {
    const node = graph.nodes.get(id)
    assert.ok(node, `${id} is in the graph`)
    assert.deepEqual(node.teams, teams)
    assert.equal(isShared(node), true)
  })

  test(`${id} is one node with incoming edges from multiple teams`, () => {
    const incoming = graph.edges.filter(e => e.to === id)
    assert.ok(incoming.length >= 2)
    assert.deepEqual([...new Set(incoming.map(e => e.team))].sort(), [...teams].sort())
    assert.equal(focusOrder(graph).filter(n => n === id).length, 1)
  })
}

test('sharing propagates to experiments under a shared solution', () => {
  // Reached through learn-sol-t02 / learn-sol-pl01 from learn-opp-p01, so they serve primary too.
  assert.deepEqual(graph.nodes.get('learn-exp-t02')?.teams, ['primary', 'teacher'])
  assert.deepEqual(graph.nodes.get('learn-exp-pl01')?.teams, ['primary', 'platform'])
  const shared = [...graph.nodes.values()].filter(isShared).map(n => n.id).sort()
  assert.deepEqual(shared, [...Object.keys(OVERLAPS), 'learn-exp-t02', 'learn-exp-pl01'].sort())
})

test('non-overlap solution belongs to one team', () => {
  const node = graph.nodes.get('learn-sol-p02')!
  assert.deepEqual(node.teams, ['primary'])
  assert.equal(isShared(node), false)
})

test('getPathsForNode on learn-exp-x01 spans the primary and teacher outcomes', () => {
  const { nodeIds, edgeKeys } = getPathsForNode(graph, 'learn-exp-x01')
  for (const id of [
    outcomeId('primary'),
    outcomeId('teacher'),
    'learn-opp-p01',
    'learn-opp-t02',
    'learn-sol-p01',
    'learn-sol-t02',
  ]) {
    assert.ok(nodeIds.has(id), `${id} is highlighted`)
  }
  assert.equal(nodeIds.has(outcomeId('secondary')), false)
  assert.equal(nodeIds.has('learn-exp-t02'), false)
  assert.ok(edgeKeys.has('learn-sol-t02->learn-exp-x01@teacher'))
  assert.ok(edgeKeys.has('learn-opp-t02->learn-sol-t02@teacher'))
})

test('focus order is outcome, then its opportunities, solutions and experiments', () => {
  const order = focusOrder(graph)
  assert.deepEqual(order.slice(0, 5), [
    outcomeId('primary'),
    'learn-opp-p01',
    'learn-sol-p01',
    'learn-exp-p01',
    'learn-exp-x01',
  ])
  assert.equal(order.length, graph.nodes.size)
})

test('single-team filter keeps shared nodes with their full team sets', () => {
  const teacher = filterGraph(graph, { team: 'teacher', overlapsOnly: false })
  assert.deepEqual(teacher.nodes.get('learn-sol-s02')?.teams, ['secondary', 'teacher'])
  assert.equal(teacher.nodes.has('learn-sol-p01'), false)
  assert.ok(teacher.edges.every(e => e.team === 'teacher'))
})

test('overlaps-only keeps shared nodes and the paths leading to them', () => {
  const overlaps = filterGraph(graph, { team: 'all', overlapsOnly: true })
  for (const id of Object.keys(OVERLAPS)) assert.ok(overlaps.nodes.has(id))
  assert.ok(overlaps.nodes.has('learn-sol-p01'), 'parent of shared experiment kept')
  assert.ok(overlaps.nodes.has(outcomeId('platform')))
  assert.equal(overlaps.nodes.has('learn-sol-p02'), false)
  assert.equal(overlaps.nodes.has('learn-exp-p01'), false)
})
