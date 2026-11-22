import type { DeletionRequestRecord, DeletionRequestStore } from '@/lib/account-deletion'

/**
 * In-memory DeletionRequestStore mirroring the Prisma implementation's semantics,
 * including the (userId, status) unique constraint. Holds only DeletionRequest
 * rows — it has no access to users.
 */
export function createFakeDeletionStore(seed: DeletionRequestRecord[] = []) {
  const requests: DeletionRequestRecord[] = seed.map(r => ({ ...r }))
  let nextId = 1

  const store: DeletionRequestStore = {
    async findPendingByUserId(userId) {
      const r = requests.find(r => r.userId === userId && r.status === 'pending')
      return r ? { ...r } : null
    },
    async createPending(userId, now) {
      if (requests.some(r => r.userId === userId && r.status === 'pending')) {
        throw new Error('Unique constraint failed')
      }
      const r: DeletionRequestRecord = { id: `d${nextId++}`, userId, requestedAt: now, status: 'pending', processedAt: null }
      requests.push(r)
      return { ...r }
    },
  }

  return { store, requests }
}
