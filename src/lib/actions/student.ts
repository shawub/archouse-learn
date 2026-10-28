import { prisma } from '@/lib/db'
import { auth } from '@/auth'

export async function getStudentDashboard() {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')
  const studentId = session.user.id

  const enrollments = await prisma.enrollment.findMany({
    where: { studentId },
    include: {
      assignment: {
        include: {
          course: {
            include: {
              lessons: { select: { id: true } },
            },
          },
        },
      },
    },
    orderBy: { enrolledAt: 'desc' },
  })

  const completedProgress = await prisma.lessonProgress.count({
    where: { studentId, completed: true },
  })

  const coursesWithProgress = await Promise.all(
    enrollments.map(async (e) => {
      const course = e.assignment.course
      const completedInCourse = await prisma.lessonProgress.count({
        where: { studentId, lessonId: { in: course.lessons.map(l => l.id) }, completed: true },
      })
      return {
        id: course.id,
        title: course.title,
        subject: course.subject,
        keyStage: course.keyStage,
        lessonCount: course.lessons.length,
        completedCount: completedInCourse,
        dueDate: e.assignment.dueDate,
      }
    })
  )

  return {
    coursesCount: enrollments.length,
    lessonsCompleted: completedProgress,
    courses: coursesWithProgress,
  }
}

export async function getStudentCourses() {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')
  const studentId = session.user.id

  const enrollments = await prisma.enrollment.findMany({
    where: { studentId },
    include: {
      assignment: {
        include: {
          course: {
            include: { lessons: { select: { id: true }, orderBy: { order: 'asc' } } },
          },
        },
      },
    },
  })

  return Promise.all(
    enrollments.map(async (e) => {
      const course = e.assignment.course
      const completed = await prisma.lessonProgress.count({
        where: { studentId, lessonId: { in: course.lessons.map(l => l.id) }, completed: true },
      })
      return {
        id: course.id,
        title: course.title,
        subject: course.subject,
        keyStage: course.keyStage,
        lessonCount: course.lessons.length,
        completedCount: completed,
        dueDate: e.assignment.dueDate,
      }
    })
  )
}

export async function getCourseWithProgress(courseId: string) {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')
  const studentId = session.user.id

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      teacher: { select: { name: true } },
      lessons: { orderBy: { order: 'asc' } },
    },
  })
  if (!course) return null

  const progress = await prisma.lessonProgress.findMany({
    where: { studentId, lessonId: { in: course.lessons.map(l => l.id) } },
  })

  const progressMap = new Map(progress.map(p => [p.lessonId, p]))

  return {
    ...course,
    lessons: course.lessons.map(l => ({
      ...l,
      completed: progressMap.get(l.id)?.completed ?? false,
    })),
    completedCount: progress.filter(p => p.completed).length,
  }
}

export async function markLessonComplete(lessonId: string) {
  'use server'
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  await prisma.lessonProgress.upsert({
    where: { studentId_lessonId: { studentId: session.user.id, lessonId } },
    create: { studentId: session.user.id, lessonId, completed: true, completedAt: new Date() },
    update: { completed: true, completedAt: new Date() },
  })
}
