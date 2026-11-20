import type { CoursePublishRecord, CoursePublishStore } from '@/lib/course-publish'

/** In-memory CoursePublishStore mirroring the Prisma implementation's semantics. */
export function createFakeCourseStore(courses: CoursePublishRecord[] = []) {
  const store: CoursePublishStore = {
    async findCourseById(id) {
      const c = courses.find(c => c.id === id)
      return c ? { ...c } : null
    },
    async setPublished(id, published) {
      const c = courses.find(c => c.id === id)
      if (!c) throw new Error('Record to update not found')
      c.published = published
    },
  }

  return { store, courses }
}
