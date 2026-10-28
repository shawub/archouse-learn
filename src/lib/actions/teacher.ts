import { prisma } from '@/lib/db'
import { auth } from '@/auth'

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
