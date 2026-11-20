import { prisma } from '@/lib/db'
import { auth } from '@/auth'
import {
  discoverTeachers as discoverTeachersCore,
  getPublicTeacherProfile as getPublicTeacherProfileCore,
  type DiscoverFilters,
  type PublicTeacher,
  type PublicTeacherDeps,
  type PublicTeacherProfileResult,
  type PublicTeacherStore,
} from '@/lib/public-teachers'

export async function getTeacherDashboard() {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')
  const teacherId = session.user.id

  const [courseCount, courses, studentCount] = await Promise.all([
    prisma.course.count({ where: { teacherId } }),
    prisma.course.findMany({
      where: { teacherId },
      include: {
        _count: { select: { lessons: true, assignments: true } },
        assignments: {
          include: { _count: { select: { enrollments: true } } },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    }),
    prisma.user.count({
      where: {
        role: 'STUDENT',
        enrollments: {
          some: { assignment: { teacherId } },
        },
      },
    }),
  ])

  return { courseCount, studentCount, recentCourses: courses }
}

export async function getTeacherCourses() {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  return prisma.course.findMany({
    where: { teacherId: session.user.id },
    include: {
      _count: { select: { lessons: true } },
      assignments: {
        include: { _count: { select: { enrollments: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getTeacherStudents() {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')
  const teacherId = session.user.id

  const students = await prisma.user.findMany({
    where: {
      role: 'STUDENT',
      enrollments: { some: { assignment: { teacherId } } },
    },
    include: {
      enrollments: {
        where: { assignment: { teacherId } },
        include: {
          assignment: { include: { course: true } },
        },
      },
      progress: {
        where: {
          lesson: { course: { teacherId } },
          completed: true,
        },
        include: { lesson: { include: { course: true } } },
      },
    },
    orderBy: { name: 'asc' },
  })

  return students.map(s => ({
    id: s.id,
    name: s.name,
    email: s.email,
    coursesAssigned: s.enrollments.length,
    lessonsCompleted: s.progress.length,
  }))
}

// Public, unauthenticated actions — these must never call auth().
const prismaPublicTeacherStore: PublicTeacherStore = {
  findTeachersWithPublishedCourses: ({ subject, keyStage }) =>
    prisma.user.findMany({
      where: {
        createdCourses: {
          some: {
            published: true,
            ...(subject ? { subject } : {}),
            ...(keyStage ? { keyStage } : {}),
          },
        },
      },
      select: { id: true, name: true },
      orderBy: [{ name: { sort: 'asc', nulls: 'last' } }, { id: 'asc' }],
    }),
  async getPublicProfile(id) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        createdCourses: {
          where: { published: true },
          select: {
            id: true,
            title: true,
            subject: true,
            keyStage: true,
            _count: { select: { lessons: true } },
          },
          orderBy: [{ title: 'asc' }, { id: 'asc' }],
        },
      },
    })
    if (!user || user.createdCourses.length === 0) return null
    return {
      id: user.id,
      name: user.name,
      courses: user.createdCourses.map(c => ({
        id: c.id,
        title: c.title,
        subject: c.subject,
        keyStage: c.keyStage,
        lessonCount: c._count.lessons,
      })),
    }
  },
}

const publicTeacherDeps: PublicTeacherDeps = { store: prismaPublicTeacherStore }

export async function discoverTeachers(filters: DiscoverFilters = {}): Promise<PublicTeacher[]> {
  return discoverTeachersCore(filters, publicTeacherDeps)
}

export async function getPublicTeacherProfile(teacherId: string): Promise<PublicTeacherProfileResult> {
  return getPublicTeacherProfileCore(teacherId, publicTeacherDeps)
}
