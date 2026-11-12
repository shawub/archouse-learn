import { z } from 'zod'

// Records where an OAuth sign-in started (/login or /register) and, for
// registration, the role the user picked. Stored in a short-lived httpOnly
// cookie set by the start-sign-in server actions and read in the Auth.js
// callbacks. Anything missing or malformed is treated as a login.

export const OAUTH_INTENT_COOKIE = 'oauth_intent'
export const OAUTH_INTENT_MAX_AGE = 60 * 10 // seconds

const intentSchema = z.discriminatedUnion('source', [
  z.object({ source: z.literal('login') }),
  z.object({ source: z.literal('register'), role: z.enum(['TEACHER', 'STUDENT']) }),
])

export type OAuthIntent = z.infer<typeof intentSchema>

export const LOGIN_INTENT: OAuthIntent = { source: 'login' }

export function serializeIntent(intent: OAuthIntent): string {
  return JSON.stringify(intent)
}

export function parseIntent(raw: string | undefined | null): OAuthIntent {
  if (!raw) return LOGIN_INTENT
  try {
    const parsed = intentSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : LOGIN_INTENT
  } catch {
    return LOGIN_INTENT
  }
}

// Builds an intent from untrusted form input.
export function intentFromInput(source: unknown, role: unknown): OAuthIntent {
  if (source !== 'register') return LOGIN_INTENT
  const r = typeof role === 'string' ? role.toUpperCase() : ''
  return { source: 'register', role: r === 'TEACHER' ? 'TEACHER' : 'STUDENT' }
}
