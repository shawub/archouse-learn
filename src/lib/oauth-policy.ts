import type { OAuthIntent } from './oauth-intent'

// Decides whether an OAuth sign-in may proceed. Pure — the Auth.js signIn
// callback in src/auth.ts gathers the inputs from the database and cookies.

export type ExistingUser = {
  id: string
  accounts: { provider: string; providerAccountId: string }[]
}

export type OAuthSignInInput = {
  provider: string
  providerAccountId: string
  profile: Record<string, unknown> | null | undefined
  intent: OAuthIntent
  // The user that already owns this provider account, if any.
  userByAccount: { id: string } | null
  // The user whose email matches the provider-reported email, if any.
  userByEmail: ExistingUser | null
}

export type OAuthDecision =
  | { action: 'allow'; reason: 'existing-account' | 'link-verified' | 'register' }
  | { action: 'redirect'; to: string }

export type OAuthErrorCode = 'OAuthNoEmail' | 'OAuthEmailNotVerified' | 'OAuthAccountConflict'

export function normalizeEmail(email: unknown): string | null {
  if (typeof email !== 'string') return null
  const trimmed = email.trim().toLowerCase()
  return trimmed === '' ? null : trimmed
}

const isTrue = (value: unknown) => value === true || value === 'true'

// Only an explicit verification claim from the provider counts. Google sends
// `email_verified`; Microsoft Entra ID sends `xms_edov` (email domain owner
// verified) when that optional claim is enabled. Absent means unverified.
export function isEmailVerified(profile: Record<string, unknown> | null | undefined): boolean {
  if (!profile) return false
  return isTrue(profile.email_verified) || isTrue(profile.xms_edov)
}

export function loginErrorUrl(code: OAuthErrorCode, email?: string | null) {
  const params = new URLSearchParams({ error: code })
  if (email) params.set('email', email)
  return `/login?${params}`
}

export function registerPrefillUrl(name: unknown, email: string) {
  const params = new URLSearchParams({ oauth: '1', email })
  if (typeof name === 'string' && name.trim() !== '') params.set('name', name.trim())
  return `/register?${params}`
}

export function decideOAuthSignIn(input: OAuthSignInInput): OAuthDecision {
  const { provider, providerAccountId, profile, intent, userByAccount, userByEmail } = input

  // Returning user whose provider account is already linked.
  if (userByAccount) return { action: 'allow', reason: 'existing-account' }

  const email = normalizeEmail(profile?.email)
  if (!email) return { action: 'redirect', to: loginErrorUrl('OAuthNoEmail') }

  if (userByEmail) {
    // Never attach a second, different account from the same provider.
    const conflict = userByEmail.accounts.some(
      a => a.provider === provider && a.providerAccountId !== providerAccountId,
    )
    if (conflict) return { action: 'redirect', to: loginErrorUrl('OAuthAccountConflict', email) }

    // Linking to an existing account requires the provider to vouch for the email.
    if (!isEmailVerified(profile)) {
      return { action: 'redirect', to: loginErrorUrl('OAuthEmailNotVerified', email) }
    }
    return { action: 'allow', reason: 'link-verified' }
  }

  // No account yet: only create one when the user started from /register.
  if (intent.source === 'register') return { action: 'allow', reason: 'register' }

  return { action: 'redirect', to: registerPrefillUrl(profile?.name, email) }
}
