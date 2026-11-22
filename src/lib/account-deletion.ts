// Core request-account-deletion logic. Session and database access are
// injected so the flow can be unit-tested without Prisma; the Prisma store
// lives in `deletion-request-store.ts` and the wired server action in
// `actions/account-deletion.ts`.
//
// v1 only records the request for an operator to action — no user data is
// erased, disabled or modified here. The caller is always the session user;
// there is no input naming an account, so no one can target another user.

export const LOG_PREFIX = '[deletion-request]'
export const PENDING_STATUS = 'pending'

export const UNAUTHENTICATED_MESSAGE = 'You must be signed in to request account deletion.'

export type DeletionRequestRecord = {
  id: string
  userId: string
  requestedAt: Date
  status: string
  processedAt: Date | null
}

export interface DeletionRequestStore {
  findPendingByUserId(userId: string): Promise<DeletionRequestRecord | null>
  createPending(userId: string, now: Date): Promise<DeletionRequestRecord>
}

export type RequestDeletionDeps = {
  store: DeletionRequestStore
  session: { userId: string | null } | null
  now?: () => Date
  logger?: { warn: (msg: string) => void }
}

export type RequestDeletionResult =
  | { ok: true; request: { id: string; status: string; requestedAt: Date }; error?: never }
  | { error: string; ok?: never }

const toPublic = (r: DeletionRequestRecord) => ({ id: r.id, status: r.status, requestedAt: r.requestedAt })

/**
 * Records a pending deletion request for the session user. Idempotent: if the
 * user already has a pending request it is returned unchanged.
 */
export async function requestAccountDeletion(deps: RequestDeletionDeps): Promise<RequestDeletionResult> {
  const userId = deps.session?.userId
  if (!userId) return { error: UNAUTHENTICATED_MESSAGE }

  const existing = await deps.store.findPendingByUserId(userId)
  if (existing) return { ok: true, request: toPublic(existing) }

  const now = deps.now ?? (() => new Date())
  let created: DeletionRequestRecord
  try {
    created = await deps.store.createPending(userId, now())
  } catch (err) {
    // A concurrent call won the (userId, status) unique constraint — return its row.
    const raced = await deps.store.findPendingByUserId(userId)
    if (raced) return { ok: true, request: toPublic(raced) }
    throw err
  }

  // id and userId only — never email, name or other personal data.
  const logger = deps.logger ?? { warn: (msg: string) => console.warn(msg) }
  logger.warn(`${LOG_PREFIX} created id=${created.id} userId=${created.userId}`)
  return { ok: true, request: toPublic(created) }
}
