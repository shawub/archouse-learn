# Spec: Request account deletion

## Summary
Add an authenticated "request account deletion" server action that logs an idempotent, operator-queued DeletionRequest scoped to the caller, persisted via a new DeletionRequest model — no user data is erased or modified in v1.

## Acceptance Criteria
- An authenticated user calling requestAccountDeletion creates exactly one DeletionRequest row with userId = session user id, status 'pending', requestedAt defaulting to now, and processedAt null.
- The caller is always derived from the injected session/auth context, never from any input argument; there is no parameter that lets a user name another account.
- A second call from the same user while a pending request exists is idempotent: it returns the existing pending request's state, creates no duplicate row, and returns no error.
- An unauthenticated call is rejected with a clear error result and creates no DeletionRequest row.
- The action returns only the caller's own request status (id, status, requestedAt) — never another user's request.
- On creation of a new request, a single log line is emitted at warn (or info) level with the stable prefix "[deletion-request]" containing the request id and userId only; it contains no email, name, or other personal data.
- No User row and no other user-owned data (courses, enrollments, progress, sessions, accounts) is deleted, disabled, or modified by this action; the user can still sign in.
- schema.prisma gains a DeletionRequest model (id, userId, requestedAt @default(now()), status @default("pending"), processedAt DateTime?), a relation to User with a deliberately chosen onDelete behaviour documented in a comment, a uniqueness/idempotency guarantee on the user's pending request, and an index on status for the operator queue.
- A new, additive-only Prisma migration creates the DeletionRequest table, its foreign key, the status index, and the pending-uniqueness constraint; it drops/alters nothing existing and runs clean on top of the init migration.
- Tests use dependency injection with a fake in-memory store (mirroring tests/helpers/fake-reset-store.ts); no Prisma is mocked directly.

## Implementation Plan
### 1. `prisma/schema.prisma`
Add a DeletionRequest model: id String @id @default(cuid()); userId String; requestedAt DateTime @default(now()); status String @default("pending"); processedAt DateTime?; user User @relation(fields: [userId], references: [id], onDelete: Cascade). Add @@index([status]) for the operator queue and a @@unique([userId, status]) (or partial-unique approach documented below) to guarantee one pending request per user. Add a documenting comment: onDelete Cascade chosen deliberately because a DeletionRequest is a request about an account; if the account is already gone there is nothing left to action, so the request is removed with it (contrast with ContentReport which is retained for safeguarding). Also add `deletionRequests DeletionRequest[]` to the User model's relation list. Do NOT touch the Interests model/files from the open #15 PR.
*Lines: Add after the ContentReport model; add relation field inside model User.*

### 2. `prisma/migrations/20261121000000_add_deletion_request/migration.sql`
New additive migration. CREATE TABLE "DeletionRequest" with columns id TEXT PK, userId TEXT NOT NULL, requestedAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, status TEXT NOT NULL DEFAULT 'pending', processedAt TIMESTAMP(3). Add CREATE INDEX "DeletionRequest_status_idx" ON "DeletionRequest"("status"). Add the FK ALTER TABLE ... ADD CONSTRAINT "DeletionRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE. Enforce one pending request per user: since Prisma @@unique([userId,status]) maps to a composite unique index, create CREATE UNIQUE INDEX "DeletionRequest_userId_status_key" ON "DeletionRequest"("userId", "status"). The migration only adds objects; it must not DROP or ALTER any existing table/column.
*Lines: whole file*

### 3. `src/lib/account-deletion.ts`
New pure, DI-friendly core module (mirrors src/lib/password-reset.ts style). Define types: DeletionRequestRecord { id; userId; requestedAt: Date; status: string; processedAt: Date | null }; DeletionRequestStore interface with findPendingByUserId(userId): Promise<DeletionRequestRecord | null> and createPending(userId, now): Promise<DeletionRequestRecord>; RequestDeletionDeps { store; session: { userId: string | null } | null; now?: () => Date; logger?: { warn: (msg: string) => void } }. Export LOG_PREFIX = '[deletion-request]', UNAUTHENTICATED_MESSAGE, and a public shape RequestDeletionResult = { ok: true; request: { id: string; status: string; requestedAt: Date } } | { error: string }. Implement requestAccountDeletion(deps): read caller id strictly from deps.session?.userId; if absent return { error: UNAUTHENTICATED_MESSAGE }. Look up an existing pending request by that userId; if found, return it WITHOUT logging a new line and WITHOUT creating a row (idempotent). Otherwise create a pending row and emit logger.warn(`${LOG_PREFIX} created id=${id} userId=${userId}`) — id and userId only, no email. Return the caller's own request only. Note: the function takes NO per-account input parameter, so another account can never be targeted.
*Lines: whole file*

### 4. `src/lib/deletion-request-store.ts`
New Prisma-backed store implementing DeletionRequestStore, mirroring src/lib/password-reset-store.ts. createPrismaDeletionStore(db): findPendingByUserId -> db.deletionRequest.findFirst({ where: { userId, status: 'pending' }, select: { id, userId, requestedAt, status, processedAt } }); createPending(userId, now) -> db.deletionRequest.create({ data: { userId, requestedAt: now, status: 'pending' } }). Export deletionRequestStore = createPrismaDeletionStore(prisma). Do NOT update/delete any User rows here.
*Lines: whole file*

### 5. `src/lib/actions/account-deletion.ts`
New 'use server' action file (mirrors src/lib/actions/password-reset.ts). Export requestAccountDeletionAction that resolves the caller from the server session via auth() (import { auth } from '@/auth'), builds deps { store: deletionRequestStore, session: { userId: session?.user?.id ?? null } }, and delegates to requestAccountDeletion. It passes NO account identifier from the client. Returns RequestDeletionResult for the UI. Optionally omit the cancel action (see edge cases) to keep scope tight.
*Lines: whole file*

### 6. `tests/helpers/fake-deletion-store.ts`
New in-memory fake mirroring tests/helpers/fake-reset-store.ts semantics. createFakeDeletionStore(seed?: DeletionRequestRecord[]) returns { store, requests }. findPendingByUserId filters requests by userId && status==='pending' and returns a copy. createPending pushes { id: `d${nextId++}`, userId, requestedAt: now, status: 'pending', processedAt: null } and returns a copy. Keep an array so tests can assert row count and absence of user-data mutation (store holds only DeletionRequest rows, never users).
*Lines: whole file*

### 7. `tests/deletion-request-actions.test.ts`
New node:test suite using the fake store and a captured logger. Cases: (1) authenticated user creates a pending request -> result.ok, one row, status pending, userId matches session. (2) second call from same user -> same request id returned, requests.length stays 1, no error. (3) unauthenticated (session null / userId null) -> { error } and requests.length === 0. (4) user B's session never returns or mutates user A's request: seed a pending request for userA, call as userB -> userB gets their own new row, userA's row untouched (same id, status, requestedAt). (5) log assertion: captured warn line starts with '[deletion-request]', includes the request id and userId, and does NOT contain any email string. (6) no user data changed: assert the store exposes no user-mutation surface and that an injected 'users' sentinel (passed but never referenced by the module) is byte-for-byte unchanged after the call.
*Lines: whole file*

## Test Plan
- request created: authenticated user -> { ok: true, request.status === 'pending' }, exactly one row in the fake store, row.userId === session user id, requestedAt set from injected now().
- idempotent second call: same user calls twice -> both return the same request id, store still has exactly one row, neither call returns an error.
- unauthenticated rejected: session null (or session.userId null) -> result has { error } equal to UNAUTHENTICATED_MESSAGE and zero rows created.
- cross-user isolation: a pending request exists for userA; userB makes a request -> userB receives only their own new request, userA's request (id/status/requestedAt) is unchanged and is never returned to userB.
- log line content: the single warn line emitted on creation starts with '[deletion-request]', contains the request id and userId, and contains no email/name; a second idempotent call emits no additional creation log line.
- no user data modified: after the action runs, any user records/sentinel supplied in the test are unchanged, confirming the action only writes to the DeletionRequest store and never touches User.
- migration smoke: applying 20261121000000_add_deletion_request on top of init creates DeletionRequest with the status index, the userId+status unique index, and the FK, and does not alter/drop any pre-existing object.

## Edge Cases