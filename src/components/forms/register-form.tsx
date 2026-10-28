'use client'

import { useActionState } from 'react'
import { registerAction } from '@/lib/actions/auth'
import Link from 'next/link'

export function RegisterForm({ defaultRole }: { defaultRole?: string }) {
  const [state, action, pending] = useActionState(registerAction, null)

  return (
    <form action={action} className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create account</h1>
        <p className="text-sm text-gray-500 mt-1">Join Archouse Learn</p>
      </div>

      {state?.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {state.error}
        </div>
      )}

      {/* Role selector */}
      <div className="grid grid-cols-2 gap-3">
        {(['TEACHER', 'STUDENT'] as const).map(r => (
          <label key={r} className="relative cursor-pointer">
            <input
              type="radio" name="role" value={r} className="sr-only peer"
              defaultChecked={(defaultRole?.toUpperCase() ?? 'STUDENT') === r}
              required
            />
            <div className="border-2 border-gray-200 rounded-lg p-3 text-center text-sm font-medium text-gray-600 peer-checked:border-brand-500 peer-checked:text-brand-700 peer-checked:bg-brand-50 transition-all">
              {r === 'TEACHER' ? '👩‍🏫 Teacher' : '🎒 Student'}
            </div>
          </label>
        ))}
      </div>

      <div className="space-y-1">
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full name</label>
        <input
          id="name" name="name" type="text" required autoComplete="name"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
        <input
          id="email" name="email" type="email" required autoComplete="email"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
        <input
          id="password" name="password" type="password" required autoComplete="new-password"
          minLength={8}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-400">Minimum 8 characters</p>
      </div>

      <button
        type="submit" disabled={pending}
        className="w-full py-2.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-60 transition-colors"
      >
        {pending ? 'Creating account…' : 'Create account'}
      </button>

      <p className="text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link href="/login" className="text-brand-600 font-medium hover:underline">Sign in</Link>
      </p>
    </form>
  )
}
