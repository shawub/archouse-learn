import { getTeacherCourses } from '@/lib/actions/teacher'

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

export default async function TeacherCourses() {
  const courses = await getTeacherCourses()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Courses</h1>
          <p className="text-gray-500 mt-1">{courses.length} course{courses.length !== 1 ? 's' : ''}</p>
        </div>
        {/* Create course button — wired up in a future ticket */}
        <button className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors opacity-50 cursor-not-allowed" disabled>
          + New course
        </button>
      </div>

      {courses.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-200 p-12 text-center">
          <p className="text-gray-400 text-sm">No courses yet.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {courses.map(course => {
            const enrolled = course.assignments.reduce((n, a) => n + a._count.enrollments, 0)
            return (
              <div key={course.id} className="bg-white rounded-xl border border-gray-100 p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h2 className="font-semibold text-gray-900">{course.title}</h2>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${KS_COLOURS[course.keyStage]}`}>
                        {course.keyStage}
                      </span>
                    </div>
                    {course.description && (
                      <p className="text-sm text-gray-500 mb-3 line-clamp-2">{course.description}</p>
                    )}
                    <div className="flex gap-4 text-sm text-gray-500">
                      <span>{SUBJECT_LABELS[course.subject]}</span>
                      <span>·</span>
                      <span>{course._count.lessons} lessons</span>
                      <span>·</span>
                      <span>{enrolled} students enrolled</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
