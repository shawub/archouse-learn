import { test } from 'node:test'
import assert from 'node:assert/strict'
import { discoverTeachers, getPublicTeacherProfile, type DiscoverFilters } from '@/lib/public-teachers'
import { createFakePublicTeacherStore, type FakeSeedCourse, type FakeSeedTeacher } from './helpers/fake-public-teacher-store'

const SECRETS = { email: 'x@example.com', role: 'TEACHER', passwordHash: 'hash' }
const course = (c: Partial<FakeSeedCourse> & Pick<FakeSeedCourse, 'id'>): FakeSeedCourse => ({
  title: c.id,
  subject: 'MATHS',
  keyStage: 'KS2',
  published: true,
  lessonCount: 3,
  subscriberCount: 42,
  progress: [{ userId: 'learner', completed: true }],
  ...c,
})

function setup(seed?: FakeSeedTeacher[]) {
  const fake = createFakePublicTeacherStore(
    seed ?? [
      // Seeded out of order so results must be sorted.
      { id: 't-zed', name: 'Zed', ...SECRETS, courses: [course({ id: 'z1' })] },
      { id: 't-ks3', name: 'Kay', ...SECRETS, courses: [course({ id: 'k1', keyStage: 'KS3' })] },
      { id: 't-draft', name: 'Drafty', ...SECRETS, courses: [course({ id: 'd1', published: false })] },
      { id: 't-null', name: null, ...SECRETS, courses: [course({ id: 'n1', subject: 'ENGLISH' })] },
      {
        id: 't-amy',
        name: 'Amy',
        ...SECRETS,
        courses: [
          course({ id: 'a3', title: 'Fractions' }),
          course({ id: 'a2', title: 'Algebra', subject: 'SCIENCE', lessonCount: 0 }),
          course({ id: 'a1', title: 'Fractions' }),
          course({ id: 'a-draft', title: 'Secret draft', published: false }),
        ],
      },
      { id: 't-none', name: 'Nobody', ...SECRETS, courses: [] },
    ],
  )
  return { deps: { store: fake.store } }
}

const ids = (ts: { id: string }[]) => ts.map(t => t.id)

test('subject + keyStage filters are ANDed against published courses', async () => {
  const { deps } = setup()
  const result = await discoverTeachers({ subject: 'MATHS', keyStage: 'KS2' }, deps)
  assert.deepEqual(ids(result), ['t-amy', 't-zed'])
})

test('single filter applies just that filter', async () => {
  const { deps } = setup()
  assert.deepEqual(ids(await discoverTeachers({ keyStage: 'KS3' }, deps)), ['t-ks3'])
  assert.deepEqual(ids(await discoverTeachers({ subject: 'ENGLISH' }, deps)), ['t-null'])
  assert.deepEqual(ids(await discoverTeachers({ subject: 'SCIENCE' }, deps)), ['t-amy'])
})

test('no filters returns every teacher with ≥1 published course, sorted by name (nulls last) then id', async () => {
  const { deps } = setup()
  const result = await discoverTeachers({}, deps)
  assert.deepEqual(ids(result), ['t-amy', 't-ks3', 't-zed', 't-null'])
  assert.deepEqual(result.at(-1), { id: 't-null', name: null })
})

test('teachers with only unpublished courses are excluded', async () => {
  const { deps } = setup([
    { id: 't-draft', name: 'Drafty', courses: [course({ id: 'd1', published: false })] },
  ])
  assert.deepEqual(await discoverTeachers({ subject: 'MATHS', keyStage: 'KS2' }, deps), [])
  assert.deepEqual(await discoverTeachers({}, deps), [])
})

test('a teacher with several matching courses appears once', async () => {
  const { deps } = setup()
  const result = await discoverTeachers({ subject: 'MATHS' }, deps)
  assert.equal(result.filter(t => t.id === 't-amy').length, 1)
})

test('teachers with equal names are ordered by id', async () => {
  const { deps } = setup([
    { id: 'b', name: 'Sam', courses: [course({ id: 'b1' })] },
    { id: 'a', name: 'Sam', courses: [course({ id: 'a1' })] },
  ])
  assert.deepEqual(ids(await discoverTeachers({}, deps)), ['a', 'b'])
})

test('invalid enum filters produce no matches rather than an error', async () => {
  const { deps } = setup()
  assert.deepEqual(await discoverTeachers({ subject: 'NOPE' } as unknown as DiscoverFilters, deps), [])
  assert.deepEqual(await discoverTeachers({ keyStage: 'KS9' } as unknown as DiscoverFilters, deps), [])
})

test('profile returns name and published courses only, sorted by title then id', async () => {
  const { deps } = setup()
  const result = await getPublicTeacherProfile('t-amy', deps)
  assert.deepEqual(result, {
    found: true,
    profile: {
      id: 't-amy',
      name: 'Amy',
      courses: [
        { id: 'a2', title: 'Algebra', subject: 'SCIENCE', keyStage: 'KS2', lessonCount: 0 },
        { id: 'a1', title: 'Fractions', subject: 'MATHS', keyStage: 'KS2', lessonCount: 3 },
        { id: 'a3', title: 'Fractions', subject: 'MATHS', keyStage: 'KS2', lessonCount: 3 },
      ],
    },
  })
})

test('unknown teacher id → { found: false } without throwing', async () => {
  const { deps } = setup()
  assert.deepEqual(await getPublicTeacherProfile('missing', deps), { found: false })
})

test('user with no published courses has no public profile', async () => {
  const { deps } = setup()
  assert.deepEqual(await getPublicTeacherProfile('t-draft', deps), { found: false })
  assert.deepEqual(await getPublicTeacherProfile('t-none', deps), { found: false })
})

test('teacher with null name still has a profile', async () => {
  const { deps } = setup()
  const result = await getPublicTeacherProfile('t-null', deps)
  assert.equal(result.found, true)
  assert.equal(result.found && result.profile.name, null)
})

const FORBIDDEN_KEYS = [
  'email', 'role', 'passwordHash', 'accounts', 'sessions', 'subscribers', 'subscriberCount',
  'subscriptions', 'enrollments', 'progress', 'lessonProgress', 'published',
]

function assertNoForbiddenKeys(value: unknown) {
  const json = JSON.stringify(value)
  for (const key of FORBIDDEN_KEYS) assert.ok(!json.includes(`"${key}"`), `leaked key: ${key}`)
}

test('returned shapes contain only whitelisted fields', async () => {
  const { deps } = setup()

  const teachers = await discoverTeachers({}, deps)
  for (const t of teachers) assert.deepEqual(Object.keys(t), ['id', 'name'])
  assertNoForbiddenKeys(teachers)

  for (const t of teachers) {
    const result = await getPublicTeacherProfile(t.id, deps)
    assert.equal(result.found, true)
    if (!result.found) continue
    assert.deepEqual(Object.keys(result.profile), ['id', 'name', 'courses'])
    for (const c of result.profile.courses) {
      assert.deepEqual(Object.keys(c), ['id', 'title', 'subject', 'keyStage', 'lessonCount'])
    }
    assertNoForbiddenKeys(result)
  }
})

test('extra fields from a leaky store are stripped', async () => {
  const leaky = {
    async findTeachersWithPublishedCourses() {
      return [{ id: 't', name: 'T', ...SECRETS }]
    },
    async getPublicProfile() {
      return { id: 't', name: 'T', ...SECRETS, courses: [{ ...course({ id: 'c' }) }] }
    },
  }
  const deps = { store: leaky }
  assertNoForbiddenKeys(await discoverTeachers({}, deps))
  assertNoForbiddenKeys(await getPublicTeacherProfile('t', deps))
})

test('both actions resolve with no session — only the store is injected', async () => {
  const { deps } = setup()
  assert.deepEqual(Object.keys(deps), ['store'])
  await assert.doesNotReject(discoverTeachers({}, deps))
  await assert.doesNotReject(getPublicTeacherProfile('t-amy', deps))
})
