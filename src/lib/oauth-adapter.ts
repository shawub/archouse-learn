import type { Adapter, AdapterUser } from 'next-auth/adapters'
import type { OAuthIntent } from './oauth-intent'
import { normalizeEmail } from './oauth-policy'

type Deps = {
  // Case-insensitive lookup so OAuth emails match existing password accounts.
  findUserByEmail: (email: string) => Promise<AdapterUser | null>
  readIntent: () => Promise<OAuthIntent>
}

// Wraps the Prisma adapter so OAuth users:
// - are matched to existing users regardless of email case, and
// - are created with the role chosen on /register.
export function withOAuthUserHandling(base: Adapter, deps: Deps): Adapter {
  return {
    ...base,
    async getUserByEmail(email) {
      const normalized = normalizeEmail(email)
      return normalized ? deps.findUserByEmail(normalized) : null
    },
    async createUser(user) {
      const intent = await deps.readIntent()
      // The signIn callback blocks creation for any other intent; this is a backstop.
      if (intent.source !== 'register') {
        throw new Error('Refusing to create an account outside of registration')
      }
      return base.createUser!({
        ...user,
        email: normalizeEmail(user.email) ?? user.email,
        role: intent.role,
      })
    },
  }
}
