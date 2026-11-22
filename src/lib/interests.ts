// Core Interests logic. Session and database access are injected so the flow
// can be unit-tested without Prisma; the Prisma store lives in
// `interest-store.ts` and the wired server actions in `actions/interests.ts`.
//
// Interests are a user's subject + KeyStage discovery filters, stored as a set
// (not a feed, not personalisation signals). An update replaces the whole set;
// an empty update clears it. The user is always the session user — it is
// never read from input.

import type { KeyStage, Subject } from '@prisma/client'

export const UNAUTHENTICATED_MESSAGE = 'You must be signed in to do that'
export const INVALID_INTEREST_MESSAGE = 'Interests must be valid subject and key stage pairs'

export type Interest = { subject: Subject; keyStage: KeyStage }

export interface InterestStore {
  /** Deletes the user's interests and creates the given ones in one transaction. */
  replaceInterests(userId: string, interests: Interest[]): Promise<void>
  listInterests(userId: string): Promise<Interest[]>
}

export type InterestSession = { userId: string } | null

export type InterestDeps = {
  getSession: () => Promise<InterestSession>
  store: InterestStore
}

// Records keyed by the Prisma enum types, so adding an enum member without
// updating these is a type error.
const SUBJECTS: Record<Subject, true> = {
  MATHS: true, ENGLISH: true, SCIENCE: true, HISTORY: true, GEOGRAPHY: true, COMPUTING: true,
  ART: true, MUSIC: true, PE: true, RE: true, MFL: true,
}
const KEY_STAGES: Record<KeyStage, true> = { KS1: true, KS2: true, KS3: true, KS4: true }

/** One row per Subject x KeyStage combination is the most a user can hold. */
export const MAX_INTERESTS = Object.keys(SUBJECTS).length * Object.keys(KEY_STAGES).length

const isSubject = (v: unknown): v is Subject => typeof v === 'string' && Object.hasOwn(SUBJECTS, v)
const isKeyStage = (v: unknown): v is KeyStage => typeof v === 'string' && Object.hasOwn(KEY_STAGES, v)

type Unauthenticated = { ok: false; reason: 'unauthenticated'; error: string }
type Invalid = { ok: false; reason: 'invalid'; error: string }

export type UpdateInterestsResult = { ok: true; interests: Interest[] } | Invalid | Unauthenticated
export type GetInterestsResult = { ok: true; interests: Interest[] } | Unauthenticated

const UNAUTHENTICATED: Unauthenticated = { ok: false, reason: 'unauthenticated', error: UNAUTHENTICATED_MESSAGE }
const INVALID: Invalid = { ok: false, reason: 'invalid', error: INVALID_INTEREST_MESSAGE }

/**
 * Parses untrusted input into a de-duplicated list of interests, or null if
 * any entry is malformed or the list exceeds MAX_INTERESTS. Only subject and
 * keyStage are read from each entry; any other field is ignored.
 */
export function validateInterests(input: unknown): Interest[] | null {
  if (!Array.isArray(input) || input.length > MAX_INTERESTS) return null
  const seen = new Set<string>()
  const interests: Interest[] = []
  for (const entry of input) {
    if (typeof entry !== 'object' || entry === null) return null
    const { subject, keyStage } = entry as Record<string, unknown>
    if (!isSubject(subject) || !isKeyStage(keyStage)) return null
    const key = `${subject}:${keyStage}`
    if (seen.has(key)) continue
    seen.add(key)
    interests.push({ subject, keyStage })
  }
  return interests
}

export async function updateInterests(input: unknown, deps: InterestDeps): Promise<UpdateInterestsResult> {
  const session = await deps.getSession()
  if (!session?.userId) return { ...UNAUTHENTICATED }

  const interests = validateInterests(input)
  if (!interests) return { ...INVALID }

  await deps.store.replaceInterests(session.userId, interests)
  return { ok: true, interests }
}

export async function getMyInterests(deps: InterestDeps): Promise<GetInterestsResult> {
  const session = await deps.getSession()
  if (!session?.userId) return { ...UNAUTHENTICATED }
  return { ok: true, interests: await deps.store.listInterests(session.userId) }
}
