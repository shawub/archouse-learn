import { getCourseWithProgress, markLessonComplete } from '@/lib/actions/student'
import { notFound } from 'next/navigation'
import { revalidatePath } from 'next/cache'

const SUBJECT_LABELS: Record<string, string> = {
  MATHS: 'Maths', ENGLISH: 'English', SCIENCE: 'Science',
  HISTORY: 'History', GEOGRAPHY: 'Geography', COMPUTING: 'Computing',
  ART: 'Art', MUSIC: 'Music', PE: 'PE', RE: 'RE', MFL: 'MFL',
}

export default async function CoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>
  searchParams: Promise<{ lesson?: string }>
}) {
  const { courseId } = await params
  const { lesson: lessonIdParam } = await searchParams

  const course = await getCourseWithProgress(courseId)
  if (!course) notFound()

  const activeLessonId = lessonIdParam ?? course.lessons[0]?.id
  const activeLesson = course.lessons.find(l => l.id === activeLessonId) ?? course.lessons[0]
  const pct = course.lessons.length > 0
    ? Math.round((course.completedCount / course.lessons.length) * 100)
    : 0

  async function complete(lessonId: string) {
    'use server'
    await markLessonComplete(lessonId)
    revalidatePath(`/student/courses/${courseId}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-sm text-gray-500 mb-1">{SUBJECT_LABELS[course.subject]} · {course.keyStage}</p>
        <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>
        <p className="text-sm text-gray-400 mt-1">By {course.teacher.name}</p>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 bg-gray-100 rounded-full h-2">
            <div className="bg-brand-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-sm text-gray-500 whitespace-nowrap">
            {course.completedCount}/{course.lessons.length} lessons
          </span>
        </div>
      </div>

      <div className="grid grid-cols-[240px_1fr] gap-6">
        {/* Lesson list */}
        <div className="bg-white rounded-xl border border-gray-100 p-3 space-y-1 h-fit">
          {course.lessons.map((lesson, i) => (
            <a
              key={lesson.id}
              href={`/student/courses/${courseId}?lesson=${lesson.id}`}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                lesson.id === activeLesson?.id
                  ? 'bg-brand-50 text-brand-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs flex-shrink-0 ${
                lesson.completed
                  ? 'bg-brand-500 border-brand-500 text-white'
                  : 'border-gray-300'
              }`}>
                {lesson.completed ? '✓' : i + 1}
              </span>
              <span className="truncate">{lesson.title}</span>
            </a>
          ))}
        </div>

        {/* Lesson content */}
        {activeLesson ? (
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">{activeLesson.title}</h2>
              {activeLesson.completed && (
                <span className="text-xs bg-green-50 text-green-700 font-medium px-2.5 py-1 rounded-full">
                  Completed
                </span>
              )}
            </div>
            <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed">
              {activeLesson.content}
            </div>
            {!activeLesson.completed && (
              <form action={complete.bind(null, activeLesson.id)} className="mt-8">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
                >
                  Mark as complete
                </button>
              </form>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 p-6 flex items-center justify-center text-gray-400 text-sm">
            Select a lesson to begin
          </div>
        )}
      </div>
    </div>
  )
}
