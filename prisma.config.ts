import { defineConfig } from 'prisma/config'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Prisma 7 does not pre-load .env before evaluating prisma.config.ts — load it explicitly.
for (const file of ['.env']) {
  try {
    const raw = readFileSync(resolve(process.cwd(), file), 'utf-8')
    for (const line of raw.split('\n')) {
      const m = line.match(/^([^#=\s][^=]*)=(.*)$/)
      if (m) process.env[m[1].trim()] ??= m[2].trim().replace(/^["'](.*)["']$/, '$1')
    }
  } catch { /* file not present */ }
}

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL!,
  },
})
