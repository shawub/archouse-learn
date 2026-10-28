import { getTeacherStudents } from '@/lib/actions/teacher'

export default async function TeacherStudents() {
  const students = await getTeacherStudents()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Students</h1>
        <p className="text-gray-500 mt-1">{students.length} student{students.length !== 1 ? 's' : ''} enrolled across your courses</p>
      </div>

      {students.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-200 p-12 text-center">
          <p className="text-gray-400 text-sm">No students enrolled yet. Assign a course to students to see them here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Student</th>
                <th className="text-right px-5 py-3 font-medium text-gray-600">Courses</th>
                <th className="text-right px-5 py-3 font-medium text-gray-600">Lessons completed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {students.map(s => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-gray-900">{s.name}</p>
                    <p className="text-xs text-gray-400">{s.email}</p>
                  </td>
                  <td className="px-5 py-3.5 text-right text-gray-700">{s.coursesAssigned}</td>
                  <td className="px-5 py-3.5 text-right text-gray-700">{s.lessonsCompleted}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
