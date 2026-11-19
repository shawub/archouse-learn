'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { resetPasswordAction } from '@/lib/actions/password-reset'
import { INVALID_TOKEN_MESSAGE, MIN_PASSWORD_LENGTH } from '@/lib/password-reset-messages'

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, null)
  const invalidToken = !token || state?.invalidToken

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Set a new password</h1>
        <p className="text-sm text-gray-500 mt-1">Choose a new password for your account</p>
      </div>

      {invalidToken ? (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {state?.error ?? INVALID_TOKEN_MESSAGE}{' '}
          <Link href="/forgot-password" className="font-medium underline">Request a new link</Link>
        </div>
      ) : (
        <form action={action} className="space-y-5">
          {state?.error && (
            <div
              id="reset-password-error" role="alert"
              className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg"
            >
              {state.error}
            </div>
          )}

          <input type="hidden" name="token" value={token} />

          <div className="space-y-1">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">New password</label>
            <input
              id="password" name="password" type="password" required autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              aria-invalid={state?.error ? true : undefined}
              aria-describedby={state?.error ? 'reset-password-error password-hint' : 'password-hint'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
            <p id="password-hint" className="text-xs text-gray-400">Minimum {MIN_PASSWORD_LENGTH} characters</p>
          </div>

          <button
            type="submit" disabled={pending}
            className="w-full py-2.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-60 transition-colors"
          >
            {pending ? 'Saving…' : 'Set new password'}
          </button>
        </form>
      )}

      <p className="text-center text-sm text-gray-500">
        <Link href="/login" className="text-brand-600 font-medium hover:underline">Back to sign in</Link>
      </p>
    </div>
  )
}
