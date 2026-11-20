'use server'

import { prisma } from '@/lib/db'
import { auth } from '@/auth'
import {
  publishCourse as publishCourseCore,
  unpublishCourse as unpublishCourseCore,
  type CoursePublishDeps,
  type CoursePublishResult,
  type CoursePublishStore,
} from '@/lib/course-publish'

const prismaCourseStore: CoursePublishStore = {
  findCourseById: id =>
    prisma.course.findUnique({
      where: { id },
      select: { id: true, teacherId: true, published: true },
    }),
  async setPublished(id, published) {
    await prisma.course.update({ where: { id }, data: { published } })
  },
}

const deps: CoursePublishDeps = {
  getSession: async () => {
    const session = await auth()
    return session?.user?.id ? { userId: session.user.id } : null
  },
  store: prismaCourseStore,
}

export async function publishCourse(courseId: string): Promise<CoursePublishResult> {
  return publishCourseCore(courseId, deps)
}

export async function unpublishCourse(courseId: string): Promise<CoursePublishResult> {
  return unpublishCourseCore(courseId, deps)
}
