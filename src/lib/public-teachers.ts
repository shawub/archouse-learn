// Public (unauthenticated) teacher discovery and profiles. No session is
// consulted — the store is the only dependency. The wired server actions live
// in `actions/teacher.ts`.
//
// Every returned object is built from an explicit whitelist so learner data
// (subscribers, progress) and account data (email, role, credentials) can
// never leak, even if a store returns extra fields.
//
// A user with no published courses has no public profile: they are excluded
// from discovery and `getPublicTeacherProfile` reports them as not found.
// This keeps non-teachers (e.g. students) from being looked up by id.

import type { KeyStage, Subject } from '@prisma/client'

export type PublicCourse = {
  id: string
  title: string
  subject: Subject
  keyStage: KeyStage
  lessonCount: number
}

export type PublicTeacher = { id: string; name: string | null }

export type PublicTeacherProfile = PublicTeacher & { courses: PublicCourse[] }

export type DiscoverFilters = { subject?: Subject; keyStage?: KeyStage }

export interface PublicTeacherStore {
  findTeachersWithPublishedCourses(filters: DiscoverFilters): Promise<PublicTeacher[]>
  /** Returns null when the user is unknown or has no published courses. */
  getPublicProfile(teacherId: string): Promise<PublicTeacherProfile | null>
}

export type PublicTeacherDeps = { store: PublicTeacherStore }

export type PublicTeacherProfileResult =
  | { found: false }
  | { found: true; profile: PublicTeacherProfile }

const SUBJECTS: readonly Subject[] = [
  'MATHS', 'ENGLISH', 'SCIENCE', 'HISTORY', 'GEOGRAPHY', 'COMPUTING', 'ART', 'MUSIC', 'PE', 'RE', 'MFL',
]
const KEY_STAGES: readonly KeyStage[] = ['KS1', 'KS2', 'KS3', 'KS4']

function compareIds(a: string, b: string) {
  return a < b ? -1 : a > b ? 1 : 0
}

function compareTeachers(a: PublicTeacher, b: PublicTeacher) {
  if (a.name !== b.name) {
    if (a.name === null) return 1
    if (b.name === null) return -1
    const byName = compareIds(a.name, b.name)
    if (byName !== 0) return byName
  }
  return compareIds(a.id, b.id)
}

function compareCourses(a: PublicCourse, b: PublicCourse) {
  return compareIds(a.title, b.title) || compareIds(a.id, b.id)
}

function toPublicTeacher(t: PublicTeacher): PublicTeacher {
  return { id: t.id, name: t.name ?? null }
}

function toPublicCourse(c: PublicCourse): PublicCourse {
  return { id: c.id, title: c.title, subject: c.subject, keyStage: c.keyStage, lessonCount: c.lessonCount ?? 0 }
}

export async function discoverTeachers(
  filters: DiscoverFilters,
  deps: PublicTeacherDeps,
): Promise<PublicTeacher[]> {
  const { subject, keyStage } = filters ?? {}
  // Unknown enum values match nothing rather than reaching the database.
  if (subject !== undefined && !SUBJECTS.includes(subject)) return []
  if (keyStage !== undefined && !KEY_STAGES.includes(keyStage)) return []

  const teachers = await deps.store.findTeachersWithPublishedCourses({
    ...(subject ? { subject } : {}),
    ...(keyStage ? { keyStage } : {}),
  })

  const seen = new Set<string>()
  return teachers
    .filter(t => !seen.has(t.id) && seen.add(t.id))
    .map(toPublicTeacher)
    .sort(compareTeachers)
}

export async function getPublicTeacherProfile(
  teacherId: string,
  deps: PublicTeacherDeps,
): Promise<PublicTeacherProfileResult> {
  if (typeof teacherId !== 'string' || teacherId === '') return { found: false }

  const profile = await deps.store.getPublicProfile(teacherId)
  if (!profile || profile.courses.length === 0) return { found: false }

  return {
    found: true,
    profile: {
      ...toPublicTeacher(profile),
      courses: profile.courses.map(toPublicCourse).sort(compareCourses),
    },
  }
}
