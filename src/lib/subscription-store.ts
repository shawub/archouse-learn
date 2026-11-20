import type { Prisma, PrismaClient } from '@prisma/client'
import { prisma } from '@/lib/db'
import type { SubscriptionStore } from '@/lib/subscriptions'

type Db = PrismaClient | Prisma.TransactionClient

// Never select subscriber data — results carry only the target and the timestamp.
const select = { teacherId: true, subscribedAt: true } as const

export function createPrismaSubscriptionStore(db: Db): SubscriptionStore {
  return {
    async userExists(id) {
      return (await db.user.findUnique({ where: { id }, select: { id: true } })) !== null
    },
    findSubscription: (subscriberId, teacherId) =>
      db.subscription.findUnique({ where: { subscriberId_teacherId: { subscriberId, teacherId } }, select }),
    createSubscription: (subscriberId, teacherId) =>
      db.subscription.create({ data: { subscriberId, teacherId }, select }),
    async deleteSubscription(subscriberId, teacherId) {
      const { count } = await db.subscription.deleteMany({ where: { subscriberId, teacherId } })
      return count > 0
    },
  }
}

export const subscriptionStore = createPrismaSubscriptionStore(prisma)
