import { prisma } from '@/lib/db'
import type { PasswordResetStore } from '@/lib/password-reset'

export const prismaPasswordResetStore: PasswordResetStore = {
  async findUserByEmail(email) {
    // Registration stores emails as typed, so match case-insensitively.
    return prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true },
    })
  },

  async createResetToken(data) {
    await prisma.passwordResetToken.create({ data })
  },

  async consumeResetToken(tokenHash, passwordHash, now) {
    return prisma.$transaction(async tx => {
      const token = await tx.passwordResetToken.findUnique({ where: { tokenHash } })
      if (!token) return false

      // Guarded on usedAt/expires so concurrent attempts with the same token can't both succeed.
      const { count } = await tx.passwordResetToken.updateMany({
        where: { id: token.id, usedAt: null, expires: { gt: now } },
        data: { usedAt: now },
      })
      if (count !== 1) return false

      await tx.user.update({ where: { id: token.userId }, data: { passwordHash } })
      // A completed reset also invalidates any other outstanding links for this user.
      await tx.passwordResetToken.updateMany({
        where: { userId: token.userId, usedAt: null },
        data: { usedAt: now },
      })
      return true
    })
  },
}
