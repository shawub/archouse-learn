import { test } from 'node:test'
import assert from 'node:assert/strict'
import { renderToStaticMarkup } from 'react-dom/server'
import { OstView } from '@/components/ost/ost-view'

const nodeStyles = (html: string) =>
  [...html.matchAll(/data-node-id="([^"]+)"[^>]*style="([^"]+)"/g)].map(m => `${m[1]} ${m[2]}`)

test('renders the same node positions on every render', () => {
  const first = renderToStaticMarkup(<OstView />)
  const second = renderToStaticMarkup(<OstView />)
  assert.ok(nodeStyles(first).length > 0)
  assert.deepEqual(nodeStyles(first), nodeStyles(second))
})

test('each shared node renders once with a badge', () => {
  const html = renderToStaticMarkup(<OstView />)
  for (const id of ['learn-sol-t02', 'learn-sol-pl01', 'learn-exp-x01', 'learn-sol-s02']) {
    assert.equal(html.split(`data-node-id="${id}"`).length - 1, 1)
  }
  // 4 overlaps + 2 experiments under shared solutions + 1 legend sample
  assert.equal(html.split('Shared · 2 teams').length - 1, 7)
})

test('svg has a title and description, and the text alternative marks shared nodes', () => {
  const html = renderToStaticMarkup(<OstView />)
  assert.match(html, /<title id="ost-graph-title">/)
  assert.match(html, /<desc id="ost-graph-desc">/)
  assert.match(html, /shared with: Teacher/)
  assert.match(html, /shared with: Primary/)
})
