'use server'

import { prisma } from '@/lib/db'
import { auth } from '@/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import {
  reportContent as reportContentCore,
  type ReportContentDeps,
  type ReportContentInput,
  type ReportContentResult,
  type ReportContentStore,
} from '@/lib/report-content'

const reportRef = { id: true, status: true } as const

const prismaReportStore: ReportContentStore = {
  findCourseOwner: id => prisma.course.findUnique({ where: { id }, select: { teacherId: true } }),
  async findLessonOwner(id) {
    const lesson = await prisma.lesson.findUnique({
      where: { id },
      select: { course: { select: { teacherId: true } } },
    })
    return lesson ? { teacherId: lesson.course.teacherId } : null
  },
  findExistingReport: (reporterId, contentType, contentId) =>
    prisma.contentReport.findUnique({
      where: { reporterId_contentType_contentId: { reporterId, contentType, contentId } },
      select: reportRef,
    }),
  createReport: data => prisma.contentReport.create({ data, select: reportRef }),
  updateReport: (id, data) => prisma.contentReport.update({ where: { id }, data, select: reportRef }),
}

const deps: ReportContentDeps = {
  getSession: async () => {
    const session = await auth()
    return session?.user?.id ? { userId: session.user.id } : null
  },
  store: prismaReportStore,
  checkRateLimit,
  logger: { info: msg => console.info(msg) },
}

export async function reportContent(input: ReportContentInput): Promise<ReportContentResult> {
  return reportContentCore(input, deps)
}
