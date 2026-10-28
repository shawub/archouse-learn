import { getTeacherDashboard } from '@/lib/actions/teacher'
import { auth } from '@/auth'
import Link from 'next/link'

const SUBJECT_LABELS: Record<string, string> = {
  MATHS: 'Maths', ENGLISH: 'English', SCIENCE: 'Science',
  HISTORY: 'History', GEOGRAPHY: 'Geography', COMPUTING: 'Computing',
  ART: 'Art', MUSIC: 'Music', PE: 'PE', RE: 'RE', MFL: 'MFL',
}
const KS_LABELS: Record<string, string> = { KS1: 'KS1', KS2: 'KS2', KS3: 'KS3', KS4: 'KS4' }

export default async function TeacherDashboard() {
  const session = await auth()
  const { courseCount, studentCount, recentCourses } = await getTeacherDashboard()

  const totalEnrolled = recentCourses.reduce(
    (n, c) => n + c.assignments.reduce((m, a) => m + a._count.enrollments, 0), 0
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Good morning, {session?.user.name?.split(' ')[0] ?? 'Teacher'}
        </h1>
        <p className="text-gray-500 mt-1">Here's what's happening across your classes</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Courses', value: courseCount },
          { label: 'Students enrolled', value: studentCount },
          { label: 'Active enrolments', value: totalEnrolled },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-3xl font-bold text-gray-900">{s.value}</p>
            <p className="text-sm text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Recent courses */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Recent courses</h2>
          <Link href="/teacher/courses" className="text-sm text-brand-600 hover:underline">View all</Link>
        </div>
        {recentCourses.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-200 p-8 text-center">
            <p className="text-gray-500 text-sm">No courses yet. Create your first course to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentCourses.map(course => (
              <div key={course.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{course.title}</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {SUBJECT_LABELS[course.subject]} · {KS_LABELS[course.keyStage]} · {course._count.lessons} lessons
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {course.assignments.reduce((n, a) => n + a._count.enrollments, 0)} students
                  </p>
                  <p className="text-xs text-gray-400">enrolled</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
