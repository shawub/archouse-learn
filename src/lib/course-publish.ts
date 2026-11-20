// Core publish/unpublish logic. Session and database access are injected so
// the flow can be unit-tested without Prisma; the wired server actions live
// in `actions/course.ts`.
//
// Ownership is the only permission check — any user (whatever their role)
// may publish or unpublish a course they own.

export type CoursePublishRecord = { id: string; teacherId: string; published: boolean }

export interface CoursePublishStore {
  findCourseById(id: string): Promise<CoursePublishRecord | null>
  setPublished(id: string, published: boolean): Promise<void>
}

export type CoursePublishSession = { userId: string } | null

export type CoursePublishDeps = {
  getSession: () => Promise<CoursePublishSession>
  store: CoursePublishStore
}

export type CoursePublishResult = { id: string; published: boolean }

export async function setCoursePublished(
  courseId: string,
  published: boolean,
  deps: CoursePublishDeps,
): Promise<CoursePublishResult> {
  const session = await deps.getSession()
  if (!session?.userId) throw new Error('Unauthorized')

  const course = await deps.store.findCourseById(courseId)
  if (!course) throw new Error('Not found')
  if (course.teacherId !== session.userId) throw new Error('Forbidden')

  await deps.store.setPublished(courseId, published)
  return { id: courseId, published }
}

export function publishCourse(courseId: string, deps: CoursePublishDeps): Promise<CoursePublishResult> {
  return setCoursePublished(courseId, true, deps)
}

export function unpublishCourse(courseId: string, deps: CoursePublishDeps): Promise<CoursePublishResult> {
  return setCoursePublished(courseId, false, deps)
}
