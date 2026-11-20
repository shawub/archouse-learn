import { Prisma, type PrismaClient } from '@prisma/client'
import { prisma } from '@/lib/db'
import type { SubscriptionStore } from '@/lib/subscriptions'

const select = { subscriberId: true, teacherId: true, subscribedAt: true } as const

function isPrismaError(err: unknown, code: string): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === code
}

export function createPrismaSubscriptionStore(db: PrismaClient): SubscriptionStore {
  const store: SubscriptionStore = {
    async userExists(id) {
      return (await db.user.findUnique({ where: { id }, select: { id: true } })) !== null
    },
    findSubscription: (subscriberId, teacherId) =>
      db.subscription.findUnique({ where: { subscriberId_teacherId: { subscriberId, teacherId } }, select }),
    async createSubscription(subscriberId, teacherId) {
      try {
        return await db.subscription.create({ data: { subscriberId, teacherId }, select })
      } catch (err) {
        // Lost a race with a concurrent subscribe — treat as idempotent.
        if (isPrismaError(err, 'P2002')) {
          const existing = await store.findSubscription(subscriberId, teacherId)
          if (existing) return existing
        }
        throw err
      }
    },
    async deleteSubscription(subscriberId, teacherId) {
      try {
        await db.subscription.delete({ where: { subscriberId_teacherId: { subscriberId, teacherId } } })
      } catch (err) {
        // Not subscribed — no-op.
        if (!isPrismaError(err, 'P2025')) throw err
      }
    },
  }
  return store
}

export const subscriptionStore = createPrismaSubscriptionStore(prisma)
