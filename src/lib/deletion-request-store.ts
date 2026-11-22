import type { Prisma, PrismaClient } from '@prisma/client'
import { prisma } from '@/lib/db'
import { PENDING_STATUS, type DeletionRequestStore } from '@/lib/account-deletion'

type Db = PrismaClient | Prisma.TransactionClient

const select = { id: true, userId: true, requestedAt: true, status: true, processedAt: true } as const

// Only ever touches DeletionRequest rows — never User or other user-owned data.
export function createPrismaDeletionStore(db: Db): DeletionRequestStore {
  return {
    findPendingByUserId: userId =>
      db.deletionRequest.findFirst({ where: { userId, status: PENDING_STATUS }, select }),
    createPending: (userId, now) =>
      db.deletionRequest.create({ data: { userId, requestedAt: now, status: PENDING_STATUS }, select }),
  }
}

export const deletionRequestStore = createPrismaDeletionStore(prisma)
