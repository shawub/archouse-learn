import { beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { Mailer } from '@/lib/mailer'
import {
  FORGOT_PASSWORD_MESSAGE,
  INVALID_RESET_TOKEN_MESSAGE,
  RATE_LIMIT_PER_EMAIL,
  RATE_LIMIT_PER_IP,
  requestPasswordReset,
  resetPassword,
  type PasswordResetStore,
} from '@/lib/password-reset'
import { resetRateLimits } from '@/lib/rate-limit'
import {
  RESET_TOKEN_TTL_MS,
  generateResetToken,
  hashResetToken,
  isResetTokenUsable,
  resetTokenExpiry,
} from '@/lib/reset-tokens'

type TokenRow = { tokenHash: string; userId: string; email: string; expires: Date; usedAt: Date | null }

function createFakes() {
  const users = new Map<string, { id: string; email: string; passwordHash: string | null }>([
    ['u1', { id: 'u1', email: 'Teacher@School.test', passwordHash: 'old-hash' }],
  ])
  const tokens: TokenRow[] = []
  const sent: { to: string; resetUrl: string }[] = []

  const store: PasswordResetStore = {
    async findUserByEmail(email) {
      for (const u of users.values()) if (u.email.toLowerCase() === email) return { id: u.id }
      return null
    },
    async createResetToken(data) {
      tokens.push({ ...data, usedAt: null })
    },
    async consumeResetToken(tokenHash, passwordHash, now) {
      const token = tokens.find(t => t.tokenHash === tokenHash)
      if (!token || !isResetTokenUsable(token, now)) return false
      token.usedAt = now
      users.get(token.userId)!.passwordHash = passwordHash
      return true
    },
  }
  const mailer: Mailer = {
    async sendPasswordResetEmail(opts) {
      sent.push(opts)
    },
  }
  const deps = {
    store,
    mailer,
    baseUrl: 'http://localhost:3000',
    hashPassword: async (p: string) => `hashed:${p}`,
  }
  return { users, tokens, sent, deps }
}

function rawTokenFrom(resetUrl: string) {
  return new URL(resetUrl).searchParams.get('token')!
}

beforeEach(() => resetRateLimits())

describe('reset token generation', () => {
  it('produces a random raw token and its SHA-256 hash', () => {
    const a = generateResetToken()
    const b = generateResetToken()
    assert.match(a.raw, /^[0-9a-f]{64}$/)
    assert.match(a.hash, /^[0-9a-f]{64}$/)
    assert.notEqual(a.raw, a.hash)
    assert.equal(hashResetToken(a.raw), a.hash)
    assert.notEqual(a.raw, b.raw)
    assert.notEqual(a.hash, b.hash)
  })

  it('expires 60 minutes after creation', () => {
    const now = new Date('2026-01-01T12:00:00Z')
    const expires = resetTokenExpiry(now)
    assert.equal(RESET_TOKEN_TTL_MS, 60 * 60 * 1000)
    assert.equal(expires.getTime() - now.getTime(), RESET_TOKEN_TTL_MS)
    assert.equal(isResetTokenUsable({ expires, usedAt: null }, new Date(now.getTime() + 59 * 60 * 1000)), true)
    assert.equal(isResetTokenUsable({ expires, usedAt: null }, new Date(now.getTime() + 60 * 60 * 1000)), false)
    assert.equal(isResetTokenUsable({ expires, usedAt: now }, now), false)
  })
})

describe('forgotPassword', () => {
  it('returns the neutral response for unknown emails without creating a token or sending mail', async () => {
    const { tokens, sent, deps } = createFakes()
    const result = await requestPasswordReset(deps, { email: 'nobody@school.test', ip: '1.1.1.1' })
    assert.deepEqual(result, { success: true, message: FORGOT_PASSWORD_MESSAGE })
    assert.equal(tokens.length, 0)
    assert.equal(sent.length, 0)
  })

  it('returns an identical response for known and unknown emails', async () => {
    const { deps } = createFakes()
    const known = await requestPasswordReset(deps, { email: 'teacher@school.test', ip: '1.1.1.1' })
    const unknown = await requestPasswordReset(deps, { email: 'nobody@school.test', ip: '1.1.1.1' })
    assert.deepEqual(known, unknown)
  })

  it('stores only a hashed token for an existing user and emails the raw link', async () => {
    const { tokens, sent, deps } = createFakes()
    const now = new Date('2026-01-01T12:00:00Z')
    await requestPasswordReset({ ...deps, now: () => now }, { email: '  TEACHER@school.test ', ip: '1.1.1.1' })

    assert.equal(tokens.length, 1)
    assert.equal(sent.length, 1)
    const raw = rawTokenFrom(sent[0].resetUrl)
    assert.ok(sent[0].resetUrl.startsWith('http://localhost:3000/reset-password?token='))
    assert.equal(sent[0].to, 'teacher@school.test')
    assert.equal(tokens[0].tokenHash, hashResetToken(raw))
    assert.notEqual(tokens[0].tokenHash, raw)
    assert.ok(!JSON.stringify(tokens).includes(raw))
    assert.equal(tokens[0].email, 'teacher@school.test')
    assert.equal(tokens[0].expires.getTime(), now.getTime() + RESET_TOKEN_TTL_MS)
  })

  it('stays neutral when the mailer fails', async () => {
    const { deps } = createFakes()
    const failing: Mailer = { sendPasswordResetEmail: async () => { throw new Error('smtp down') } }
    const originalError = console.error
    console.error = () => {}
    try {
      const result = await requestPasswordReset({ ...deps, mailer: failing }, { email: 'teacher@school.test', ip: '1.1.1.1' })
      assert.deepEqual(result, { success: true, message: FORGOT_PASSWORD_MESSAGE })
    } finally {
      console.error = originalError
    }
  })

  it('rate-limits per email with the neutral response and no new token', async () => {
    const { tokens, deps } = createFakes()
    for (let i = 0; i < RATE_LIMIT_PER_EMAIL; i++) {
      await requestPasswordReset(deps, { email: 'teacher@school.test', ip: `10.0.0.${i}` })
    }
    assert.equal(tokens.length, RATE_LIMIT_PER_EMAIL)
    const result = await requestPasswordReset(deps, { email: 'teacher@school.test', ip: '10.0.1.1' })
    assert.deepEqual(result, { success: true, message: FORGOT_PASSWORD_MESSAGE })
    assert.equal(tokens.length, RATE_LIMIT_PER_EMAIL)
  })

  it('rate-limits per IP with the neutral response and no new token', async () => {
    const { tokens, deps } = createFakes()
    for (let i = 0; i < RATE_LIMIT_PER_IP; i++) {
      await requestPasswordReset(deps, { email: `someone${i}@school.test`, ip: '2.2.2.2' })
    }
    const result = await requestPasswordReset(deps, { email: 'teacher@school.test', ip: '2.2.2.2' })
    assert.deepEqual(result, { success: true, message: FORGOT_PASSWORD_MESSAGE })
    assert.equal(tokens.length, 0)
  })

  it('rejects an invalid email address', async () => {
    const { deps } = createFakes()
    const result = await requestPasswordReset(deps, { email: 'not-an-email', ip: '1.1.1.1' })
    assert.ok(result.error)
  })
})

describe('resetPassword', () => {
  async function issueToken(fakes: ReturnType<typeof createFakes>, now = new Date()) {
    await requestPasswordReset({ ...fakes.deps, now: () => now }, { email: 'teacher@school.test', ip: '1.1.1.1' })
    return rawTokenFrom(fakes.sent.at(-1)!.resetUrl)
  }

  it('sets a new password with a valid token', async () => {
    const fakes = createFakes()
    const token = await issueToken(fakes)
    const result = await resetPassword(fakes.deps, { token, password: 'new-password' })
    assert.deepEqual(result, { success: true })
    assert.equal(fakes.users.get('u1')!.passwordHash, 'hashed:new-password')
    assert.ok(fakes.tokens[0].usedAt instanceof Date)
  })

  it('is single use', async () => {
    const fakes = createFakes()
    const token = await issueToken(fakes)
    assert.deepEqual(await resetPassword(fakes.deps, { token, password: 'first-password' }), { success: true })
    const second = await resetPassword(fakes.deps, { token, password: 'second-password' })
    assert.deepEqual(second, { error: INVALID_RESET_TOKEN_MESSAGE })
    assert.equal(fakes.users.get('u1')!.passwordHash, 'hashed:first-password')
  })

  it('rejects an expired token', async () => {
    const fakes = createFakes()
    const issuedAt = new Date('2026-01-01T12:00:00Z')
    const token = await issueToken(fakes, issuedAt)
    const later = new Date(issuedAt.getTime() + RESET_TOKEN_TTL_MS + 1)
    const result = await resetPassword({ ...fakes.deps, now: () => later }, { token, password: 'new-password' })
    assert.deepEqual(result, { error: INVALID_RESET_TOKEN_MESSAGE })
    assert.equal(fakes.users.get('u1')!.passwordHash, 'old-hash')
  })

  it('rejects unknown and missing tokens', async () => {
    const { deps } = createFakes()
    assert.deepEqual(await resetPassword(deps, { token: 'nope', password: 'new-password' }), { error: INVALID_RESET_TOKEN_MESSAGE })
    assert.deepEqual(await resetPassword(deps, { token: '', password: 'new-password' }), { error: INVALID_RESET_TOKEN_MESSAGE })
  })

  it('enforces the registration minimum password length', async () => {
    const fakes = createFakes()
    const token = await issueToken(fakes)
    const result = await resetPassword(fakes.deps, { token, password: 'short' })
    assert.deepEqual(result, { error: 'Password must be at least 8 characters' })
    assert.equal(fakes.tokens[0].usedAt, null)
  })
})
