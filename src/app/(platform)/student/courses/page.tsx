import { getStudentCourses } from '@/lib/actions/student'
import Link from 'next/link'

const SUBJECT_LABELS: Record<string, string> = {
  MATHS: 'Maths', ENGLISH: 'English', SCIENCE: 'Science',
  HISTORY: 'History', GEOGRAPHY: 'Geography', COMPUTING: 'Computing',
  ART: 'Art', MUSIC: 'Music', PE: 'PE', RE: 'RE', MFL: 'MFL',
}

const KS_COLOURS: Record<string, string> = {
  KS1: 'bg-green-50 text-green-700',
  KS2: 'bg-blue-50 text-blue-700',
  KS3: 'bg-purple-50 text-purple-700',
  KS4: 'bg-orange-50 text-orange-700',
}

export default async function StudentCourses() {
  const courses = await getStudentCourses()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Courses</h1>
        <p className="text-gray-500 mt-1">{courses.length} course{courses.length !== 1 ? 's' : ''} assigned</p>
      </div>

      {courses.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-200 p-12 text-center">
          <p className="text-gray-400 text-sm">No courses assigned yet. Ask your teacher to enrol you in a course.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {courses.map(c => {
            const pct = c.lessonCount > 0 ? Math.round((c.completedCount / c.lessonCount) * 100) : 0
            return (
              <Link key={c.id} href={`/student/courses/${c.id}`}
                className="block bg-white rounded-xl border border-gray-100 p-5 hover:border-brand-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="font-semibold text-gray-900">{c.title}</h2>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${KS_COLOURS[c.keyStage]}`}>
                        {c.keyStage}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{SUBJECT_LABELS[c.subject]} · {c.lessonCount} lessons</p>
                  </div>
                  <span className="text-sm font-medium text-brand-600">{pct}%</span>
                </div>
                <div className="bg-gray-100 rounded-full h-1.5">
                  <div className="bg-brand-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                </div>
                {c.dueDate && (
                  <p className="text-xs text-gray-400 mt-2">
                    Due {new Date(c.dueDate).toLocaleDateString('en-GB')}
                  </p>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
