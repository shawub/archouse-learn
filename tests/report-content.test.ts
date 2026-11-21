import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  EMPTY_REASON_MESSAGE,
  INVALID_CATEGORY_MESSAGE,
  INVALID_CONTENT_TYPE_MESSAGE,
  MAX_REASON_LENGTH,
  NOT_FOUND_MESSAGE,
  OWN_CONTENT_MESSAGE,
  RATE_LIMIT,
  RATE_LIMITED_MESSAGE,
  REASON_TOO_LONG_MESSAGE,
  UNAUTHENTICATED_MESSAGE,
  reportContent,
  type ReportContentDeps,
  type ReportContentInput,
  type ReportContentSession,
} from '@/lib/report-content'
import { createRateLimiter } from '@/lib/rate-limit'
import { createFakeReportStore } from './helpers/fake-report-store'

const T0 = new Date('2026-11-21T09:00:00Z')
const OWNER = { userId: 'teacher1' }
const REPORTER = { userId: 'pupil1' }
const REPORTER_EMAIL = 'pupil1@school.uk'

function setup(session: ReportContentSession = REPORTER) {
  const fake = createFakeReportStore({
    courses: [{ id: 'c1', teacherId: 'teacher1' }],
    lessons: [{ id: 'l1', teacherId: 'teacher1' }],
  })
  const infos: string[] = []
  const limiter = createRateLimiter()
  const deps: ReportContentDeps = {
    getSession: async () => session,
    store: fake.store,
    checkRateLimit: limiter.checkRateLimit,
    now: () => T0,
    logger: { info: msg => void infos.push(msg) },
  }
  return { ...fake, deps, infos }
}

const courseReport = (over: Partial<ReportContentInput> = {}): ReportContentInput => ({
  contentType: 'course',
  contentId: 'c1',
  reason: 'Contains offensive language',
  ...over,
})

test('reporting a course creates an open report from the session user', async () => {
  const { deps, reports } = setup()
  const result = await reportContent(courseReport({ reason: '  Contains offensive language  ' }), deps)
  assert.deepEqual(result, { success: true, reportId: 'r1', status: 'open' })
  assert.deepEqual(reports, [
    {
      id: 'r1',
      status: 'open',
      reporterId: 'pupil1',
      contentType: 'course',
      contentId: 'c1',
      reason: 'Contains offensive language',
      category: 'other',
    },
  ])
})

test('reporting a lesson creates a report with contentType lesson', async () => {
  const { deps, reports } = setup()
  const result = await reportContent({ contentType: 'lesson', contentId: 'l1', reason: 'Wrong answers' }, deps)
  assert.ok('success' in result)
  assert.equal(reports.length, 1)
  assert.equal(reports[0].contentType, 'lesson')
  assert.equal(reports[0].contentId, 'l1')
  assert.equal(reports[0].reporterId, 'pupil1')
})

test('reporter id comes from the session, not the input', async () => {
  const { deps, reports } = setup()
  await reportContent({ ...courseReport(), reporterId: 'someone-else' } as ReportContentInput, deps)
  assert.equal(reports[0].reporterId, 'pupil1')
})

test('owner reporting their own course is rejected', async () => {
  const { deps, reports } = setup(OWNER)
  assert.deepEqual(await reportContent(courseReport(), deps), { error: OWN_CONTENT_MESSAGE })
  assert.equal(reports.length, 0)
})

test('owner reporting a lesson in their course is rejected', async () => {
  const { deps, reports } = setup(OWNER)
  const result = await reportContent({ contentType: 'lesson', contentId: 'l1', reason: 'x' }, deps)
  assert.deepEqual(result, { error: OWN_CONTENT_MESSAGE })
  assert.equal(reports.length, 0)
})

test('unauthenticated call is rejected', async () => {
  const { deps, reports } = setup(null)
  assert.deepEqual(await reportContent(courseReport(), deps), { error: UNAUTHENTICATED_MESSAGE })
  assert.equal(reports.length, 0)
})

test('session without a user id is treated as unauthenticated', async () => {
  const { deps, reports } = setup({ userId: '' })
  assert.deepEqual(await reportContent(courseReport(), deps), { error: UNAUTHENTICATED_MESSAGE })
  assert.equal(reports.length, 0)
})

test('unknown course returns a not-found error', async () => {
  const { deps, reports } = setup()
  assert.deepEqual(await reportContent(courseReport({ contentId: 'missing' }), deps), { error: NOT_FOUND_MESSAGE })
  assert.equal(reports.length, 0)
})

test('unknown lesson returns a not-found error', async () => {
  const { deps, reports } = setup()
  const result = await reportContent({ contentType: 'lesson', contentId: 'missing', reason: 'x' }, deps)
  assert.deepEqual(result, { error: NOT_FOUND_MESSAGE })
  assert.equal(reports.length, 0)
})

test('a course id reported as a lesson is not found', async () => {
  const { deps, reports } = setup()
  const result = await reportContent({ contentType: 'lesson', contentId: 'c1', reason: 'x' }, deps)
  assert.deepEqual(result, { error: NOT_FOUND_MESSAGE })
  assert.equal(reports.length, 0)
})

test('invalid contentType is rejected', async () => {
  const { deps, reports } = setup()
  const result = await reportContent(courseReport({ contentType: 'user' as never }), deps)
  assert.deepEqual(result, { error: INVALID_CONTENT_TYPE_MESSAGE })
  assert.equal(reports.length, 0)
})

test('empty reason is rejected', async () => {
  const { deps, reports } = setup()
  assert.deepEqual(await reportContent(courseReport({ reason: '' }), deps), { error: EMPTY_REASON_MESSAGE })
  assert.equal(reports.length, 0)
})

test('whitespace-only reason is rejected', async () => {
  const { deps, reports } = setup()
  assert.deepEqual(await reportContent(courseReport({ reason: '   \n\t ' }), deps), { error: EMPTY_REASON_MESSAGE })
  assert.equal(reports.length, 0)
})

test('reason at the maximum length is accepted', async () => {
  const { deps, reports } = setup()
  const result = await reportContent(courseReport({ reason: 'a'.repeat(MAX_REASON_LENGTH) }), deps)
  assert.ok('success' in result)
  assert.equal(reports.length, 1)
})

test('reason longer than the maximum is rejected', async () => {
  const { deps, reports } = setup()
  const result = await reportContent(courseReport({ reason: 'a'.repeat(MAX_REASON_LENGTH + 1) }), deps)
  assert.deepEqual(result, { error: REASON_TOO_LONG_MESSAGE })
  assert.equal(reports.length, 0)
})

test('reason is stored as plain text, unchanged', async () => {
  const { deps, reports } = setup()
  const result = await reportContent(courseReport({ reason: '<script>alert(1)</script>' }), deps)
  assert.equal(reports[0].reason, '<script>alert(1)</script>')
  assert.ok(!JSON.stringify(result).includes('script'))
})

test('category is validated and stored when provided', async () => {
  const { deps, reports } = setup()
  await reportContent(courseReport({ category: 'safeguarding' }), deps)
  assert.equal(reports[0].category, 'safeguarding')
})

test('unknown category is rejected', async () => {
  const { deps, reports } = setup()
  const result = await reportContent(courseReport({ category: 'nonsense' as never }), deps)
  assert.deepEqual(result, { error: INVALID_CATEGORY_MESSAGE })
  assert.equal(reports.length, 0)
})

test('reason is required even when a category is given', async () => {
  const { deps, reports } = setup()
  const result = await reportContent(courseReport({ category: 'spam', reason: ' ' }), deps)
  assert.deepEqual(result, { error: EMPTY_REASON_MESSAGE })
  assert.equal(reports.length, 0)
})

test('duplicate report by the same user updates the existing report', async () => {
  const { deps, reports, infos } = setup()
  const first = await reportContent(courseReport({ reason: 'first' }), deps)
  const second = await reportContent(courseReport({ reason: 'second', category: 'spam' }), deps)
  assert.deepEqual(second, first)
  assert.equal(reports.length, 1)
  assert.equal(reports[0].reason, 'second')
  assert.equal(reports[0].category, 'spam')
  assert.equal(infos.length, 1)
})

test('different users reporting the same content create separate reports', async () => {
  const fake = setup()
  await reportContent(courseReport(), fake.deps)
  await reportContent(courseReport(), { ...fake.deps, getSession: async () => ({ userId: 'pupil2' }) })
  assert.equal(fake.reports.length, 2)
})

test('reporting is rate-limited per user', async () => {
  const { deps, reports } = setup()
  for (let i = 0; i < RATE_LIMIT.limit; i++) {
    const result = await reportContent(courseReport({ reason: `reason ${i}` }), deps)
    assert.ok('success' in result)
  }
  const blocked = await reportContent({ contentType: 'lesson', contentId: 'l1', reason: 'x' }, deps)
  assert.deepEqual(blocked, { error: RATE_LIMITED_MESSAGE })
  assert.equal(reports.length, 1)

  // Another user is unaffected.
  const other = await reportContent(courseReport(), { ...deps, getSession: async () => ({ userId: 'pupil2' }) })
  assert.ok('success' in other)
})

test('new report is logged with id, contentType and contentId only', async () => {
  const { deps, infos } = setup()
  const reason = 'Very specific complaint text'
  await reportContent(courseReport({ reason }), deps)
  assert.equal(infos.length, 1)
  assert.match(infos[0], /r1/)
  assert.match(infos[0], /course/)
  assert.match(infos[0], /c1/)
  assert.ok(!infos[0].includes(reason))
  assert.ok(!infos[0].includes(REPORTER_EMAIL))
  assert.ok(!infos[0].includes(REPORTER.userId))
})

test('result exposes only the caller’s own report id and status', async () => {
  const fake = setup()
  await reportContent(courseReport(), { ...fake.deps, getSession: async () => ({ userId: 'pupil2' }) })
  const result = await reportContent(courseReport(), fake.deps)
  assert.deepEqual(Object.keys(result).sort(), ['reportId', 'status', 'success'])
  assert.deepEqual(result, { success: true, reportId: 'r2', status: 'open' })
})
