import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  INVALID_INTEREST_MESSAGE,
  MAX_INTERESTS,
  UNAUTHENTICATED_MESSAGE,
  getMyInterests,
  updateInterests,
  type InterestSession,
} from '@/lib/interests'
import { createFakeInterestStore, type FakeInterestRow } from './helpers/fake-interest-store'

function setup(rows: FakeInterestRow[] = []) {
  const fake = createFakeInterestStore(rows)
  const as = (session: InterestSession) => ({ store: fake.store, getSession: async () => session })
  const snapshot = () => fake.rows.map(r => ({ ...r }))
  const rowsFor = (userId: string) =>
    fake.rows
      .filter(r => r.userId === userId)
      .map(({ subject, keyStage }) => `${subject}:${keyStage}`)
      .sort()
  return { ...fake, as, snapshot, rowsFor }
}

const ALICE = { userId: 'alice' }
const BOB = { userId: 'bob' }
const UNAUTHENTICATED = { ok: false, reason: 'unauthenticated', error: UNAUTHENTICATED_MESSAGE }
const INVALID = { ok: false, reason: 'invalid', error: INVALID_INTEREST_MESSAGE }

const SUBJECTS = ['MATHS', 'ENGLISH', 'SCIENCE', 'HISTORY', 'GEOGRAPHY', 'COMPUTING', 'ART', 'MUSIC', 'PE', 'RE', 'MFL'] as const
const KEY_STAGES = ['KS1', 'KS2', 'KS3', 'KS4'] as const

test('set interests writes exactly the given pairs for the session user', async () => {
  const { as, rowsFor } = setup()
  const result = await updateInterests(
    [{ subject: 'MATHS', keyStage: 'KS3' }, { subject: 'ENGLISH', keyStage: 'KS2' }],
    as(ALICE),
  )
  assert.deepEqual(result, {
    ok: true,
    interests: [{ subject: 'MATHS', keyStage: 'KS3' }, { subject: 'ENGLISH', keyStage: 'KS2' }],
  })
  assert.deepEqual(rowsFor('alice'), ['ENGLISH:KS2', 'MATHS:KS3'])
})

test('replace interests removes the previous set', async () => {
  const { as, rowsFor } = setup([{ userId: 'alice', subject: 'MATHS', keyStage: 'KS3' }])
  const result = await updateInterests([{ subject: 'SCIENCE', keyStage: 'KS4' }], as(ALICE))
  assert.ok(result.ok)
  assert.deepEqual(rowsFor('alice'), ['SCIENCE:KS4'])
})

test('empty update clears all of the user\'s interests', async () => {
  const { as, rowsFor } = setup([
    { userId: 'alice', subject: 'MATHS', keyStage: 'KS3' },
    { userId: 'alice', subject: 'ART', keyStage: 'KS1' },
  ])
  const result = await updateInterests([], as(ALICE))
  assert.deepEqual(result, { ok: true, interests: [] })
  assert.deepEqual(rowsFor('alice'), [])
})

test('duplicate pairs are collapsed before writing', async () => {
  const { as, rowsFor } = setup()
  const result = await updateInterests(
    [
      { subject: 'MATHS', keyStage: 'KS3' },
      { subject: 'MATHS', keyStage: 'KS3' },
      { subject: 'ENGLISH', keyStage: 'KS2' },
    ],
    as(ALICE),
  )
  assert.ok(result.ok)
  assert.equal(result.interests.length, 2)
  assert.deepEqual(rowsFor('alice'), ['ENGLISH:KS2', 'MATHS:KS3'])
})

test('unknown subject or key stage rejects the whole update and changes nothing', async () => {
  const { as, snapshot } = setup([{ userId: 'alice', subject: 'MATHS', keyStage: 'KS3' }])
  const before = snapshot()
  const inputs: unknown[] = [
    [{ subject: 'BIOLOGY', keyStage: 'KS3' }],
    [{ subject: 'MATHS', keyStage: 'KS9' }],
    [{ subject: 'ENGLISH', keyStage: 'KS2' }, { subject: 'maths', keyStage: 'KS3' }],
    [{ subject: 'toString', keyStage: 'KS3' }],
    [{ subject: 'MATHS' }],
    [null],
    ['MATHS:KS3'],
    { subject: 'MATHS', keyStage: 'KS3' },
    null,
    undefined,
  ]
  for (const input of inputs) {
    assert.deepEqual(await updateInterests(input, as(ALICE)), INVALID, JSON.stringify(input))
  }
  assert.deepEqual(snapshot(), before)
})

test('input larger than MAX_INTERESTS is rejected; exactly MAX_INTERESTS succeeds', async () => {
  assert.equal(MAX_INTERESTS, SUBJECTS.length * KEY_STAGES.length)
  const all = SUBJECTS.flatMap(subject => KEY_STAGES.map(keyStage => ({ subject, keyStage })))
  assert.equal(all.length, MAX_INTERESTS)

  const { as, snapshot, rowsFor } = setup([{ userId: 'alice', subject: 'MATHS', keyStage: 'KS3' }])
  const before = snapshot()
  assert.deepEqual(await updateInterests([...all, all[0]], as(ALICE)), INVALID)
  assert.deepEqual(snapshot(), before)

  const result = await updateInterests(all, as(ALICE))
  assert.ok(result.ok)
  assert.equal(rowsFor('alice').length, MAX_INTERESTS)
})

test('unauthenticated update is rejected and changes nothing', async () => {
  const { as, snapshot } = setup([{ userId: 'alice', subject: 'MATHS', keyStage: 'KS3' }])
  const before = snapshot()
  assert.deepEqual(await updateInterests([{ subject: 'ART', keyStage: 'KS1' }], as(null)), UNAUTHENTICATED)
  assert.deepEqual(await updateInterests([], as(null)), UNAUTHENTICATED)
  assert.deepEqual(snapshot(), before)
})

test('unauthenticated read is rejected', async () => {
  const { as } = setup([{ userId: 'alice', subject: 'MATHS', keyStage: 'KS3' }])
  assert.deepEqual(await getMyInterests(as(null)), UNAUTHENTICATED)
})

test('a failure mid-replace leaves the previous set intact', async () => {
  const { as, control, rowsFor } = setup([
    { userId: 'alice', subject: 'MATHS', keyStage: 'KS3' },
    { userId: 'bob', subject: 'ENGLISH', keyStage: 'KS2' },
  ])
  control.failCreate = true
  await assert.rejects(updateInterests([{ subject: 'SCIENCE', keyStage: 'KS4' }], as(ALICE)))
  assert.deepEqual(rowsFor('alice'), ['MATHS:KS3'])
  assert.deepEqual(rowsFor('bob'), ['ENGLISH:KS2'])
})

test('one user\'s update leaves another user\'s interests unaffected', async () => {
  const { as, rowsFor } = setup([
    { userId: 'alice', subject: 'MATHS', keyStage: 'KS3' },
    { userId: 'bob', subject: 'ENGLISH', keyStage: 'KS2' },
  ])
  await updateInterests([{ subject: 'SCIENCE', keyStage: 'KS4' }], as(ALICE))
  assert.deepEqual(rowsFor('alice'), ['SCIENCE:KS4'])
  assert.deepEqual(rowsFor('bob'), ['ENGLISH:KS2'])

  await updateInterests([], as(ALICE))
  assert.deepEqual(rowsFor('bob'), ['ENGLISH:KS2'])
})

test('a smuggled userId in the input is ignored — rows go to the session user', async () => {
  const { as, rowsFor } = setup([{ userId: 'bob', subject: 'ENGLISH', keyStage: 'KS2' }])
  const result = await updateInterests([{ userId: 'bob', subject: 'ART', keyStage: 'KS1' }], as(ALICE))
  assert.deepEqual(result, { ok: true, interests: [{ subject: 'ART', keyStage: 'KS1' }] })
  assert.deepEqual(rowsFor('alice'), ['ART:KS1'])
  assert.deepEqual(rowsFor('bob'), ['ENGLISH:KS2'])

  assert.deepEqual(await getMyInterests(as(BOB)), { ok: true, interests: [{ subject: 'ENGLISH', keyStage: 'KS2' }] })
})

test('read returns the caller\'s own interests, sorted', async () => {
  const { as } = setup([{ userId: 'bob', subject: 'PE', keyStage: 'KS4' }])
  await updateInterests(
    [{ subject: 'SCIENCE', keyStage: 'KS4' }, { subject: 'ENGLISH', keyStage: 'KS2' }, { subject: 'ENGLISH', keyStage: 'KS1' }],
    as(ALICE),
  )
  assert.deepEqual(await getMyInterests(as(ALICE)), {
    ok: true,
    interests: [
      { subject: 'ENGLISH', keyStage: 'KS1' },
      { subject: 'ENGLISH', keyStage: 'KS2' },
      { subject: 'SCIENCE', keyStage: 'KS4' },
    ],
  })
})
