import { z } from 'zod'
import type { RateLimitOptions } from '@/lib/rate-limit'

// Core report-content logic. Session, database access and rate limiting are
// injected so the flow can be unit-tested without Prisma; the wired server
// action lives in `actions/report.ts`.
//
// Reports are an operator review queue — no automated action is taken in v1.
// The reporter is always the session user, never taken from input.

export const MAX_REASON_LENGTH = 1000

export const RATE_LIMIT = { limit: 10, windowMs: 60 * 60 * 1000 } as const

export const UNAUTHENTICATED_MESSAGE = 'You must be signed in to report content.'
export const INVALID_CONTENT_TYPE_MESSAGE = 'Only courses and lessons can be reported.'
export const NOT_FOUND_MESSAGE = 'That content could not be found.'
export const OWN_CONTENT_MESSAGE = 'You cannot report your own content.'
export const RATE_LIMITED_MESSAGE = 'Too many reports. Please try again later.'
export const EMPTY_REASON_MESSAGE = 'Please give a reason for your report.'
export const REASON_TOO_LONG_MESSAGE = `Reason must be ${MAX_REASON_LENGTH} characters or fewer.`
export const INVALID_CATEGORY_MESSAGE = 'Choose a valid report category.'

export const CONTENT_TYPES = ['course', 'lesson'] as const
export type ContentType = (typeof CONTENT_TYPES)[number]

export const REPORT_CATEGORIES = ['inappropriate', 'safeguarding', 'spam', 'copyright', 'other'] as const
export type ReportCategory = (typeof REPORT_CATEGORIES)[number]

export type ReportContentInput = {
  contentType: ContentType
  contentId: string
  reason: string
  category?: ReportCategory
}

export type ReportContentResult = { success: true; reportId: string; status: string } | { error: string }

export type ReportRef = { id: string; status: string }

export interface ReportContentStore {
  findCourseOwner(id: string): Promise<{ teacherId: string } | null>
  /** Owner of a lesson is the teacher of its parent course. */
  findLessonOwner(id: string): Promise<{ teacherId: string } | null>
  findExistingReport(reporterId: string, contentType: ContentType, contentId: string): Promise<ReportRef | null>
  createReport(data: {
    reporterId: string
    contentType: ContentType
    contentId: string
    reason: string
    category: ReportCategory
  }): Promise<ReportRef>
  updateReport(id: string, data: { reason: string; category: ReportCategory }): Promise<ReportRef>
}

export type ReportContentSession = { userId: string } | null

export type ReportContentDeps = {
  getSession: () => Promise<ReportContentSession>
  store: ReportContentStore
  checkRateLimit: (key: string, opts: RateLimitOptions) => { allowed: boolean }
  now?: () => Date
  logger?: { info: (msg: string) => void }
}

const inputSchema = z.object({
  contentType: z.enum(CONTENT_TYPES, { errorMap: () => ({ message: INVALID_CONTENT_TYPE_MESSAGE }) }),
  contentId: z.string().trim().min(1, NOT_FOUND_MESSAGE),
  reason: z
    .string({ errorMap: () => ({ message: EMPTY_REASON_MESSAGE }) })
    .trim()
    .min(1, EMPTY_REASON_MESSAGE)
    .max(MAX_REASON_LENGTH, REASON_TOO_LONG_MESSAGE),
  category: z
    .enum(REPORT_CATEGORIES, { errorMap: () => ({ message: INVALID_CATEGORY_MESSAGE }) })
    .optional()
    .default('other'),
})

export async function reportContent(input: ReportContentInput, deps: ReportContentDeps): Promise<ReportContentResult> {
  const session = await deps.getSession()
  if (!session?.userId) return { error: UNAUTHENTICATED_MESSAGE }
  const reporterId = session.userId

  const parsed = inputSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? EMPTY_REASON_MESSAGE }
  const { contentType, contentId, reason, category } = parsed.data

  const now = deps.now ?? (() => new Date())
  const limited = deps.checkRateLimit(`report:user:${reporterId}`, { ...RATE_LIMIT, now: now().getTime() })
  if (!limited.allowed) return { error: RATE_LIMITED_MESSAGE }

  const owner =
    contentType === 'course'
      ? await deps.store.findCourseOwner(contentId)
      : await deps.store.findLessonOwner(contentId)
  if (!owner) return { error: NOT_FOUND_MESSAGE }
  if (owner.teacherId === reporterId) return { error: OWN_CONTENT_MESSAGE }

  // One report per reporter per item: a repeat report refreshes the existing one.
  const existing = await deps.store.findExistingReport(reporterId, contentType, contentId)
  if (existing) {
    const updated = await deps.store.updateReport(existing.id, { reason, category })
    return { success: true, reportId: updated.id, status: updated.status }
  }

  const created = await deps.store.createReport({ reporterId, contentType, contentId, reason, category })
  // Never log the reason text or the reporter's identity.
  ;(deps.logger ?? console).info(
    `[report-content] new report ${created.id} for ${contentType} ${contentId}`,
  )
  return { success: true, reportId: created.id, status: created.status }
}
