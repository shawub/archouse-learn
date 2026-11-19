import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  TOKEN_TTL_MS,
  consumeToken,
  createResetToken,
  generateToken,
  hashToken,
  isTokenValid,
} from '@/lib/password-reset'
import { createRateLimiter } from '@/lib/rate-limit'
import { isPublicPath } from '@/lib/public-paths'
import { createFakeResetStore } from './helpers/fake-reset-store'

const T0 = new Date('2026-11-19T09:00:00Z')

function setup() {
  return createFakeResetStore([{ id: 'u1', email: 'pupil@school.uk', passwordHash: 'old-hash' }])
}

test('generateToken returns distinct URL-safe tokens of 32 random bytes', () => {
  const tokens = new Set(Array.from({ length: 50 }, generateToken))
  assert.equal(tokens.size, 50)
  for (const t of tokens) {
    assert.match(t, /^[A-Za-z0-9_-]{43}$/)
    assert.equal(Buffer.from(t, 'base64url').length, 32)
  }
})

test('hashToken is a deterministic SHA-256 digest that differs from the token', () => {
  const t = generateToken()
  assert.equal(hashToken(t), hashToken(t))
  assert.match(hashToken(t), /^[0-9a-f]{64}$/)
  assert.notEqual(hashToken(t), t)
  assert.notEqual(hashToken(t), hashToken(generateToken()))
})

test('only the hash is stored, and the token expires 60 minutes after issue', async () => {
  const { store, tokens } = setup()
  const raw = await createResetToken(store, 'u1', T0)
  assert.equal(tokens.length, 1)
  assert.equal(tokens[0].tokenHash, hashToken(raw))
  assert.ok(!JSON.stringify(tokens).includes(raw))
  assert.equal(tokens[0].expires.getTime(), T0.getTime() + TOKEN_TTL_MS)
})

test('isTokenValid: valid before expiry, invalid at/after expiry or once used', () => {
  const expires = new Date(T0.getTime() + TOKEN_TTL_MS)
  assert.equal(isTokenValid({ expires, usedAt: null }, new Date(expires.getTime() - 1)), true)
  assert.equal(isTokenValid({ expires, usedAt: null }, expires), false)
  assert.equal(isTokenValid({ expires, usedAt: null }, new Date(expires.getTime() + 1)), false)
  assert.equal(isTokenValid({ expires, usedAt: T0 }, T0), false)
})

test('an expired token cannot be consumed', async () => {
  const { store, users } = setup()
  const raw = await createResetToken(store, 'u1', T0)
  const result = await consumeToken(store, raw, 'new-hash', new Date(T0.getTime() + TOKEN_TTL_MS))
  assert.deepEqual(result, { ok: false })
  assert.equal(users[0].passwordHash, 'old-hash')
})

test('consumeToken sets the password, marks the token used, and rejects reuse', async () => {
  const { store, users, tokens } = setup()
  const raw = await createResetToken(store, 'u1', T0)
  const later = new Date(T0.getTime() + 5 * 60 * 1000)

  assert.deepEqual(await consumeToken(store, raw, 'new-hash', later), { ok: true, userId: 'u1' })
  assert.equal(users[0].passwordHash, 'new-hash')
  assert.deepEqual(tokens[0].usedAt, later)

  assert.deepEqual(await consumeToken(store, raw, 'another-hash', later), { ok: false })
  assert.equal(users[0].passwordHash, 'new-hash')
})

test('unknown tokens are rejected', async () => {
  const { store } = setup()
  assert.deepEqual(await consumeToken(store, generateToken(), 'x', T0), { ok: false })
  assert.deepEqual(await consumeToken(store, '', 'x', T0), { ok: false })
})

test('issuing a new token invalidates earlier unused tokens for that account only', async () => {
  const { store, users } = setup()
  users.push({ id: 'u2', email: 'other@school.uk', passwordHash: 'h2' })
  const first = await createResetToken(store, 'u1', T0)
  const other = await createResetToken(store, 'u2', T0)
  const second = await createResetToken(store, 'u1', new Date(T0.getTime() + 1000))

  const now = new Date(T0.getTime() + 2000)
  assert.deepEqual(await consumeToken(store, first, 'h', now), { ok: false })
  assert.deepEqual(await consumeToken(store, second, 'h', now), { ok: true, userId: 'u1' })
  assert.deepEqual(await consumeToken(store, other, 'h', now), { ok: true, userId: 'u2' })
})

test('a successful reset invalidates all outstanding tokens for the account', async () => {
  const { store, tokens } = setup()
  const a = await createResetToken(store, 'u1', T0)
  // Simulate a token that escaped invalidation (e.g. concurrent issue).
  const b = generateToken()
  await store.createToken({ userId: 'u1', tokenHash: hashToken(b), expires: new Date(T0.getTime() + TOKEN_TTL_MS) })

  assert.equal((await consumeToken(store, a, 'new-hash', T0)).ok, true)
  assert.ok(tokens.every(t => t.usedAt !== null))
  assert.deepEqual(await consumeToken(store, b, 'x', T0), { ok: false })
})

test('rate limiter allows up to the limit within a window, then resets', () => {
  const { checkRateLimit } = createRateLimiter()
  const opts = { limit: 2, windowMs: 1000 }
  assert.equal(checkRateLimit('k', { ...opts, now: 0 }).allowed, true)
  assert.equal(checkRateLimit('k', { ...opts, now: 10 }).allowed, true)
  assert.equal(checkRateLimit('k', { ...opts, now: 20 }).allowed, false)
  assert.equal(checkRateLimit('other', { ...opts, now: 20 }).allowed, true)
  assert.equal(checkRateLimit('k', { ...opts, now: 1000 }).allowed, true)
})

test('forgot-password and reset-password are public paths', () => {
  assert.equal(isPublicPath('/forgot-password'), true)
  assert.equal(isPublicPath('/reset-password'), true)
  assert.equal(isPublicPath('/login'), true)
  assert.equal(isPublicPath('/teacher/dashboard'), false)
})
