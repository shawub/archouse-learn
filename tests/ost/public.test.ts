import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Read the source rather than importing it: middleware pulls in NextAuth at module load.
test('/ost stays in middleware publicPaths', () => {
  const source = readFileSync(join(__dirname, '../../src/middleware.ts'), 'utf8')
  const match = source.match(/const publicPaths = \[([^\]]*)\]/)
  assert.ok(match, 'publicPaths is declared')
  assert.match(match[1], /'\/ost'/)
})
