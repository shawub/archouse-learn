import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  INVALID_TOKEN_MESSAGE,
  MIN_REQUEST_DURATION_MS,
  NEUTRAL_MESSAGE,
  RATE_LIMITED_MESSAGE,
  RATE_LIMITS,
  TOKEN_TTL_MS,
  createResetToken,
  hashToken,
  requestPasswordReset,
  resetPassword,
  type RequestResetDeps,
} from '@/lib/password-reset'
import { createRateLimiter } from '@/lib/rate-limit'
import { createFakeResetStore } from './helpers/fake-reset-store'

const T0 = new Date('2026-11-19T09:00:00Z')

function setup() {
  const fake = createFakeResetStore([
    { id: 'pw', email: 'Teacher@School.uk', passwordHash: 'old-hash' },
    { id: 'oauth', email: 'oauth.pupil@school.uk', passwordHash: null },
  ])
  const sent: { to: string; resetUrl: string }[] = []
  const sleeps: number[] = []
  const limiter = createRateLimiter()
  const deps: RequestResetDeps = {
    store: fake.store,
    mailer: { sendPasswordResetEmail: async m => void sent.push(m) },
    checkRateLimit: limiter.checkRateLimit,
    appUrl: 'https://learn.example.uk',
    now: () => T0,
    sleep: async ms => void sleeps.push(ms),
  }
  return { ...fake, deps, sent, sleeps }
}

const tokenFrom = (url: string) => new URL(url).searchParams.get('token')!

test('known and unknown emails get an identical neutral response', async () => {
  const { deps, sent } = setup()
  const known = await requestPasswordReset({ email: 'teacher@school.uk', ip: '1.1.1.1' }, deps)
  const unknown = await requestPasswordReset({ email: 'nobody@school.uk', ip: '1.1.1.2' }, deps)
  assert.deepEqual(known, { success: true, message: NEUTRAL_MESSAGE })
  assert.equal(JSON.stringify(unknown), JSON.stringify(known))
  assert.equal(sent.length, 1)
})

test('known email: link goes to the stored address and points at /reset-password on the app URL', async () => {
  const { deps, sent, tokens } = setup()
  await requestPasswordReset({ email: '  TEACHER@school.uk ', ip: '1.1.1.1' }, deps)
  assert.equal(sent[0].to, 'Teacher@School.uk')
  const url = new URL(sent[0].resetUrl)
  assert.equal(url.origin + url.pathname, 'https://learn.example.uk/reset-password')
  assert.equal(tokens[0].tokenHash, hashToken(tokenFrom(sent[0].resetUrl)))
})

test('both paths are padded to the same minimum duration', async () => {
  const { deps, sleeps } = setup()
  await requestPasswordReset({ email: 'teacher@school.uk', ip: '1.1.1.1' }, deps)
  await requestPasswordReset({ email: 'nobody@school.uk', ip: '1.1.1.1' }, deps)
  assert.deepEqual(sleeps, [MIN_REQUEST_DURATION_MS, MIN_REQUEST_DURATION_MS])
})

test('mailer or database failures still return the neutral response', async () => {
  const { deps } = setup()
  deps.mailer = { sendPasswordResetEmail: async () => { throw new Error('smtp down') } }
  const original = console.error
  console.error = () => {}
  try {
    const result = await requestPasswordReset({ email: 'teacher@school.uk', ip: '1.1.1.1' }, deps)
    assert.deepEqual(result, { success: true, message: NEUTRAL_MESSAGE })
  } finally {
    console.error = original
  }
})

test('invalid email is rejected with a validation error', async () => {
  const { deps } = setup()
  assert.deepEqual(await requestPasswordReset({ email: 'not-an-email', ip: '1.1.1.1' }, deps), {
    error: 'Enter a valid email',
  })
})

test('OAuth-only account gets the neutral response and a link that lets them set a password', async () => {
  const { deps, sent, users } = setup()
  const result = await requestPasswordReset({ email: 'oauth.pupil@school.uk', ip: '1.1.1.1' }, deps)
  assert.deepEqual(result, { success: true, message: NEUTRAL_MESSAGE })
  assert.equal(sent.length, 1)

  const reset = await resetPassword(
    { token: tokenFrom(sent[0].resetUrl), password: 'brand-new-pass' },
    { store: deps.store, hashPassword: async p => `hashed:${p}`, now: () => T0 },
  )
  assert.deepEqual(reset, { ok: true })
  assert.equal(users.find(u => u.id === 'oauth')!.passwordHash, 'hashed:brand-new-pass')
})

test('rate limit per email blocks after the limit, across different IPs, for unknown emails too', async () => {
  for (const email of ['teacher@school.uk', 'nobody@school.uk']) {
    const { deps } = setup()
    for (let i = 0; i < RATE_LIMITS.email.limit; i++) {
      const r = await requestPasswordReset({ email, ip: `10.0.0.${i}` }, deps)
      assert.equal(r.success, true)
    }
    const blocked = await requestPasswordReset({ email: email.toUpperCase(), ip: '10.0.1.1' }, deps)
    assert.deepEqual(blocked, { error: RATE_LIMITED_MESSAGE })
  }
})

test('rate limit per IP blocks after the limit, across different emails', async () => {
  const { deps, sent } = setup()
  for (let i = 0; i < RATE_LIMITS.ip.limit; i++) {
    const r = await requestPasswordReset({ email: `user${i}@school.uk`, ip: '9.9.9.9' }, deps)
    assert.equal(r.success, true)
  }
  const blocked = await requestPasswordReset({ email: 'teacher@school.uk', ip: '9.9.9.9' }, deps)
  assert.deepEqual(blocked, { error: RATE_LIMITED_MESSAGE })
  assert.equal(sent.length, 0)
  const otherIp = await requestPasswordReset({ email: 'teacher@school.uk', ip: '8.8.8.8' }, deps)
  assert.equal(otherIp.success, true)
})

test('successful reset sets the new password hash and the link cannot be reused', async () => {
  const { deps, sent, users } = setup()
  await requestPasswordReset({ email: 'teacher@school.uk', ip: '1.1.1.1' }, deps)
  const token = tokenFrom(sent[0].resetUrl)
  const resetDeps = { store: deps.store, hashPassword: async (p: string) => `hashed:${p}`, now: () => T0 }

  assert.deepEqual(await resetPassword({ token, password: 'correct-horse' }, resetDeps), { ok: true })
  assert.equal(users.find(u => u.id === 'pw')!.passwordHash, 'hashed:correct-horse')

  assert.deepEqual(await resetPassword({ token, password: 'second-try!' }, resetDeps), {
    error: INVALID_TOKEN_MESSAGE,
    invalidToken: true,
  })
  assert.equal(users.find(u => u.id === 'pw')!.passwordHash, 'hashed:correct-horse')
})

test('passwords shorter than 8 characters are rejected and the token stays usable', async () => {
  const { store, users } = setup()
  const token = await createResetToken(store, 'pw', T0)
  const deps = { store, hashPassword: async (p: string) => `hashed:${p}`, now: () => T0 }
  const short = await resetPassword({ token, password: 'short' }, deps)
  assert.equal(short.error, 'Password must be at least 8 characters')
  assert.equal(short.invalidToken, undefined)
  assert.equal(users[0].passwordHash, 'old-hash')
  assert.deepEqual(await resetPassword({ token, password: 'long-enough' }, deps), { ok: true })
})

test('expired, unknown and missing tokens return the request-a-new-link error', async () => {
  const { store } = setup()
  const token = await createResetToken(store, 'pw', T0)
  const expiredDeps = {
    store,
    hashPassword: async (p: string) => p,
    now: () => new Date(T0.getTime() + TOKEN_TTL_MS + 1),
  }
  const invalid = { error: INVALID_TOKEN_MESSAGE, invalidToken: true }
  assert.deepEqual(await resetPassword({ token, password: 'long-enough' }, expiredDeps), invalid)
  assert.deepEqual(await resetPassword({ token: 'nope', password: 'long-enough' }, expiredDeps), invalid)
  assert.deepEqual(await resetPassword({ token: null, password: 'long-enough' }, expiredDeps), invalid)
})
