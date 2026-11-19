import type { PasswordResetStore, ResetTokenRecord, ResetUser } from '@/lib/password-reset'

/** In-memory PasswordResetStore mirroring the Prisma implementation's semantics. */
export function createFakeResetStore(users: ResetUser[] = []) {
  const tokens: ResetTokenRecord[] = []
  let nextId = 1

  const store: PasswordResetStore = {
    async findUserByEmail(email) {
      return users.find(u => u.email?.toLowerCase() === email.toLowerCase()) ?? null
    },
    async findTokenByHash(tokenHash) {
      const t = tokens.find(t => t.tokenHash === tokenHash)
      return t ? { ...t } : null
    },
    async createToken(data) {
      tokens.push({ id: `t${nextId++}`, usedAt: null, ...data })
    },
    async invalidateUnusedTokens(userId, now) {
      for (const t of tokens) if (t.userId === userId && t.usedAt === null) t.usedAt = now
    },
    async claimToken(tokenId, now) {
      const t = tokens.find(t => t.id === tokenId)
      if (!t || t.usedAt !== null || t.expires <= now) return false
      t.usedAt = now
      return true
    },
    async setPasswordHash(userId, passwordHash) {
      const u = users.find(u => u.id === userId)
      if (u) u.passwordHash = passwordHash
    },
    transaction: fn => fn(store),
  }

  return { store, users, tokens }
}
