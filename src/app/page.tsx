import Link from 'next/link'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'

export default async function LandingPage() {
  const session = await auth()
  if (session?.user) {
    redirect(session.user.role === 'TEACHER' ? '/teacher/dashboard' : '/student/dashboard')
  }

  return (
    <div className="flex-1 bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <span className="text-xl font-bold text-brand-600">Archouse Learn</span>
        <div className="flex gap-3">
          <Link href="/login" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-brand-600 transition-colors">
            Sign in
          </Link>
          <Link href="/register" className="px-4 py-2 text-sm font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors">
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="max-w-4xl mx-auto px-6 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 text-sm font-medium px-3 py-1 rounded-full mb-8">
          Built for UK primary &amp; secondary schools
        </div>
        <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-6">
          Learning that keeps
          <br />
          <span className="text-brand-600">every student moving</span>
        </h1>
        <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto">
          Teachers assign structured content aligned to the National Curriculum.
          Students progress at their own pace. Everyone sees the full picture.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/register?role=teacher" className="px-6 py-3 bg-brand-600 text-white font-medium rounded-lg hover:bg-brand-700 transition-colors">
            I'm a teacher
          </Link>
          <Link href="/register?role=student" className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:border-brand-500 hover:text-brand-600 transition-colors">
            I'm a student
          </Link>
        </div>
      </main>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { title: 'National Curriculum aligned', body: "Content tagged by Key Stage (KS1–KS4) and subject, matching England's curriculum." },
          { title: 'Class-level visibility', body: "Teachers see every student's progress in one view — no chasing for updates." },
          { title: 'Self-paced learning', body: 'Students work through lessons at their own speed, picking up where they left off.' },
        ].map(f => (
          <div key={f.title} className="bg-gray-50 rounded-xl p-6">
            <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
            <p className="text-gray-500 text-sm leading-relaxed">{f.body}</p>
          </div>
        ))}
      </section>
    </div>
  )
}
