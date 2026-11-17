import { test } from 'node:test'
import assert from 'node:assert/strict'
import { EXPERIMENTS, OST_TEAMS, SOLUTIONS } from '@/lib/ost/data'
import {
  buildGraph,
  computeLayout,
  deriveTeams,
  filterGraph,
  isShared,
  nodesForOverlapsOnly,
  outcomeId,
  pathNodeIds,
  sharedNodes,
} from '@/lib/ost/graph'

test('derives the team set of each overlap from the data', () => {
  const teams = deriveTeams()
  assert.deepEqual(teams.get('learn-sol-t02'), ['primary', 'teacher'])
  assert.deepEqual(teams.get('learn-sol-pl01'), ['primary', 'platform'])
  assert.deepEqual(teams.get('learn-exp-x01'), ['primary', 'teacher'])
  assert.deepEqual(teams.get('learn-sol-s02'), ['secondary', 'teacher'])
})

test('each overlap is a single node with edges from more than one team', () => {
  const graph = buildGraph()
  for (const id of ['learn-sol-t02', 'learn-sol-pl01', 'learn-exp-x01', 'learn-sol-s02']) {
    assert.equal(graph.nodes.filter(node => node.id === id).length, 1, id)
    const incomingTeams = new Set(graph.edges.filter(edge => edge.childId === id).map(edge => edge.team))
    assert.ok(incomingTeams.size >= 2, `${id} has edges from ${[...incomingTeams].join(', ')}`)
  }
  // learn-exp-x01 is tested by two solutions.
  const x01Parents = new Set(graph.edges.filter(e => e.childId === 'learn-exp-x01').map(e => e.parentId))
  assert.deepEqual([...x01Parents].sort(), ['learn-sol-p01', 'learn-sol-t02'])
})

test('only the expected nodes are shared', () => {
  const ids = sharedNodes(buildGraph()).map(node => node.id).sort()
  assert.deepEqual(ids, ['learn-exp-t02', 'learn-exp-x01', 'learn-sol-pl01', 'learn-sol-s02', 'learn-sol-t02', 'learn-exp-pl01'].sort())
})

test('keeps every PR #10 id, title and status', () => {
  const opportunities = Object.fromEntries(OST_TEAMS.flatMap(t => t.opportunities).map(o => [o.id, [o.title, o.status]]))
  assert.deepEqual(opportunities, {
    'learn-opp-p01': ["Students don't return after day 1", 'open'],
    'learn-opp-p02': ['Module instructions too complex for young readers', 'validated'],
    'learn-opp-s01': ['Students submit assignments at the last minute without review', 'open'],
    'learn-opp-s02': ["Students can't tell which assignments are highest priority", 'open'],
    'learn-opp-t01': ['Teachers spend too long formatting lesson plans', 'validated'],
    'learn-opp-t02': ["Teachers can't see which students are struggling until it's too late", 'open'],
    'learn-opp-pl01': ['Lesson load time spikes during morning peak', 'open'],
    'learn-opp-pl02': ['Login page cold-start latency above SLA', 'invalidated'],
  })
  const solutions = Object.fromEntries(Object.values(SOLUTIONS).map(s => [s.id, [s.title, s.status]]))
  assert.deepEqual(solutions, {
    'learn-sol-p01': ['Daily streak reminder', 'hypothesis'],
    'learn-sol-p02': ['Simplified language + illustrations', 'validated'],
    'learn-sol-s01': ['Draft save with progress indicator', 'hypothesis'],
    'learn-sol-s02': ['Teacher-set priority badges on assignments', 'hypothesis'],
    'learn-sol-t01': ['Template library with one-click scaffolding', 'validated'],
    'learn-sol-t02': ['Weekly at-risk digest email', 'hypothesis'],
    'learn-sol-pl01': ['Edge-cached lesson content', 'hypothesis'],
    'learn-sol-pl02': ['Warm instance reservation', 'invalidated'],
  })
  const experiments = Object.fromEntries(Object.values(EXPERIMENTS).map(e => [e.id, [e.title, e.status]]))
  assert.deepEqual(experiments, {
    'learn-exp-p01': ['A/B test: reminder email vs none', 'running'],
    'learn-exp-p02': ['Readability score comparison', 'complete'],
    'learn-exp-s01': ['Draft feature pilot with one cohort', 'planned'],
    'learn-exp-t01': ['Time-on-task study with 10 teachers', 'complete'],
    'learn-exp-t02': ['Digest pilot with volunteer teachers', 'running'],
    'learn-exp-pl01': ['Cache pilot on 10% of traffic', 'running'],
    'learn-exp-pl02': ['Reserved instance 1-week trial', 'complete'],
    'learn-exp-x01': ['Re-engagement cohort study', 'planned'],
  })
  assert.deepEqual(
    OST_TEAMS.map(t => t.id),
    ['primary', 'secondary', 'teacher', 'platform'],
  )
})

test('layout is deterministic', () => {
  const a = computeLayout(buildGraph()).positions
  const b = computeLayout(buildGraph()).positions
  assert.deepEqual(a, b)
})

test('no two node boxes overlap, under every filter', () => {
  const graph = buildGraph()
  for (const team of ['all', 'primary', 'secondary', 'teacher', 'platform'] as const) {
    for (const overlapsOnly of [false, true]) {
      const { positions } = computeLayout(filterGraph(graph, team, overlapsOnly))
      for (let i = 0; i < positions.length; i++) {
        for (let j = i + 1; j < positions.length; j++) {
          const p = positions[i]
          const q = positions[j]
          const overlap = p.x < q.x + q.width && q.x < p.x + p.width && p.y < q.y + q.height && q.y < p.y + p.height
          assert.ok(!overlap, `${team}/${overlapsOnly}: ${p.id} overlaps ${q.id}`)
        }
      }
    }
  }
})

test('nodes sit in their kind column and edges only span adjacent columns', () => {
  const graph = buildGraph()
  const { byId } = computeLayout(graph)
  for (const edge of graph.edges) {
    assert.ok(byId.get(edge.parentId)!.x < byId.get(edge.childId)!.x)
  }
  const xs = new Set(graph.nodes.map(node => byId.get(node.id)!.x))
  assert.equal(xs.size, 4)
})

test('overlaps-only keeps shared nodes and their ancestors, and no unshared leaves', () => {
  const graph = buildGraph()
  const ids = nodesForOverlapsOnly(graph)
  for (const node of sharedNodes(graph)) assert.ok(ids.has(node.id))
  for (const node of graph.nodes) {
    if (!ids.has(node.id) || isShared(node)) continue
    // Every unshared node kept must be an ancestor of some shared node.
    assert.ok(graph.edges.some(edge => edge.parentId === node.id && ids.has(edge.childId)), node.id)
  }
  assert.ok(!ids.has('learn-exp-p01'))
  assert.ok(!ids.has('learn-opp-p02'))
})

test('team filter keeps shared nodes with their full team list', () => {
  const graph = filterGraph(buildGraph(), 'primary', false)
  const t02 = graph.nodes.find(node => node.id === 'learn-sol-t02')!
  assert.deepEqual(t02.teams, ['primary', 'teacher'])
  assert.ok(graph.edges.every(edge => edge.team === 'primary'))
  assert.ok(!graph.nodes.some(node => node.id === 'learn-opp-t02'))
})

test('path of a shared node reaches every outcome it serves', () => {
  const graph = buildGraph()
  const path = pathNodeIds(graph, 'learn-exp-x01')
  assert.ok(path.has(outcomeId('primary')))
  assert.ok(path.has(outcomeId('teacher')))
  assert.ok(!path.has(outcomeId('secondary')))
  assert.ok(!path.has(outcomeId('platform')))
  for (const id of ['learn-sol-p01', 'learn-sol-t02', 'learn-opp-p01', 'learn-opp-t02']) assert.ok(path.has(id), id)
})
