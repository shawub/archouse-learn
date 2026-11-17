import { test } from 'node:test'
import assert from 'node:assert/strict'
import { renderToStaticMarkup } from 'react-dom/server'
import { OstView } from '@/components/ost/ost-view'
import { OstGraph } from '@/components/ost/ost-graph'
import { buildGraph } from '@/lib/ost/graph'

function nodePositions(html: string): string[] {
  return [...html.matchAll(/data-node-id="([^"]+)"[^>]*style="([^"]+)"/g)].map(m => `${m[1]} ${m[2]}`)
}

test('renders the graph identically twice', () => {
  const first = nodePositions(renderToStaticMarkup(<OstView />))
  const second = nodePositions(renderToStaticMarkup(<OstView />))
  assert.ok(first.length > 0)
  assert.deepEqual(first, second)
})

test('svg has a title and description; shared nodes carry the badge', () => {
  const html = renderToStaticMarkup(<OstView />)
  assert.match(html, /<title[^>]*>Opportunity Solution Tree graph<\/title>/)
  assert.match(html, /<desc[^>]*>/)
  for (const column of ['Outcome', 'Opportunity', 'Solution', 'Experiment']) assert.ok(html.includes(column))
  assert.match(html, /data-node-id="learn-exp-x01"[^>]*data-shared="true"/)
  assert.ok(html.includes('Shared · 2 teams'))
  assert.ok(html.includes('shared with: Teacher'))
  assert.ok(!html.includes('brand-'))
})

test('filtered to one team, the badge names the other teams', () => {
  const html = renderToStaticMarkup(<OstGraph graph={buildGraph()} filter="primary" overlapsOnly={false} />)
  assert.ok(html.includes('Shared · 2 teams · also Teacher'))
  assert.ok(html.includes('Shared · 2 teams · also Platform'))
  assert.ok(!html.includes('data-node-id="learn-opp-s01"'))
})
