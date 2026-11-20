// Core subscribe/unsubscribe logic. Session and database access are injected
// so the flow can be unit-tested without Prisma; the Prisma store lives in
// `subscription-store.ts` and the wired server actions in `actions/subscriptions.ts`.
//
// A subscription is teacher-level: one user subscribing to another user. The
// subscriber is always the session user — it is never read from input.

export const UNAUTHENTICATED_MESSAGE = 'You must be signed in to do that'
export const SELF_SUBSCRIBE_MESSAGE = 'You cannot subscribe to yourself'
export const NOT_FOUND_MESSAGE = 'Teacher not found'

/** The only subscription data ever returned: the target id and when it started. */
export type SubscriptionState = { teacherId: string; subscribedAt: Date }

export interface SubscriptionStore {
  userExists(id: string): Promise<boolean>
  findSubscription(subscriberId: string, teacherId: string): Promise<SubscriptionState | null>
  /** Throws if the pair already exists (unique constraint) or a user is missing (FK). */
  createSubscription(subscriberId: string, teacherId: string): Promise<SubscriptionState>
  /** Returns whether a row was removed. */
  deleteSubscription(subscriberId: string, teacherId: string): Promise<boolean>
}

export type SubscriptionSession = { userId: string } | null

export type SubscriptionDeps = {
  getSession: () => Promise<SubscriptionSession>
  store: SubscriptionStore
}

type Unauthenticated = { ok: false; reason: 'unauthenticated'; error: string }
type NotFound = { ok: false; reason: 'not-found'; error: string }

/** Results expose only the target teacher id and the subscription state. */
export type SubscribeResult =
  | { ok: true; teacherId: string; subscribed: true; subscribedAt: Date; alreadySubscribed: boolean }
  | { ok: false; reason: 'self'; error: string }
  | NotFound

export type UnsubscribeResult =
  | { ok: true; teacherId: string; subscribed: false; wasSubscribed: boolean }
  | NotFound

const UNAUTHENTICATED: Unauthenticated = { ok: false, reason: 'unauthenticated', error: UNAUTHENTICATED_MESSAGE }
const NOT_FOUND: NotFound = { ok: false, reason: 'not-found', error: NOT_FOUND_MESSAGE }
const SELF = { ok: false, reason: 'self', error: SELF_SUBSCRIBE_MESSAGE } as const

function parseTeacherId(input: unknown): string | null {
  return typeof input === 'string' && input.trim() ? input : null
}

function subscribed(state: SubscriptionState, alreadySubscribed: boolean): SubscribeResult {
  return { ok: true, teacherId: state.teacherId, subscribed: true, subscribedAt: state.subscribedAt, alreadySubscribed }
}

export async function subscribe(
  subscriberId: string,
  teacherIdInput: unknown,
  { store }: { store: SubscriptionStore },
): Promise<SubscribeResult> {
  const teacherId = parseTeacherId(teacherIdInput)
  if (!teacherId) return { ...NOT_FOUND }
  if (teacherId === subscriberId) return { ...SELF }

  // Checked before any write so an unknown id never reaches the foreign key.
  if (!(await store.userExists(teacherId))) return { ...NOT_FOUND }

  const existing = await store.findSubscription(subscriberId, teacherId)
  if (existing) return subscribed(existing, true)

  try {
    return subscribed(await store.createSubscription(subscriberId, teacherId), false)
  } catch (err) {
    // Lost a race with a concurrent subscribe — resolve to the winning row.
    const winner = await store.findSubscription(subscriberId, teacherId)
    if (winner) return subscribed(winner, true)
    throw err
  }
}

export async function unsubscribe(
  subscriberId: string,
  teacherIdInput: unknown,
  { store }: { store: SubscriptionStore },
): Promise<UnsubscribeResult> {
  const teacherId = parseTeacherId(teacherIdInput)
  if (!teacherId) return { ...NOT_FOUND }

  const wasSubscribed = await store.deleteSubscription(subscriberId, teacherId)
  return { ok: true, teacherId, subscribed: false, wasSubscribed }
}

/** Session-guarded entry points used by the server actions. */
export async function subscribeToTeacher(
  teacherId: unknown,
  deps: SubscriptionDeps,
): Promise<SubscribeResult | Unauthenticated> {
  const session = await deps.getSession()
  if (!session?.userId) return { ...UNAUTHENTICATED }
  return subscribe(session.userId, teacherId, deps)
}

export async function unsubscribeFromTeacher(
  teacherId: unknown,
  deps: SubscriptionDeps,
): Promise<UnsubscribeResult | Unauthenticated> {
  const session = await deps.getSession()
  if (!session?.userId) return { ...UNAUTHENTICATED }
  return unsubscribe(session.userId, teacherId, deps)
}
