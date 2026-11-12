import { createHash, randomBytes } from 'node:crypto'

export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000

export function hashResetToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

export function generateResetToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString('hex')
  return { raw, hash: hashResetToken(raw) }
}

export function resetTokenExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + RESET_TOKEN_TTL_MS)
}

export function isResetTokenUsable(
  token: { expires: Date; usedAt: Date | null },
  now: Date = new Date(),
): boolean {
  return token.usedAt === null && token.expires.getTime() > now.getTime()
}
