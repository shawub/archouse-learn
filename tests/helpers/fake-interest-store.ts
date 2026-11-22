import type { Interest, InterestStore } from '@/lib/interests'

export type FakeInterestRow = Interest & { userId: string }

// Postgres orders enum values by declaration order, not alphabetically.
const SUBJECT_ORDER = ['MATHS', 'ENGLISH', 'SCIENCE', 'HISTORY', 'GEOGRAPHY', 'COMPUTING', 'ART', 'MUSIC', 'PE', 'RE', 'MFL']
const KEY_STAGE_ORDER = ['KS1', 'KS2', 'KS3', 'KS4']
const compare = (a: Interest, b: Interest) =>
  SUBJECT_ORDER.indexOf(a.subject) - SUBJECT_ORDER.indexOf(b.subject) ||
  KEY_STAGE_ORDER.indexOf(a.keyStage) - KEY_STAGE_ORDER.indexOf(b.keyStage)

/**
 * In-memory InterestStore mirroring the Prisma implementation's semantics.
 * replaceInterests builds the next state off to the side and only commits it
 * at the end, so setting `failCreate` models a create failing mid-transaction
 * and rolling back the delete.
 */
export function createFakeInterestStore(initialRows: FakeInterestRow[] = []) {
  const rows: FakeInterestRow[] = initialRows.map(r => ({ ...r }))
  const control = { failCreate: false }

  const store: InterestStore = {
    async listInterests(userId) {
      return rows
        .filter(r => r.userId === userId)
        .map(({ subject, keyStage }) => ({ subject, keyStage }))
        .sort(compare)
    },
    async replaceInterests(userId, interests) {
      const next = rows.filter(r => r.userId !== userId)
      if (control.failCreate) throw new Error('createMany failed')
      for (const { subject, keyStage } of interests) {
        if (next.some(r => r.userId === userId && r.subject === subject && r.keyStage === keyStage)) {
          throw new Error('Unique constraint failed')
        }
        next.push({ userId, subject, keyStage })
      }
      rows.splice(0, rows.length, ...next)
    },
  }

  return { store, rows, control }
}
