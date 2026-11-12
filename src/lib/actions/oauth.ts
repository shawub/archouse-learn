'use server'

import { cookies } from 'next/headers'
import { signIn } from '@/auth'
import {
  GOOGLE_PROVIDER_ID,
  MICROSOFT_PROVIDER_ID,
  isGoogleConfigured,
  isMicrosoftConfigured,
  type OAuthProviderId,
} from '@/lib/auth-providers'
import {
  OAUTH_INTENT_COOKIE,
  OAUTH_INTENT_MAX_AGE,
  intentFromInput,
  serializeIntent,
} from '@/lib/oauth-intent'

async function startOAuthSignIn(provider: OAuthProviderId, formData: FormData) {
  const intent = intentFromInput(formData.get('source'), formData.get('role'))

  // Always overwrite, so the latest role selection wins.
  const store = await cookies()
  store.set(OAUTH_INTENT_COOKIE, serializeIntent(intent), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: OAUTH_INTENT_MAX_AGE,
  })

  // Existing users are routed to the right dashboard by middleware.
  const redirectTo =
    intent.source === 'register' && intent.role === 'STUDENT' ? '/student/dashboard' : '/teacher/dashboard'

  await signIn(provider, { redirectTo })
}

export async function startGoogleSignIn(formData: FormData) {
  if (!isGoogleConfigured()) throw new Error('Google sign-in is not configured')
  await startOAuthSignIn(GOOGLE_PROVIDER_ID, formData)
}

export async function startMicrosoftSignIn(formData: FormData) {
  if (!isMicrosoftConfigured()) throw new Error('Microsoft sign-in is not configured')
  await startOAuthSignIn(MICROSOFT_PROVIDER_ID, formData)
}
