import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import type { AdapterUser } from 'next-auth/adapters'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { buildProviders } from '@/lib/auth-providers'
import { OAUTH_INTENT_COOKIE, parseIntent } from '@/lib/oauth-intent'
import { withOAuthUserHandling } from '@/lib/oauth-adapter'
import { decideOAuthSignIn, normalizeEmail } from '@/lib/oauth-policy'
import { authConfig } from './auth.config'

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

async function readOAuthIntent() {
  const store = await cookies()
  return parseIntent(store.get(OAUTH_INTENT_COOKIE)?.value)
}

async function findUserByEmailInsensitive(email: string) {
  return prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    include: { accounts: { select: { provider: true, providerAccountId: true } } },
  })
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: withOAuthUserHandling(PrismaAdapter(prisma), {
    findUserByEmail: async email => {
      const user = await findUserByEmailInsensitive(email)
      if (!user) return null
      const { accounts: _accounts, ...rest } = user
      return rest as AdapterUser
    },
    readIntent: readOAuthIntent,
  }),
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials)
        if (!parsed.success) return null

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        })
        if (!user?.passwordHash) return null

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash)
        if (!valid) return null

        return { id: user.id, email: user.email, name: user.name, role: user.role }
      },
    }),
    // Google / Microsoft — only present when their env vars are set.
    ...buildProviders(),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ account, profile }) {
      // Credentials (and anything non-OAuth) is unaffected.
      if (!account || (account.type !== 'oauth' && account.type !== 'oidc')) return true

      const [userByAccount, intent] = await Promise.all([
        prisma.account.findUnique({
          where: {
            provider_providerAccountId: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
          },
          select: { userId: true },
        }),
        readOAuthIntent(),
      ])

      const email = normalizeEmail(profile?.email)
      const userByEmail = !userByAccount && email ? await findUserByEmailInsensitive(email) : null

      const decision = decideOAuthSignIn({
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        profile: profile as Record<string, unknown> | undefined,
        intent,
        userByAccount: userByAccount ? { id: userByAccount.userId } : null,
        userByEmail,
      })

      return decision.action === 'allow' ? true : decision.to
    },
  },
  events: {
    async signIn({ account }) {
      if (account?.type !== 'oauth' && account?.type !== 'oidc') return
      // Intent is single-use; clear it so a later sign-in can't reuse a stale role.
      try {
        ;(await cookies()).delete(OAUTH_INTENT_COOKIE)
      } catch {
        // Cookie expires on its own shortly.
      }
    },
  },
})
