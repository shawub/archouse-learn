import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  LOG_PREFIX,
  UNAUTHENTICATED_MESSAGE,
  requestAccountDeletion,
  type DeletionRequestRecord,
  type DeletionRequestStore,
  type RequestDeletionDeps,
} from '@/lib/account-deletion'
import { createFakeDeletionStore } from './helpers/fake-deletion-store'

const T0 = new Date('2026-11-22T09:00:00Z')

function setup(userId: string | null, seed: DeletionRequestRecord[] = []) {
  const fake = createFakeDeletionStore(seed)
  const logs: string[] = []
  const deps: RequestDeletionDeps = {
    store: fake.store,
    session: { userId },
    now: () => T0,
    logger: { warn: msg => void logs.push(msg) },
  }
  return { ...fake, deps, logs }
}

test('authenticated user creates one pending request scoped to their account', async () => {
  const { deps, requests } = setup('userA')
  const result = await requestAccountDeletion(deps)
  assert.ok(result.ok)
  assert.equal(result.request.status, 'pending')
  assert.equal(result.request.requestedAt, T0)
  assert.equal(requests.length, 1)
  assert.deepEqual(requests[0], { id: result.request.id, userId: 'userA', requestedAt: T0, status: 'pending', processedAt: null })
})

test('second call from the same user is idempotent', async () => {
  const { deps, requests, logs } = setup('userA')
  const first = await requestAccountDeletion(deps)
  const second = await requestAccountDeletion(deps)
  assert.ok(first.ok && second.ok)
  assert.deepEqual(second, first)
  assert.equal(requests.length, 1)
  assert.equal(logs.length, 1, 'no extra log line for the idempotent call')
})

test('concurrent create that loses the unique constraint returns the existing request', async () => {
  const fake = createFakeDeletionStore()
  let lookups = 0
  // First lookup misses (as if a concurrent call hasn't committed yet); create then hits the constraint.
  const store: DeletionRequestStore = {
    findPendingByUserId: async userId => (lookups++ === 0 ? null : fake.store.findPendingByUserId(userId)),
    createPending: fake.store.createPending,
  }
  const winner = await fake.store.createPending('userA', T0)
  const result = await requestAccountDeletion({ store, session: { userId: 'userA' }, logger: { warn: () => {} } })
  assert.deepEqual(result, { ok: true, request: { id: winner.id, status: 'pending', requestedAt: T0 } })
  assert.equal(fake.requests.length, 1)
})

test('unauthenticated call is rejected and creates nothing', async () => {
  for (const session of [null, { userId: null }]) {
    const { deps, requests, logs } = setup(null)
    const result = await requestAccountDeletion({ ...deps, session })
    assert.deepEqual(result, { error: UNAUTHENTICATED_MESSAGE })
    assert.equal(requests.length, 0)
    assert.equal(logs.length, 0)
  }
})

test("another user's request is never returned or modified", async () => {
  const seeded: DeletionRequestRecord = {
    id: 'existingA',
    userId: 'userA',
    requestedAt: new Date('2026-11-01T00:00:00Z'),
    status: 'pending',
    processedAt: null,
  }
  const { deps, requests } = setup('userB', [seeded])
  const result = await requestAccountDeletion(deps)
  assert.ok(result.ok)
  assert.notEqual(result.request.id, 'existingA')
  assert.equal(requests.length, 2)
  assert.deepEqual(requests.find(r => r.id === result.request.id)?.userId, 'userB')
  assert.deepEqual(requests.find(r => r.id === 'existingA'), seeded)
})

test('creation log line has the stable prefix, id and userId, and no personal data', async () => {
  const email = 'pupil@school.uk'
  const { deps, logs } = setup('userA')
  const result = await requestAccountDeletion(deps)
  assert.ok(result.ok)
  assert.equal(logs.length, 1)
  const [line] = logs
  assert.ok(line.startsWith(LOG_PREFIX))
  assert.ok(line.includes(result.request.id))
  assert.ok(line.includes('userA'))
  assert.ok(!line.includes(email))
  assert.ok(!line.includes('@'))
  assert.equal(line, `${LOG_PREFIX} created id=${result.request.id} userId=userA`)
})

test('no user data is changed by the request', async () => {
  const users = [{ id: 'userA', email: 'pupil@school.uk', name: 'Pupil', passwordHash: 'hash' }]
  const snapshot = JSON.stringify(users)
  const { deps, store } = setup('userA')
  // Pass a user sentinel alongside deps: the module must never reference it.
  const result = await requestAccountDeletion({ ...deps, users } as RequestDeletionDeps)
  assert.ok(result.ok)
  assert.equal(JSON.stringify(users), snapshot)
  assert.deepEqual(Object.keys(store).sort(), ['createPending', 'findPendingByUserId'])
})
