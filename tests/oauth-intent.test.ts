import { test } from 'node:test'
import assert from 'node:assert/strict'
import { intentFromInput, LOGIN_INTENT, parseIntent, serializeIntent } from '@/lib/oauth-intent'

test('round-trips a register intent', () => {
  const intent = { source: 'register', role: 'TEACHER' } as const
  assert.deepEqual(parseIntent(serializeIntent(intent)), intent)
})

test('missing or tampered cookie falls back to login', () => {
  assert.deepEqual(parseIntent(undefined), LOGIN_INTENT)
  assert.deepEqual(parseIntent('not json'), LOGIN_INTENT)
  assert.deepEqual(parseIntent(JSON.stringify({ source: 'register', role: 'ADMIN' })), LOGIN_INTENT)
  assert.deepEqual(parseIntent(JSON.stringify({ source: 'other' })), LOGIN_INTENT)
})

test('form input never yields an ADMIN role', () => {
  assert.deepEqual(intentFromInput('register', 'teacher'), { source: 'register', role: 'TEACHER' })
  assert.deepEqual(intentFromInput('register', 'ADMIN'), { source: 'register', role: 'STUDENT' })
  assert.deepEqual(intentFromInput('login', 'TEACHER'), LOGIN_INTENT)
})
