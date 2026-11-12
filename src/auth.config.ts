import type { NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'

// Edge-compatible auth config — no Prisma, no pg.
// Used by middleware for JWT-only session checks.
// Full auth (with adapter + bcrypt) is in auth.ts.
// OAuth providers (Google, Microsoft) are registered only in auth.ts.
export const authConfig: NextAuthConfig = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/login', error: '/login' },
  providers: [Credentials({})],
  callbacks: {
    jwt({ token, user }) {
      // `user` is the database record for OAuth sign-ins, so role comes from the DB.
      if (user) {
        token.id = user.id!
        token.role = user.role
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.id as string
      session.user.role = token.role as import('@prisma/client').Role
      return session
    },
  },
}
