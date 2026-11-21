import type { ContentType, ReportCategory, ReportContentStore } from '@/lib/report-content'

export type FakeOwned = { id: string; teacherId: string }

export type FakeReport = {
  id: string
  reporterId: string
  contentType: ContentType
  contentId: string
  reason: string
  category: ReportCategory
  status: string
}

/** In-memory ReportContentStore mirroring the Prisma implementation's semantics. */
export function createFakeReportStore({ courses = [], lessons = [] }: { courses?: FakeOwned[]; lessons?: FakeOwned[] } = {}) {
  const reports: FakeReport[] = []
  let nextId = 1

  const store: ReportContentStore = {
    async findCourseOwner(id) {
      const c = courses.find(c => c.id === id)
      return c ? { teacherId: c.teacherId } : null
    },
    async findLessonOwner(id) {
      const l = lessons.find(l => l.id === id)
      return l ? { teacherId: l.teacherId } : null
    },
    async findExistingReport(reporterId, contentType, contentId) {
      const r = reports.find(
        r => r.reporterId === reporterId && r.contentType === contentType && r.contentId === contentId,
      )
      return r ? { id: r.id, status: r.status } : null
    },
    async createReport(data) {
      if (reports.some(r => r.reporterId === data.reporterId && r.contentType === data.contentType && r.contentId === data.contentId)) {
        throw new Error('Unique constraint failed')
      }
      const report: FakeReport = { id: `r${nextId++}`, status: 'open', ...data }
      reports.push(report)
      return { id: report.id, status: report.status }
    },
    async updateReport(id, { reason, category }) {
      const r = reports.find(r => r.id === id)
      if (!r) throw new Error('Record to update not found')
      r.reason = reason
      r.category = category
      return { id: r.id, status: r.status }
    },
  }

  return { store, reports, courses, lessons }
}
