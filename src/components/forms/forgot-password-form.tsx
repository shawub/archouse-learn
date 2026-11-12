'use client'

import { useActionState } from 'react'
import { forgotPasswordAction } from '@/lib/actions/auth'
import Link from 'next/link'

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(forgotPasswordAction, null)

  if (state?.success) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Check your email</h1>
        </div>
        <div role="status" className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg">
          {state.message} The link expires in 60 minutes.
        </div>
        <p className="text-center text-sm text-gray-500">
          <Link href="/login" className="text-brand-600 font-medium hover:underline">Back to sign in</Link>
        </p>
      </div>
    )
  }

  return (
    <form action={action} className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Forgot password</h1>
        <p className="text-sm text-gray-500 mt-1">Enter your email and we'll send you a link to reset your password</p>
      </div>

      {state?.error && (
        <div id="forgot-password-error" role="alert" className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {state.error}
        </div>
      )}

      <div className="space-y-1">
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
        <input
          id="email" name="email" type="email" required autoComplete="email"
          aria-invalid={state?.error ? true : undefined}
          aria-describedby={state?.error ? 'forgot-password-error' : undefined}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
      </div>

      <button
        type="submit" disabled={pending}
        className="w-full py-2.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-60 transition-colors"
      >
        {pending ? 'Sending…' : 'Send reset link'}
      </button>

      <p className="text-center text-sm text-gray-500">
        Remembered it?{' '}
        <Link href="/login" className="text-brand-600 font-medium hover:underline">Sign in</Link>
      </p>
    </form>
  )
}
