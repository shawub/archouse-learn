'use client'

import { useActionState } from 'react'
import { resetPasswordAction } from '@/lib/actions/auth'
import Link from 'next/link'

const INVALID_LINK_MESSAGE = 'This reset link is invalid or has expired.'

function InvalidLink({ message }: { message: string }) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reset password</h1>
      </div>
      <div role="alert" className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
        {message}
      </div>
      <p className="text-center text-sm text-gray-500">
        <Link href="/forgot-password" className="text-brand-600 font-medium hover:underline">Request a new reset link</Link>
      </p>
    </div>
  )
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, null)

  if (!token) return <InvalidLink message={INVALID_LINK_MESSAGE} />

  if (state?.error === INVALID_LINK_MESSAGE) return <InvalidLink message={state.error} />

  if (state?.success) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Password updated</h1>
        </div>
        <div role="status" className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg">
          Your password has been reset. You can now sign in with your new password.
        </div>
        <p className="text-center text-sm text-gray-500">
          <Link href="/login" className="text-brand-600 font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    )
  }

  return (
    <form action={action} className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reset password</h1>
        <p className="text-sm text-gray-500 mt-1">Choose a new password for your account</p>
      </div>

      {state?.error && (
        <div id="reset-password-error" role="alert" className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {state.error}
        </div>
      )}

      <input type="hidden" name="token" value={token} />

      <div className="space-y-1">
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">New password</label>
        <input
          id="password" name="password" type="password" required autoComplete="new-password"
          minLength={8}
          aria-invalid={state?.error ? true : undefined}
          aria-describedby={state?.error ? 'reset-password-error password-hint' : 'password-hint'}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
        <p id="password-hint" className="text-xs text-gray-400">Minimum 8 characters</p>
      </div>

      <button
        type="submit" disabled={pending}
        className="w-full py-2.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-60 transition-colors"
      >
        {pending ? 'Resetting…' : 'Reset password'}
      </button>
    </form>
  )
}
