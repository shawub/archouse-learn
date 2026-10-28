import { getStudentDashboard } from '@/lib/actions/student'
import { auth } from '@/auth'
import Link from 'next/link'

const SUBJECT_LABELS: Record<string, string> = {
  MATHS: 'Maths', ENGLISH: 'English', SCIENCE: 'Science',
  HISTORY: 'History', GEOGRAPHY: 'Geography', COMPUTING: 'Computing',
  ART: 'Art', MUSIC: 'Music', PE: 'PE', RE: 'RE', MFL: 'MFL',
}

export default async function StudentDashboard() {
  const session = await auth()
  const { coursesCount, lessonsCompleted, courses } = await getStudentDashboard()

  const inProgress = courses.filter(c => c.completedCount > 0 && c.completedCount < c.lessonCount)
  const notStarted = courses.filter(c => c.completedCount === 0)
  const done = courses.filter(c => c.lessonCount > 0 && c.completedCount >= c.lessonCount)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Hello, {session?.user.name?.split(' ')[0] ?? 'there'}!
        </h1>
        <p className="text-gray-500 mt-1">Keep up the great work</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Courses assigned', value: coursesCount },
          { label: 'Lessons completed', value: lessonsCompleted },
          { label: 'Courses finished', value: done.length },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-3xl font-bold text-gray-900">{s.value}</p>
            <p className="text-sm text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {inProgress.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-3">Continue learning</h2>
          <div className="space-y-3">
            {inProgress.map(c => (
              <Link key={c.id} href={`/student/courses/${c.id}`} className="block bg-white rounded-xl border border-gray-100 p-4 hover:border-brand-300 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{c.title}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{SUBJECT_LABELS[c.subject]} · {c.keyStage}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-brand-600">{c.completedCount}/{c.lessonCount}</p>
                    <p className="text-xs text-gray-400">lessons done</p>
                  </div>
                </div>
                <div className="mt-3 bg-gray-100 rounded-full h-1.5">
                  <div
                    className="bg-brand-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${(c.completedCount / c.lessonCount) * 100}%` }}
                  />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {notStarted.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-3">Not started</h2>
          <div className="space-y-3">
            {notStarted.map(c => (
              <Link key={c.id} href={`/student/courses/${c.id}`} className="block bg-white rounded-xl border border-gray-100 p-4 hover:border-brand-300 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{c.title}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{SUBJECT_LABELS[c.subject]} · {c.keyStage} · {c.lessonCount} lessons</p>
                  </div>
                  {c.dueDate && (
                    <p className="text-xs text-gray-400">Due {new Date(c.dueDate).toLocaleDateString('en-GB')}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
