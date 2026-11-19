import type { Prisma, PrismaClient } from '@prisma/client'
import { prisma } from '@/lib/db'
import type { PasswordResetStore } from '@/lib/password-reset'

type Db = PrismaClient | Prisma.TransactionClient

export function createPrismaResetStore(db: Db): PasswordResetStore {
  const store: PasswordResetStore = {
    findUserByEmail: email =>
      db.user.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
        select: { id: true, email: true, passwordHash: true },
      }),
    findTokenByHash: tokenHash =>
      db.passwordResetToken.findUnique({
        where: { tokenHash },
        select: { id: true, userId: true, tokenHash: true, expires: true, usedAt: true },
      }),
    async createToken(data) {
      await db.passwordResetToken.create({ data })
    },
    async invalidateUnusedTokens(userId, now) {
      await db.passwordResetToken.updateMany({ where: { userId, usedAt: null }, data: { usedAt: now } })
    },
    async claimToken(tokenId, now) {
      const { count } = await db.passwordResetToken.updateMany({
        where: { id: tokenId, usedAt: null, expires: { gt: now } },
        data: { usedAt: now },
      })
      return count === 1
    },
    async setPasswordHash(userId, passwordHash) {
      await db.user.update({ where: { id: userId }, data: { passwordHash } })
    },
    transaction: fn =>
      '$transaction' in db ? db.$transaction(tx => fn(createPrismaResetStore(tx))) : fn(store),
  }
  return store
}

export const passwordResetStore = createPrismaResetStore(prisma)
