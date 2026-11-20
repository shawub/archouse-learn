import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  NOT_FOUND_MESSAGE,
  SELF_SUBSCRIBE_MESSAGE,
  UNAUTHENTICATED_MESSAGE,
  subscribe,
  subscribeToTeacher,
  unsubscribe,
  unsubscribeFromTeacher,
  type SubscriptionSession,
} from '@/lib/subscriptions'
import { createFakeSubscriptionStore, type FakeSubscriptionRow } from './helpers/fake-subscription-store'

// 'bob' and 'carol' are plain users with no courses at all — subscribing needs none.
function setup(subscriptions: FakeSubscriptionRow[] = []) {
  const fake = createFakeSubscriptionStore(['alice', 'bob', 'carol'], subscriptions)
  const as = (session: SubscriptionSession) => ({ store: fake.store, getSession: async () => session })
  const snapshot = () => fake.subscriptions.map(s => ({ ...s }))
  return { ...fake, as, snapshot }
}

const ALICE = { userId: 'alice' }
const T0 = new Date('2026-01-01T00:00:00Z')
const existing = (subscriberId: string, teacherId: string): FakeSubscriptionRow => ({
  subscriberId,
  teacherId,
  subscribedAt: T0,
})
const NOT_FOUND = { ok: false, reason: 'not-found', error: NOT_FOUND_MESSAGE }
const UNAUTHENTICATED = { ok: false, reason: 'unauthenticated', error: UNAUTHENTICATED_MESSAGE }

test('subscribe creates one row linking the session user to the teacher', async () => {
  const { as, subscriptions } = setup()
  const result = await subscribeToTeacher('bob', as(ALICE))
  assert.equal(subscriptions.length, 1)
  assert.equal(subscriptions[0]!.subscriberId, 'alice')
  assert.equal(subscriptions[0]!.teacherId, 'bob')
  assert.deepEqual(result, {
    ok: true,
    teacherId: 'bob',
    subscribed: true,
    subscribedAt: subscriptions[0]!.subscribedAt,
    alreadySubscribed: false,
  })
})

test('duplicate subscribe is idempotent — one row, same subscription state', async () => {
  const { as, subscriptions } = setup()
  const first = await subscribeToTeacher('bob', as(ALICE))
  const second = await subscribeToTeacher('bob', as(ALICE))
  assert.deepEqual(second, { ...first, alreadySubscribed: true })
  assert.equal(subscriptions.length, 1)
})

test('duplicate subscribe returns the original subscribedAt', async () => {
  const { as } = setup([existing('alice', 'bob')])
  const result = await subscribeToTeacher('bob', as(ALICE))
  assert.ok(result.ok)
  assert.equal(result.subscribedAt, T0)
})

test('a create that loses a unique-constraint race resolves to the existing row', async () => {
  const { store, subscriptions } = setup()
  // Simulate a concurrent subscribe landing between the read and the write.
  const racing = {
    ...store,
    findSubscription: (() => {
      let calls = 0
      return async (s: string, t: string) => (calls++ === 0 ? null : store.findSubscription(s, t))
    })(),
  }
  subscriptions.push(existing('alice', 'bob'))
  const result = await subscribe('alice', 'bob', { store: racing })
  assert.deepEqual(result, { ok: true, teacherId: 'bob', subscribed: true, subscribedAt: T0, alreadySubscribed: true })
  assert.equal(subscriptions.length, 1)
})

test('self-subscription is rejected and creates no row', async () => {
  const { as, subscriptions } = setup()
  const result = await subscribeToTeacher('alice', as(ALICE))
  assert.deepEqual(result, { ok: false, reason: 'self', error: SELF_SUBSCRIBE_MESSAGE })
  assert.equal(subscriptions.length, 0)
})

test('subscribing to an unknown user returns not-found without throwing', async () => {
  const { as, subscriptions } = setup()
  const result = await subscribeToTeacher('ghost', as(ALICE))
  assert.deepEqual(result, NOT_FOUND)
  assert.equal(subscriptions.length, 0)
})

test('empty, null or malformed teacherId returns not-found without throwing', async () => {
  const { as, subscriptions } = setup()
  for (const teacherId of ['', '   ', null, undefined, 42, { id: 'bob' }]) {
    assert.deepEqual(await subscribeToTeacher(teacherId, as(ALICE)), NOT_FOUND)
    assert.deepEqual(await unsubscribeFromTeacher(teacherId, as(ALICE)), NOT_FOUND)
  }
  assert.equal(subscriptions.length, 0)
})

test('unauthenticated subscribe is rejected and mutates nothing', async () => {
  const { as, subscriptions } = setup()
  const result = await subscribeToTeacher('bob', as(null))
  assert.deepEqual(result, UNAUTHENTICATED)
  assert.equal(subscriptions.length, 0)
})

test('unsubscribe removes the matching row only', async () => {
  const { as, subscriptions } = setup([existing('alice', 'bob'), existing('carol', 'bob'), existing('alice', 'carol')])
  const result = await unsubscribeFromTeacher('bob', as(ALICE))
  assert.deepEqual(result, { ok: true, teacherId: 'bob', subscribed: false, wasSubscribed: true })
  assert.deepEqual(
    subscriptions.map(s => [s.subscriberId, s.teacherId]),
    [
      ['carol', 'bob'],
      ['alice', 'carol'],
    ],
  )
})

test('unsubscribe when not subscribed is a no-op with a clear result', async () => {
  const { as, snapshot, subscriptions } = setup([existing('carol', 'bob')])
  const before = snapshot()
  const result = await unsubscribeFromTeacher('bob', as(ALICE))
  assert.deepEqual(result, { ok: true, teacherId: 'bob', subscribed: false, wasSubscribed: false })
  assert.deepEqual(subscriptions, before)
})

test('unauthenticated unsubscribe is rejected and mutates nothing', async () => {
  const { as, snapshot, subscriptions } = setup([existing('alice', 'bob')])
  const before = snapshot()
  const result = await unsubscribeFromTeacher('bob', as(null))
  assert.deepEqual(result, UNAUTHENTICATED)
  assert.deepEqual(subscriptions, before)
})

test('subscriber always comes from the session, never from input', async () => {
  const { as, subscriptions } = setup([existing('carol', 'bob')])
  const input = { teacherId: 'bob', subscriberId: 'carol' }
  // An object smuggling a subscriberId is not a valid teacher id.
  assert.deepEqual(await subscribeToTeacher(input, as(ALICE)), NOT_FOUND)

  await subscribeToTeacher('bob', as(ALICE))
  assert.deepEqual(
    subscriptions.map(s => [s.subscriberId, s.teacherId]),
    [
      ['carol', 'bob'],
      ['alice', 'bob'],
    ],
  )

  await unsubscribeFromTeacher('bob', as(ALICE))
  assert.deepEqual(
    subscriptions.map(s => [s.subscriberId, s.teacherId]),
    [['carol', 'bob']],
  )
})

test('results expose only the teacher id and subscription state', async () => {
  const { as } = setup([existing('carol', 'bob')])
  const subscribes = [await subscribeToTeacher('bob', as(ALICE)), await subscribeToTeacher('bob', as(ALICE))]
  const unsubscribes = [await unsubscribeFromTeacher('bob', as(ALICE)), await unsubscribeFromTeacher('bob', as(ALICE))]
  for (const result of subscribes) {
    assert.deepEqual(Object.keys(result).sort(), ['alreadySubscribed', 'ok', 'subscribed', 'subscribedAt', 'teacherId'])
  }
  for (const result of unsubscribes) {
    assert.deepEqual(Object.keys(result).sort(), ['ok', 'subscribed', 'teacherId', 'wasSubscribed'])
  }
  for (const result of [...subscribes, ...unsubscribes]) {
    assert.ok(!JSON.stringify(result).includes('carol'))
    assert.ok(!JSON.stringify(result).includes('alice'))
  }
})
