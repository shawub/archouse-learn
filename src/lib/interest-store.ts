import type { Prisma, PrismaClient } from '@prisma/client'
import { prisma } from '@/lib/db'
import type { InterestStore } from '@/lib/interests'

export function createPrismaInterestStore(db: PrismaClient): InterestStore {
  return {
    listInterests: userId =>
      db.userInterest.findMany({
        where: { userId },
        select: { subject: true, keyStage: true },
        orderBy: [{ subject: 'asc' }, { keyStage: 'asc' }],
      }),
    async replaceInterests(userId, interests) {
      // One transaction: if the create fails, the delete rolls back and the
      // previous set is left intact.
      await db.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.userInterest.deleteMany({ where: { userId } })
        if (interests.length) {
          await tx.userInterest.createMany({
            data: interests.map(({ subject, keyStage }) => ({ userId, subject, keyStage })),
          })
        }
      })
    },
  }
}

export const interestStore = createPrismaInterestStore(prisma)
