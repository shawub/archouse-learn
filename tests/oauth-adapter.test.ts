import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { Adapter, AdapterUser } from 'next-auth/adapters'
import { withOAuthUserHandling } from '@/lib/oauth-adapter'
import type { OAuthIntent } from '@/lib/oauth-intent'

function setup(intent: OAuthIntent) {
  const created: Record<string, unknown>[] = []
  const lookups: string[] = []
  const base: Adapter = {
    async createUser(user) {
      created.push(user as unknown as Record<string, unknown>)
      return { ...user, id: 'new-id' }
    },
  }
  const adapter = withOAuthUserHandling(base, {
    findUserByEmail: async email => {
      lookups.push(email)
      return null
    },
    readIntent: async () => intent,
  })
  return { adapter, created, lookups }
}

const profile = {
  id: 'ignored',
  email: 'New.Teacher@School.UK',
  name: 'New Teacher',
  emailVerified: null,
  role: 'STUDENT',
} as unknown as AdapterUser

test('role selected on /register is preserved when the user is created', async () => {
  for (const role of ['TEACHER', 'STUDENT'] as const) {
    const { adapter, created } = setup({ source: 'register', role })
    const user = await adapter.createUser!(profile)
    assert.equal(created[0].role, role)
    assert.equal(user.role, role)
    assert.equal(created[0].email, 'new.teacher@school.uk')
  }
})

test('user creation is refused outside of registration', async () => {
  const { adapter, created } = setup({ source: 'login' })
  await assert.rejects(async () => adapter.createUser!(profile))
  assert.equal(created.length, 0)
})

test('email lookups are normalised', async () => {
  const { adapter, lookups } = setup({ source: 'login' })
  await adapter.getUserByEmail!('  Pupil@School.UK ')
  assert.deepEqual(lookups, ['pupil@school.uk'])
})
