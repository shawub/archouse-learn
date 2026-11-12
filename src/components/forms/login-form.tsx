'use client'

import { useActionState } from 'react'
import { loginAction } from '@/lib/actions/auth'
import Link from 'next/link'
import { OAuthButtons } from './oauth-buttons'

const oauthErrorMessages: Record<string, string> = {
  OAuthEmailNotVerified:
    'An account with this email already exists, but your provider has not verified the email. Sign in with your password instead.',
  OAuthAccountConflict: 'This email is already linked to a different account with that provider.',
  OAuthNoEmail: 'Your provider did not share an email address, so we could not sign you in.',
}

export function LoginForm({
  defaultEmail,
  error,
  showGoogle = false,
  showMicrosoft = false,
}: {
  defaultEmail?: string
  error?: string
  showGoogle?: boolean
  showMicrosoft?: boolean
}) {
  const [state, action, pending] = useActionState(loginAction, null)
  const errorMessage =
    state?.error ?? (error ? oauthErrorMessages[error] ?? 'Sign-in failed. Please try again.' : null)

  return (
    <div className="space-y-5">
      <form action={action} className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to your account</p>
        </div>

        {errorMessage && (
          <div role="alert" className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            {errorMessage}
          </div>
        )}

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
            id="password" name="password" type="password" required autoComplete="current-password"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>

        <button
          type="submit" disabled={pending}
          className="w-full py-2.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-60 transition-colors"
        >
          {pending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <OAuthButtons source="login" showGoogle={showGoogle} showMicrosoft={showMicrosoft} />

      <p className="text-center text-sm text-gray-500">
        Don't have an account?{' '}
        <Link href="/register" className="text-brand-600 font-medium hover:underline">Register</Link>
      </p>
    </div>
  )
}
