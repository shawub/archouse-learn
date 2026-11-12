import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildProviders,
  getOAuthAvailability,
  isGoogleConfigured,
  isMicrosoftConfigured,
  OAUTH_SCOPE,
} from '@/lib/auth-providers'

const google = { GOOGLE_CLIENT_ID: 'gid', GOOGLE_CLIENT_SECRET: 'gsecret' }
const microsoft = {
  MICROSOFT_CLIENT_ID: 'mid',
  MICROSOFT_CLIENT_SECRET: 'msecret',
  MICROSOFT_TENANT_ID: 'tenant-123',
}

test('no providers when env is empty', () => {
  assert.deepEqual(getOAuthAvailability({}), { showGoogle: false, showMicrosoft: false })
  assert.equal(buildProviders({}).length, 0)
})

test('blank values count as unset', () => {
  assert.equal(isGoogleConfigured({ GOOGLE_CLIENT_ID: ' ', GOOGLE_CLIENT_SECRET: 'x' }), false)
})

test('Google requires both id and secret', () => {
  assert.equal(isGoogleConfigured({ GOOGLE_CLIENT_ID: 'gid' }), false)
  assert.equal(isGoogleConfigured(google), true)
  assert.deepEqual(buildProviders(google).map(p => p.id), ['google'])
})

test('partial Microsoft config (missing tenant) is treated as unconfigured', () => {
  const { MICROSOFT_TENANT_ID: _, ...partial } = microsoft
  assert.equal(isMicrosoftConfigured(partial), false)
  assert.equal(buildProviders(partial).length, 0)
})

test('Microsoft requires id, secret and tenant', () => {
  assert.equal(isMicrosoftConfigured(microsoft), true)
  const [p] = buildProviders(microsoft)
  assert.equal(p.id, 'microsoft-entra-id')
  assert.equal(p.options?.issuer, 'https://login.microsoftonline.com/tenant-123/v2.0')
})

test('both providers request only openid/email/profile and enforce PKCE + state', () => {
  const providers = buildProviders({ ...google, ...microsoft })
  assert.deepEqual(providers.map(p => p.id), ['google', 'microsoft-entra-id'])
  for (const p of providers) {
    const authorization = p.options?.authorization as { params: { scope: string } }
    assert.equal(authorization.params.scope, OAUTH_SCOPE)
    assert.deepEqual(OAUTH_SCOPE.split(' ').sort(), ['email', 'openid', 'profile'])
    assert.ok(p.options?.checks?.includes('pkce'))
    assert.ok(p.options?.checks?.includes('state'))
  }
})

test('Microsoft profile does not depend on Graph scopes', async () => {
  const [p] = buildProviders(microsoft)
  const profile = await p.options!.profile!({ sub: 'abc', name: 'Ms Smith', email: 'smith@school.uk' } as any, {} as any)
  assert.equal(profile.id, 'abc')
  assert.equal(profile.email, 'smith@school.uk')
  assert.equal(profile.image, null)
})
