import type { SubscriptionRecord, SubscriptionStore } from '@/lib/subscriptions'

/** In-memory SubscriptionStore mirroring the Prisma implementation's semantics. */
export function createFakeSubscriptionStore(users: string[] = [], subscriptions: SubscriptionRecord[] = []) {
  const find = (subscriberId: string, teacherId: string) =>
    subscriptions.find(s => s.subscriberId === subscriberId && s.teacherId === teacherId)

  const store: SubscriptionStore = {
    async userExists(id) {
      return users.includes(id)
    },
    async findSubscription(subscriberId, teacherId) {
      const s = find(subscriberId, teacherId)
      return s ? { ...s } : null
    },
    async createSubscription(subscriberId, teacherId) {
      if (!users.includes(subscriberId) || !users.includes(teacherId)) throw new Error('Foreign key constraint failed')
      const existing = find(subscriberId, teacherId)
      if (existing) return { ...existing }
      const record = { subscriberId, teacherId, subscribedAt: new Date() }
      subscriptions.push(record)
      return { ...record }
    },
    async deleteSubscription(subscriberId, teacherId) {
      const i = subscriptions.findIndex(s => s.subscriberId === subscriberId && s.teacherId === teacherId)
      if (i !== -1) subscriptions.splice(i, 1)
    },
  }

  return { store, users, subscriptions }
}
