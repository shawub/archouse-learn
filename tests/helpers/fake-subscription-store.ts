import type { SubscriptionStore } from '@/lib/subscriptions'

export type FakeSubscriptionRow = { subscriberId: string; teacherId: string; subscribedAt: Date }

/** In-memory SubscriptionStore mirroring the Prisma implementation's semantics. */
export function createFakeSubscriptionStore(users: string[] = [], subscriptions: FakeSubscriptionRow[] = []) {
  const find = (subscriberId: string, teacherId: string) =>
    subscriptions.find(s => s.subscriberId === subscriberId && s.teacherId === teacherId)

  const store: SubscriptionStore = {
    async userExists(id) {
      return users.includes(id)
    },
    async findSubscription(subscriberId, teacherId) {
      const s = find(subscriberId, teacherId)
      return s ? { teacherId: s.teacherId, subscribedAt: s.subscribedAt } : null
    },
    async createSubscription(subscriberId, teacherId) {
      if (!users.includes(subscriberId) || !users.includes(teacherId)) throw new Error('Foreign key constraint failed')
      if (find(subscriberId, teacherId)) throw new Error('Unique constraint failed')
      const row = { subscriberId, teacherId, subscribedAt: new Date() }
      subscriptions.push(row)
      return { teacherId, subscribedAt: row.subscribedAt }
    },
    async deleteSubscription(subscriberId, teacherId) {
      const i = subscriptions.findIndex(s => s.subscriberId === subscriberId && s.teacherId === teacherId)
      if (i === -1) return false
      subscriptions.splice(i, 1)
      return true
    },
  }

  return { store, users, subscriptions }
}
