'use client'

import { useActionState, useState } from 'react'
import { registerAction } from '@/lib/actions/auth'
import Link from 'next/link'
import { OAuthButtons } from './oauth-buttons'

type SelectableRole = 'TEACHER' | 'STUDENT'

export function RegisterForm({
  defaultRole,
  defaultName,
  defaultEmail,
  fromOAuth = false,
  showGoogle = false,
  showMicrosoft = false,
}: {
  defaultRole?: string
  defaultName?: string
  defaultEmail?: string
  fromOAuth?: boolean
  showGoogle?: boolean
  showMicrosoft?: boolean
}) {
  const [state, action, pending] = useActionState(registerAction, null)
  // Tracked so the OAuth buttons send the currently selected role.
  const [role, setRole] = useState<SelectableRole>(
    defaultRole?.toUpperCase() === 'TEACHER' ? 'TEACHER' : 'STUDENT',
  )

  return (
    <div className="space-y-5">
      <form action={action} className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create account</h1>
          <p className="text-sm text-gray-500 mt-1">Join Archouse Learn</p>
        </div>

        {fromOAuth && (
          <div role="status" className="bg-blue-50 border border-blue-200 text-blue-800 text-sm px-4 py-3 rounded-lg">
            We couldn't find an account for that email. Choose whether you're a teacher or student, then continue
            with the same provider to create one.
          </div>
        )}

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
                checked={role === r}
                onChange={() => setRole(r)}
                required
              />
              <div className="border-2 border-gray-200 rounded-lg p-3 text-center text-sm font-medium text-gray-600 peer-checked:border-brand-500 peer-checked:text-brand-700 peer-checked:bg-brand-50 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500 transition-all">
                {r === 'TEACHER' ? '👩‍🏫 Teacher' : '🎒 Student'}
              </div>
            </label>
          ))}
        </div>

        <div className="space-y-1">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full name</label>
          <input
            id="name" name="name" type="text" required autoComplete="name"
            defaultValue={defaultName}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
          <input
            id="email" name="email" type="email" required autoComplete="email"
            defaultValue={defaultEmail}
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
      </form>

      <OAuthButtons source="register" role={role} showGoogle={showGoogle} showMicrosoft={showMicrosoft} />

      <p className="text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link href="/login" className="text-brand-600 font-medium hover:underline">Sign in</Link>
      </p>
    </div>
  )
}
