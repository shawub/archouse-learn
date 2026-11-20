import { test } from 'node:test'
import assert from 'node:assert/strict'
import { publishCourse, unpublishCourse, type CoursePublishSession } from '@/lib/course-publish'
import { createFakeCourseStore } from './helpers/fake-course-store'

function setup() {
  const fake = createFakeCourseStore([
    { id: 'draft', teacherId: 'owner', published: false },
    { id: 'live', teacherId: 'owner', published: true },
    { id: 'other', teacherId: 'someone-else', published: false },
  ])
  const as = (session: CoursePublishSession) => ({ store: fake.store, getSession: async () => session })
  const snapshot = () => fake.courses.map(c => ({ ...c }))
  const course = (id: string) => fake.courses.find(c => c.id === id)!
  return { ...fake, as, snapshot, course }
}

const OWNER = { userId: 'owner' }
const NON_OWNER = { userId: 'intruder' }

test('owner publishes their course → published becomes true', async () => {
  const { as, course } = setup()
  const result = await publishCourse('draft', as(OWNER))
  assert.deepEqual(result, { id: 'draft', published: true })
  assert.equal(course('draft').published, true)
})

test('owner unpublishes their course → published becomes false', async () => {
  const { as, course } = setup()
  const result = await unpublishCourse('live', as(OWNER))
  assert.deepEqual(result, { id: 'live', published: false })
  assert.equal(course('live').published, false)
})

test('non-owner publish is rejected and nothing changes', async () => {
  const { as, snapshot, courses } = setup()
  const before = snapshot()
  await assert.rejects(publishCourse('draft', as(NON_OWNER)), /Forbidden/)
  assert.deepEqual(courses, before)
})

test('non-owner unpublish is rejected and nothing changes', async () => {
  const { as, snapshot, courses } = setup()
  const before = snapshot()
  await assert.rejects(unpublishCourse('live', as(NON_OWNER)), /Forbidden/)
  assert.deepEqual(courses, before)
})

test('unauthenticated publish is rejected and nothing changes', async () => {
  const { as, snapshot, courses } = setup()
  const before = snapshot()
  await assert.rejects(publishCourse('draft', as(null)), /Unauthorized/)
  assert.deepEqual(courses, before)
})

test('unauthenticated unpublish is rejected and nothing changes', async () => {
  const { as, snapshot, courses } = setup()
  const before = snapshot()
  await assert.rejects(unpublishCourse('live', as(null)), /Unauthorized/)
  assert.deepEqual(courses, before)
})

test('session without a user id is treated as unauthenticated', async () => {
  const { as, snapshot, courses } = setup()
  const before = snapshot()
  await assert.rejects(publishCourse('draft', as({ userId: '' })), /Unauthorized/)
  assert.deepEqual(courses, before)
})

test('ownership is the only check: an owner of any role (e.g. a student) can publish', async () => {
  const fake = createFakeCourseStore([{ id: 'c1', teacherId: 'student-user', published: false }])
  await publishCourse('c1', { store: fake.store, getSession: async () => ({ userId: 'student-user' }) })
  assert.equal(fake.courses[0].published, true)
})

test('unknown course is rejected as Not found with no changes', async () => {
  const { as, snapshot, courses } = setup()
  const before = snapshot()
  await assert.rejects(publishCourse('missing', as(OWNER)), /Not found/)
  await assert.rejects(unpublishCourse('missing', as(OWNER)), /Not found/)
  assert.deepEqual(courses, before)
})

test('publish and unpublish are idempotent', async () => {
  const { as, course } = setup()
  await publishCourse('live', as(OWNER))
  await publishCourse('live', as(OWNER))
  assert.equal(course('live').published, true)
  await unpublishCourse('draft', as(OWNER))
  await unpublishCourse('draft', as(OWNER))
  assert.equal(course('draft').published, false)
})
