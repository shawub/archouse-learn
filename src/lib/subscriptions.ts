// Core subscribe/unsubscribe logic. Session and database access are injected
// so the flow can be unit-tested without Prisma; the Prisma store lives in
// `subscriptions-store.ts` and the wired server actions in `actions/subscriptions.ts`.
//
// A subscription is teacher-level: one user subscribing to another user. The
// subscriber is always the session user — it is never read from input.

export const UNAUTHENTICATED_MESSAGE = 'You must be signed in to do that'
export const SELF_SUBSCRIBE_MESSAGE = 'You cannot subscribe to yourself'
export const NOT_FOUND_MESSAGE = 'Teacher not found'

export type SubscriptionRecord = { subscriberId: string; teacherId: string; subscribedAt: Date }

export interface SubscriptionStore {
  userExists(id: string): Promise<boolean>
  findSubscription(subscriberId: string, teacherId: string): Promise<SubscriptionRecord | null>
  /** Idempotent: returns the existing row if the pair is already subscribed. */
  createSubscription(subscriberId: string, teacherId: string): Promise<SubscriptionRecord>
  /** No-op if the pair isn't subscribed. */
  deleteSubscription(subscriberId: string, teacherId: string): Promise<void>
}

export type SubscriptionSession = { userId: string } | null

export type SubscriptionDeps = {
  getSession: () => Promise<SubscriptionSession>
  store: SubscriptionStore
}

/** Results expose only the target teacher id and the subscription state. */
export type SubscriptionResult =
  | { ok: true; teacherId: string; subscribed: boolean; error?: never }
  | { error: string; unauthenticated?: true; notFound?: true; ok?: never }

function parseTeacherId(input: unknown): string | null {
  if (!input || typeof input !== 'object') return null
  const teacherId = (input as { teacherId?: unknown }).teacherId
  return typeof teacherId === 'string' && teacherId.trim() ? teacherId : null
}

export async function subscribe(input: { teacherId: unknown }, deps: SubscriptionDeps): Promise<SubscriptionResult> {
  const session = await deps.getSession()
  if (!session?.userId) return { error: UNAUTHENTICATED_MESSAGE, unauthenticated: true }

  const teacherId = parseTeacherId(input)
  if (!teacherId) return { error: NOT_FOUND_MESSAGE, notFound: true }
  if (teacherId === session.userId) return { error: SELF_SUBSCRIBE_MESSAGE }

  if (!(await deps.store.userExists(teacherId))) return { error: NOT_FOUND_MESSAGE, notFound: true }

  if (!(await deps.store.findSubscription(session.userId, teacherId))) {
    await deps.store.createSubscription(session.userId, teacherId)
  }
  return { ok: true, teacherId, subscribed: true }
}

export async function unsubscribe(input: { teacherId: unknown }, deps: SubscriptionDeps): Promise<SubscriptionResult> {
  const session = await deps.getSession()
  if (!session?.userId) return { error: UNAUTHENTICATED_MESSAGE, unauthenticated: true }

  const teacherId = parseTeacherId(input)
  if (!teacherId) return { error: NOT_FOUND_MESSAGE, notFound: true }

  await deps.store.deleteSubscription(session.userId, teacherId)
  return { ok: true, teacherId, subscribed: false }
}
