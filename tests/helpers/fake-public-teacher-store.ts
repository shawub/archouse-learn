import type { KeyStage, Subject } from '@prisma/client'
import type { PublicTeacherStore } from '@/lib/public-teachers'

export type FakeSeedCourse = {
  id: string
  title: string
  subject: Subject
  keyStage: KeyStage
  published: boolean
  lessonCount: number
  // Sensitive fields the store must never surface.
  subscriberCount?: number
  progress?: unknown[]
}

export type FakeSeedTeacher = {
  id: string
  name: string | null
  // Sensitive fields the store must never surface.
  email?: string
  role?: string
  passwordHash?: string
  courses: FakeSeedCourse[]
}

/**
 * In-memory PublicTeacherStore mirroring the Prisma implementation's explicit
 * selects: only whitelisted fields are ever returned.
 */
export function createFakePublicTeacherStore(seed: FakeSeedTeacher[] = []) {
  const store: PublicTeacherStore = {
    async findTeachersWithPublishedCourses({ subject, keyStage }) {
      return seed
        .filter(t =>
          t.courses.some(
            c =>
              c.published &&
              (subject === undefined || c.subject === subject) &&
              (keyStage === undefined || c.keyStage === keyStage),
          ),
        )
        .map(t => ({ id: t.id, name: t.name }))
    },
    async getPublicProfile(id) {
      const t = seed.find(t => t.id === id)
      if (!t) return null
      const courses = t.courses
        .filter(c => c.published)
        .map(c => ({ id: c.id, title: c.title, subject: c.subject, keyStage: c.keyStage, lessonCount: c.lessonCount }))
      if (courses.length === 0) return null
      return { id: t.id, name: t.name, courses }
    },
  }

  return { store, seed }
}
