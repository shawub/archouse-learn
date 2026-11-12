import { test } from 'node:test'
import assert from 'node:assert/strict'
import { decideOAuthSignIn, isEmailVerified, type OAuthSignInInput } from '@/lib/oauth-policy'

const base: OAuthSignInInput = {
  provider: 'google',
  providerAccountId: 'g-1',
  profile: { email: 'Pupil@School.uk', name: 'Pat Pupil', email_verified: true },
  intent: { source: 'login' },
  userByAccount: null,
  userByEmail: null,
}

const passwordUser = { id: 'u1', accounts: [] }

test('register: new user is allowed (role is applied by the adapter)', () => {
  for (const role of ['TEACHER', 'STUDENT'] as const) {
    const d = decideOAuthSignIn({ ...base, intent: { source: 'register', role } })
    assert.deepEqual(d, { action: 'allow', reason: 'register' })
  }
})

test('login with no account redirects to /register with name and email prefilled', () => {
  const d = decideOAuthSignIn(base)
  assert.equal(d.action, 'redirect')
  const url = new URL((d as { to: string }).to, 'http://x')
  assert.equal(url.pathname, '/register')
  assert.equal(url.searchParams.get('email'), 'pupil@school.uk')
  assert.equal(url.searchParams.get('name'), 'Pat Pupil')
})

test('verified email links to an existing password account', () => {
  const d = decideOAuthSignIn({ ...base, userByEmail: passwordUser })
  assert.deepEqual(d, { action: 'allow', reason: 'link-verified' })
})

test('unverified email is refused for an existing account (login and register)', () => {
  for (const intent of [{ source: 'login' }, { source: 'register', role: 'STUDENT' }] as const) {
    const d = decideOAuthSignIn({
      ...base,
      intent,
      profile: { ...base.profile, email_verified: false },
      userByEmail: passwordUser,
    })
    assert.equal(d.action, 'redirect')
    assert.match((d as { to: string }).to, /^\/login\?error=OAuthEmailNotVerified/)
  }
})

test('absent email_verified is treated as unverified', () => {
  const d = decideOAuthSignIn({ ...base, profile: { email: 'a@b.uk' }, userByEmail: passwordUser })
  assert.equal(d.action, 'redirect')
})

test('Microsoft xms_edov counts as verified', () => {
  assert.equal(isEmailVerified({ email: 'a@b.uk', xms_edov: true }), true)
  assert.equal(isEmailVerified({ email: 'a@b.uk', email_verified: 'false' }), false)
})

test('already-linked account signs in without re-linking', () => {
  const d = decideOAuthSignIn({ ...base, profile: { email: 'a@b.uk' }, userByAccount: { id: 'u1' } })
  assert.deepEqual(d, { action: 'allow', reason: 'existing-account' })
})

test('refuses to attach a second account from the same provider', () => {
  const d = decideOAuthSignIn({
    ...base,
    userByEmail: { id: 'u1', accounts: [{ provider: 'google', providerAccountId: 'g-other' }] },
  })
  assert.equal(d.action, 'redirect')
  assert.match((d as { to: string }).to, /OAuthAccountConflict/)
})

test('missing email is refused', () => {
  const d = decideOAuthSignIn({ ...base, intent: { source: 'register', role: 'TEACHER' }, profile: { name: 'x' } })
  assert.equal(d.action, 'redirect')
  assert.match((d as { to: string }).to, /OAuthNoEmail/)
})
