import Google from 'next-auth/providers/google'
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id'
import type { OAuthConfig } from 'next-auth/providers'

// OAuth providers are opt-in: each one is only registered when all of its
// environment variables are set. Edge-safe — env reads only, no Prisma.

export const GOOGLE_PROVIDER_ID = 'google'
export const MICROSOFT_PROVIDER_ID = 'microsoft-entra-id'
export type OAuthProviderId = typeof GOOGLE_PROVIDER_ID | typeof MICROSOFT_PROVIDER_ID

// Minimum scopes — identity only, no Graph/Drive access.
export const OAUTH_SCOPE = 'openid email profile'

// PKCE protects the authorization code; state protects the callback against CSRF.
// Auth.js only enables PKCE by default, so both are listed explicitly.
export const OAUTH_CHECKS: ('pkce' | 'state')[] = ['pkce', 'state']

type Env = Record<string, string | undefined>

const isSet = (value: string | undefined) => !!value && value.trim() !== ''

export function isGoogleConfigured(env: Env = process.env) {
  return isSet(env.GOOGLE_CLIENT_ID) && isSet(env.GOOGLE_CLIENT_SECRET)
}

export function isMicrosoftConfigured(env: Env = process.env) {
  return (
    isSet(env.MICROSOFT_CLIENT_ID) &&
    isSet(env.MICROSOFT_CLIENT_SECRET) &&
    isSet(env.MICROSOFT_TENANT_ID)
  )
}

export function getOAuthAvailability(env: Env = process.env) {
  return { showGoogle: isGoogleConfigured(env), showMicrosoft: isMicrosoftConfigured(env) }
}

type MicrosoftProfile = {
  sub: string
  name?: string
  email?: string
  preferred_username?: string
}

export function buildProviders(env: Env = process.env): OAuthConfig<any>[] {
  const providers: OAuthConfig<any>[] = []

  if (isGoogleConfigured(env)) {
    providers.push(
      Google({
        clientId: env.GOOGLE_CLIENT_ID!.trim(),
        clientSecret: env.GOOGLE_CLIENT_SECRET!.trim(),
        authorization: { params: { scope: OAUTH_SCOPE } },
        checks: OAUTH_CHECKS,
        // Safe only because the signIn callback refuses to link unless the
        // provider reports the email as verified.
        allowDangerousEmailAccountLinking: true,
      }),
    )
  }

  if (isMicrosoftConfigured(env)) {
    providers.push(
      MicrosoftEntraID({
        clientId: env.MICROSOFT_CLIENT_ID!.trim(),
        clientSecret: env.MICROSOFT_CLIENT_SECRET!.trim(),
        issuer: `https://login.microsoftonline.com/${env.MICROSOFT_TENANT_ID!.trim()}/v2.0`,
        authorization: { params: { scope: OAUTH_SCOPE } },
        checks: OAUTH_CHECKS,
        allowDangerousEmailAccountLinking: true,
        // The built-in profile() fetches a photo from Microsoft Graph, which needs
        // the User.Read scope. We only request identity scopes, so skip it.
        profile(profile: MicrosoftProfile) {
          return {
            id: profile.sub,
            name: profile.name ?? null,
            email: profile.email ?? null,
            image: null,
            // Placeholder only — the adapter sets the real role from the register intent.
            role: 'STUDENT' as const,
          }
        },
      }),
    )
  }

  return providers
}
