import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  NOT_FOUND_MESSAGE,
  SELF_SUBSCRIBE_MESSAGE,
  UNAUTHENTICATED_MESSAGE,
  subscribe,
  unsubscribe,
  type SubscriptionRecord,
  type SubscriptionSession,
} from '@/lib/subscriptions'
import { createFakeSubscriptionStore } from './helpers/fake-subscription-store'

function setup(subscriptions: SubscriptionRecord[] = []) {
  const fake = createFakeSubscriptionStore(['alice', 'bob', 'carol'], subscriptions)
  const as = (session: SubscriptionSession) => ({ store: fake.store, getSession: async () => session })
  const snapshot = () => fake.subscriptions.map(s => ({ ...s }))
  return { ...fake, as, snapshot }
}

const ALICE = { userId: 'alice' }
const existing = (subscriberId: string, teacherId: string): SubscriptionRecord => ({
  subscriberId,
  teacherId,
  subscribedAt: new Date('2026-01-01T00:00:00Z'),
})

test('subscribe creates one row linking the session user to the teacher', async () => {
  const { as, subscriptions } = setup()
  const result = await subscribe({ teacherId: 'bob' }, as(ALICE))
  assert.deepEqual(result, { ok: true, teacherId: 'bob', subscribed: true })
  assert.equal(subscriptions.length, 1)
  assert.equal(subscriptions[0]!.subscriberId, 'alice')
  assert.equal(subscriptions[0]!.teacherId, 'bob')
  assert.ok(subscriptions[0]!.subscribedAt instanceof Date)
})

test('duplicate subscribe is idempotent — one row, same success result', async () => {
  const { as, subscriptions } = setup()
  const first = await subscribe({ teacherId: 'bob' }, as(ALICE))
  const second = await subscribe({ teacherId: 'bob' }, as(ALICE))
  assert.deepEqual(second, first)
  assert.equal(subscriptions.length, 1)
})

test('self-subscription is rejected and creates no row', async () => {
  const { as, subscriptions } = setup()
  const result = await subscribe({ teacherId: 'alice' }, as(ALICE))
  assert.deepEqual(result, { error: SELF_SUBSCRIBE_MESSAGE })
  assert.equal(subscriptions.length, 0)
})

test('subscribing to an unknown user returns not-found without throwing', async () => {
  const { as, subscriptions } = setup()
  const result = await subscribe({ teacherId: 'ghost' }, as(ALICE))
  assert.deepEqual(result, { error: NOT_FOUND_MESSAGE, notFound: true })
  assert.equal(subscriptions.length, 0)
})

test('empty, null or malformed teacherId returns not-found without throwing', async () => {
  const { as, subscriptions } = setup()
  for (const teacherId of ['', '   ', null, undefined, 42, { id: 'bob' }]) {
    assert.deepEqual(await subscribe({ teacherId }, as(ALICE)), { error: NOT_FOUND_MESSAGE, notFound: true })
    assert.deepEqual(await unsubscribe({ teacherId }, as(ALICE)), { error: NOT_FOUND_MESSAGE, notFound: true })
  }
  assert.equal(subscriptions.length, 0)
})

test('unauthenticated subscribe is rejected and mutates nothing', async () => {
  const { as, subscriptions } = setup()
  const result = await subscribe({ teacherId: 'bob' }, as(null))
  assert.deepEqual(result, { error: UNAUTHENTICATED_MESSAGE, unauthenticated: true })
  assert.equal(subscriptions.length, 0)
})

test('unsubscribe removes the matching row only', async () => {
  const { as, subscriptions } = setup([existing('alice', 'bob'), existing('carol', 'bob'), existing('alice', 'carol')])
  const result = await unsubscribe({ teacherId: 'bob' }, as(ALICE))
  assert.deepEqual(result, { ok: true, teacherId: 'bob', subscribed: false })
  assert.deepEqual(
    subscriptions.map(s => [s.subscriberId, s.teacherId]),
    [
      ['carol', 'bob'],
      ['alice', 'carol'],
    ],
  )
})

test('unsubscribe when not subscribed is a no-op success', async () => {
  const { as, snapshot, subscriptions } = setup([existing('carol', 'bob')])
  const before = snapshot()
  const result = await unsubscribe({ teacherId: 'bob' }, as(ALICE))
  assert.deepEqual(result, { ok: true, teacherId: 'bob', subscribed: false })
  assert.deepEqual(subscriptions, before)
})

test('unauthenticated unsubscribe is rejected and mutates nothing', async () => {
  const { as, snapshot, subscriptions } = setup([existing('alice', 'bob')])
  const before = snapshot()
  const result = await unsubscribe({ teacherId: 'bob' }, as(null))
  assert.deepEqual(result, { error: UNAUTHENTICATED_MESSAGE, unauthenticated: true })
  assert.deepEqual(subscriptions, before)
})

test('subscriber always comes from the session, never from input', async () => {
  const { as, subscriptions } = setup([existing('carol', 'bob')])
  const input = { teacherId: 'bob', subscriberId: 'carol' } as { teacherId: string }
  await subscribe(input, as(ALICE))
  assert.deepEqual(
    subscriptions.map(s => [s.subscriberId, s.teacherId]),
    [
      ['carol', 'bob'],
      ['alice', 'bob'],
    ],
  )

  await unsubscribe(input, as(ALICE))
  assert.deepEqual(
    subscriptions.map(s => [s.subscriberId, s.teacherId]),
    [['carol', 'bob']],
  )
})

test('results expose only the teacher id and subscription state', async () => {
  const { as } = setup([existing('carol', 'bob')])
  const results = [
    await subscribe({ teacherId: 'bob' }, as(ALICE)),
    await subscribe({ teacherId: 'bob' }, as(ALICE)),
    await unsubscribe({ teacherId: 'bob' }, as(ALICE)),
    await unsubscribe({ teacherId: 'bob' }, as(ALICE)),
  ]
  for (const result of results) {
    assert.deepEqual(Object.keys(result).sort(), ['ok', 'subscribed', 'teacherId'])
    assert.ok(!JSON.stringify(result).includes('carol'))
  }
})
