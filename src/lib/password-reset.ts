import { createHash, randomBytes } from 'node:crypto'
import { z } from 'zod'
import type { Mailer } from '@/lib/mailer'
import type { RateLimitOptions } from '@/lib/rate-limit'
import {
  INVALID_TOKEN_MESSAGE,
  MIN_PASSWORD_LENGTH,
  NEUTRAL_MESSAGE,
  RATE_LIMITED_MESSAGE,
} from '@/lib/password-reset-messages'

// Core forgot/reset-password logic. Database access goes through
// `PasswordResetStore` so the flow can be unit-tested without Postgres;
// the Prisma implementation lives in `password-reset-store.ts`.

export const TOKEN_TTL_MS = 60 * 60 * 1000
/** Every forgot-password request takes at least this long, so timing doesn't reveal whether the email exists. */
export const MIN_REQUEST_DURATION_MS = 750

export const RATE_LIMITS = {
  email: { limit: 3, windowMs: 15 * 60 * 1000 },
  ip: { limit: 10, windowMs: 15 * 60 * 1000 },
} as const

export { INVALID_TOKEN_MESSAGE, MIN_PASSWORD_LENGTH, NEUTRAL_MESSAGE, RATE_LIMITED_MESSAGE }

// ─── Tokens ───────────────────────────────────────────────────────────────────

/** 32 bytes from the CSPRNG, URL-safe. Only ever sent to the user, never stored. */
export function generateToken(): string {
  return randomBytes(32).toString('base64url')
}

/** SHA-256 hex digest — what is stored in the database. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export type ResetTokenRecord = {
  id: string
  userId: string
  tokenHash: string
  expires: Date
  usedAt: Date | null
}

export function isTokenValid(record: Pick<ResetTokenRecord, 'expires' | 'usedAt'>, now: Date = new Date()): boolean {
  return record.usedAt === null && record.expires.getTime() > now.getTime()
}

// ─── Storage ──────────────────────────────────────────────────────────────────

export type ResetUser = { id: string; email: string | null; passwordHash: string | null }

export interface PasswordResetStore {
  /** Case-insensitive lookup. */
  findUserByEmail(email: string): Promise<ResetUser | null>
  findTokenByHash(tokenHash: string): Promise<ResetTokenRecord | null>
  createToken(data: { userId: string; tokenHash: string; expires: Date }): Promise<void>
  /** Marks every unused token for the user as used. */
  invalidateUnusedTokens(userId: string, now: Date): Promise<void>
  /** Marks the token used only if it is still unused and unexpired. Returns whether it was claimed. */
  claimToken(tokenId: string, now: Date): Promise<boolean>
  setPasswordHash(userId: string, passwordHash: string): Promise<void>
  transaction<T>(fn: (tx: PasswordResetStore) => Promise<T>): Promise<T>
}

/** Issues a new token for the user, invalidating any earlier unused ones. Returns the raw token. */
export async function createResetToken(
  store: PasswordResetStore,
  userId: string,
  now: Date = new Date(),
): Promise<string> {
  const token = generateToken()
  await store.transaction(async tx => {
    await tx.invalidateUnusedTokens(userId, now)
    await tx.createToken({ userId, tokenHash: hashToken(token), expires: new Date(now.getTime() + TOKEN_TTL_MS) })
  })
  return token
}

export async function findValidToken(
  store: PasswordResetStore,
  rawToken: string,
  now: Date = new Date(),
): Promise<ResetTokenRecord | null> {
  if (!rawToken) return null
  const record = await store.findTokenByHash(hashToken(rawToken))
  return record && isTokenValid(record, now) ? record : null
}

/**
 * Uses the token to set a new password. The token is claimed atomically (so it
 * can only be used once), and all other outstanding tokens for the user are invalidated.
 */
export async function consumeToken(
  store: PasswordResetStore,
  rawToken: string,
  newPasswordHash: string,
  now: Date = new Date(),
): Promise<{ ok: true; userId: string } | { ok: false }> {
  const record = await findValidToken(store, rawToken, now)
  if (!record) return { ok: false }

  const claimed = await store.transaction(async tx => {
    if (!(await tx.claimToken(record.id, now))) return false
    await tx.setPasswordHash(record.userId, newPasswordHash)
    await tx.invalidateUnusedTokens(record.userId, now)
    return true
  })
  return claimed ? { ok: true, userId: record.userId } : { ok: false }
}

// ─── Request / reset flows (used by the server actions) ──────────────────────

export type RequestResetResult = { success: true; message: string; error?: never } | { error: string; success?: never }

export type ResetPasswordResult =
  | { ok: true; error?: never; invalidToken?: never }
  | { error: string; invalidToken?: boolean; ok?: never }

const emailSchema = z.string().trim().email('Enter a valid email')

export function normalizeResetEmail(email: string): string {
  return email.trim().toLowerCase()
}

export type RequestResetDeps = {
  store: PasswordResetStore
  mailer: Mailer
  checkRateLimit: (key: string, opts: RateLimitOptions) => { allowed: boolean }
  /** Base URL for links, e.g. NEXTAUTH_URL. Never derived from request headers. */
  appUrl: string
  now?: () => Date
  minDurationMs?: number
  sleep?: (ms: number) => Promise<void>
}

const defaultSleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

/**
 * Always returns the same neutral result for valid input, whether or not the
 * account exists, and pads every call to a minimum duration.
 *
 * Policy for OAuth-only accounts (no password): they are sent a reset link like
 * anyone else, and using it sets a password so they can also sign in with
 * email + password alongside Google / Microsoft.
 */
export async function requestPasswordReset(
  input: { email: unknown; ip: string },
  deps: RequestResetDeps,
): Promise<RequestResetResult> {
  const parsed = emailSchema.safeParse(input.email)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Enter a valid email' }

  const now = deps.now ?? (() => new Date())
  const sleep = deps.sleep ?? defaultSleep
  const minDurationMs = deps.minDurationMs ?? MIN_REQUEST_DURATION_MS
  const startedAt = now().getTime()

  const email = normalizeResetEmail(parsed.data)
  const result = await (async (): Promise<RequestResetResult> => {
    // Both limits are counted on every request, for known and unknown emails alike.
    const byIp = deps.checkRateLimit(`pwreset:ip:${input.ip}`, { ...RATE_LIMITS.ip, now: startedAt })
    const byEmail = deps.checkRateLimit(`pwreset:email:${email}`, { ...RATE_LIMITS.email, now: startedAt })
    if (!byIp.allowed || !byEmail.allowed) return { error: RATE_LIMITED_MESSAGE }

    try {
      const user = await deps.store.findUserByEmail(email)
      if (user?.email) {
        const token = await createResetToken(deps.store, user.id, now())
        const resetUrl = new URL('/reset-password', deps.appUrl)
        resetUrl.searchParams.set('token', token)
        await deps.mailer.sendPasswordResetEmail({ to: user.email, resetUrl: resetUrl.toString() })
      }
    } catch (err) {
      // Never surface failures: an error only for existing accounts would leak existence.
      console.error('[password-reset] failed to issue reset link', err)
    }
    return { success: true, message: NEUTRAL_MESSAGE }
  })()

  const elapsed = now().getTime() - startedAt
  if (elapsed < minDurationMs) await sleep(minDurationMs - elapsed)
  return result
}

const resetSchema = z.object({
  token: z.string().min(1, INVALID_TOKEN_MESSAGE),
  password: z.string().min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`),
})

export type ResetPasswordDeps = {
  store: PasswordResetStore
  hashPassword: (password: string) => Promise<string>
  now?: () => Date
}

export async function resetPassword(
  input: { token: unknown; password: unknown },
  deps: ResetPasswordDeps,
): Promise<ResetPasswordResult> {
  const parsed = resetSchema.safeParse(input)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return issue?.path[0] === 'token'
      ? { error: INVALID_TOKEN_MESSAGE, invalidToken: true }
      : { error: issue?.message ?? 'Invalid input' }
  }

  const now = deps.now ?? (() => new Date())
  // Check first so we don't spend a bcrypt hash on a dead link.
  if (!(await findValidToken(deps.store, parsed.data.token, now()))) {
    return { error: INVALID_TOKEN_MESSAGE, invalidToken: true }
  }

  const passwordHash = await deps.hashPassword(parsed.data.password)
  const result = await consumeToken(deps.store, parsed.data.token, passwordHash, now())
  return result.ok ? { ok: true } : { error: INVALID_TOKEN_MESSAGE, invalidToken: true }
}
