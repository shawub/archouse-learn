import bcrypt from 'bcryptjs'
import { z } from 'zod'
import type { Mailer } from '@/lib/mailer'
import { checkRateLimit } from '@/lib/rate-limit'
import { generateResetToken, hashResetToken, resetTokenExpiry } from '@/lib/reset-tokens'

// Core password-reset logic, kept free of Next.js and Prisma imports so it can be
// unit tested with an in-memory store. Server actions in `lib/actions/auth.ts`
// wire it to the real database and mailer.

export const FORGOT_PASSWORD_MESSAGE = "If an account exists for that email, we've sent a reset link."
export const INVALID_RESET_TOKEN_MESSAGE = 'This reset link is invalid or has expired.'

export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000
export const RATE_LIMIT_PER_EMAIL = 3
export const RATE_LIMIT_PER_IP = 10

export interface PasswordResetStore {
  findUserByEmail(email: string): Promise<{ id: string } | null>
  createResetToken(data: { tokenHash: string; userId: string; email: string; expires: Date }): Promise<void>
  /** Atomically marks the token used and sets the password. Returns false if the token was not usable. */
  consumeResetToken(tokenHash: string, passwordHash: string, now: Date): Promise<boolean>
}

export interface PasswordResetDeps {
  store: PasswordResetStore
  mailer: Mailer
  baseUrl: string
  now?: () => Date
  hashPassword?: (password: string) => Promise<string>
}

export type ForgotPasswordResult = { success: true; message: string; error?: never } | { error: string; success?: never }
export type ResetPasswordResult = { success: true; error?: never } | { error: string; success?: never }

const emailSchema = z.string().trim().toLowerCase().pipe(z.string().email('Enter a valid email'))

export const resetPasswordSchema = z.object({
  token: z.string().min(1, INVALID_RESET_TOKEN_MESSAGE),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export async function requestPasswordReset(
  deps: PasswordResetDeps,
  input: { email: unknown; ip: string },
): Promise<ForgotPasswordResult> {
  const parsed = emailSchema.safeParse(input.email)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Enter a valid email' }

  const email = parsed.data
  const neutral: ForgotPasswordResult = { success: true, message: FORGOT_PASSWORD_MESSAGE }

  // Both limits are always checked so each counter is incremented on every request.
  const emailOk = checkRateLimit(`forgot-password:email:${email}`, RATE_LIMIT_PER_EMAIL, RATE_LIMIT_WINDOW_MS)
  const ipOk = checkRateLimit(`forgot-password:ip:${input.ip}`, RATE_LIMIT_PER_IP, RATE_LIMIT_WINDOW_MS)
  if (!emailOk || !ipOk) return neutral

  try {
    const user = await deps.store.findUserByEmail(email)
    if (!user) return neutral

    const now = deps.now?.() ?? new Date()
    const { raw, hash } = generateResetToken()
    await deps.store.createResetToken({ tokenHash: hash, userId: user.id, email, expires: resetTokenExpiry(now) })

    const resetUrl = new URL(`/reset-password?token=${raw}`, deps.baseUrl).toString()
    await deps.mailer.sendPasswordResetEmail({ to: email, resetUrl })
  } catch (err) {
    // Never let failures change the response, or account existence would leak.
    console.error('[password-reset] Failed to issue reset token', err)
  }

  return neutral
}

export async function resetPassword(
  deps: Pick<PasswordResetDeps, 'store' | 'now' | 'hashPassword'>,
  input: { token: unknown; password: unknown },
): Promise<ResetPasswordResult> {
  const parsed = resetPasswordSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  const now = deps.now?.() ?? new Date()
  const hashPassword = deps.hashPassword ?? ((p: string) => bcrypt.hash(p, 12))
  const passwordHash = await hashPassword(parsed.data.password)

  const ok = await deps.store.consumeResetToken(hashResetToken(parsed.data.token), passwordHash, now)
  if (!ok) return { error: INVALID_RESET_TOKEN_MESSAGE }

  return { success: true }
}
