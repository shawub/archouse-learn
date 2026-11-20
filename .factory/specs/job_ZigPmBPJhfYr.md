# Spec: Subscribe and unsubscribe from a teacher

## Summary
Add a Subscription model + migration and dependency-injected subscribe/unsubscribe server actions (session-derived subscriber, target teacher id as input) with full test coverage.

## Acceptance Criteria
- Authenticated user subscribing to another existing user creates a single Subscription row linking subscriberId (from session) and teacherId (from input), returning a success result containing only the teacher id and subscription state.
- The subscriber is always derived from the authenticated session; no subscriber id is ever read from action input. The sole input is the target teacher's user id.
- Subscribing to a teacherId that does not exist returns a clear not-found result (e.g. { error: NOT_FOUND_MESSAGE } / { ok: false, notFound: true }) and never throws or triggers a foreign-key error.
- Self-subscription (teacherId === session user id) is rejected with a clear error result and creates no row.
- Duplicate subscribe is idempotent: it returns the existing subscription state (success) without throwing and without creating a second row.
- Authenticated user unsubscribing removes the matching Subscription row and returns a clear success result.
- Unsubscribe when no subscription exists is a no-op that returns a clear result (success/ok) without throwing.
- Unauthenticated subscribe and unsubscribe are both rejected with a clear unauthenticated/error result and no store mutation.
- Neither action returns any other user's data beyond the target teacher id and the subscription state; no subscriber lists or counts are exposed.
- prisma/schema.prisma gains a Subscription model with subscriberId, teacherId, subscribedAt (default now), @@unique([subscriberId, teacherId]), @@index([teacherId]), @@index([subscriberId]), and both user relations use onDelete: Cascade.
- A new Prisma migration runs clean on a fresh database and on a database containing existing data.
- Tests follow tests/password-reset-actions.test.ts: node:test + dependency injection with a fake subscription store/user store, no Prisma mocks.

## Implementation Plan
### 1. `prisma/schema.prisma`
Add two named relations to the User model's relation block (e.g. `subscriptions Subscription[] @relation("Subscriber")` and `subscribers Subscription[] @relation("Teacher")`) so both sides of the Subscription relations are declared. Do not touch Course.published or any discovery-related fields/files.
*Lines: User model relation section*

### 2. `prisma/schema.prisma`
Add a new Subscription model under the Platform models section: id String @id @default(cuid()); subscriberId String; teacherId String; subscribedAt DateTime @default(now()); subscriber User @relation("Subscriber", fields: [subscriberId], references: [id], onDelete: Cascade); teacher User @relation("Teacher", fields: [teacherId], references: [id], onDelete: Cascade); @@unique([subscriberId, teacherId]); @@index([teacherId]); @@index([subscriberId]).
*Lines: new model near Enrollment/LessonProgress*

### 3. `prisma/migrations/<timestamp>_add_subscription/migration.sql`
Generated migration creating the Subscription table with subscriberId, teacherId, subscribedAt (DEFAULT now/CURRENT_TIMESTAMP), the unique index on (subscriberId, teacherId), the two single-column indexes, and foreign keys to User(id) with ON DELETE CASCADE. Verify it applies on a fresh DB and on one with existing data (additive, no backfill required).
*Lines: new file*

### 4. `src/lib/subscriptions.ts`
New module (mirroring src/lib/password-reset.ts shape) exporting: result message constants (e.g. NOT_FOUND_MESSAGE, SELF_SUBSCRIBE_MESSAGE, UNAUTHENTICATED_MESSAGE); a SubscriptionStore interface abstracting the DB (userExists(id), findSubscription(subscriberId, teacherId), createSubscription(subscriberId, teacherId), deleteSubscription(subscriberId, teacherId)); a SubscribeDeps/UnsubscribeDeps type carrying { store, session (or getSessionUserId), now? }; and subscribe(input: { teacherId }, deps) and unsubscribe(input: { teacherId }, deps) functions implementing the rules below. subscribe: reject if no session user (unauthenticated); reject if teacherId === sessionUserId (self); if target user does not exist return not-found; if an existing subscription is found return it idempotently; otherwise create and return success. unsubscribe: reject if unauthenticated; delete matching row if present, otherwise no-op; return clear success either way. Return shapes expose only teacherId and subscription state — never subscriber lists/counts or other user fields.
*Lines: new file*

### 5. `src/lib/subscriptions-store.ts`
Optional: a Prisma-backed implementation of SubscriptionStore built on `prisma` from src/lib/db.ts (userExists via prisma.user.findUnique select id; findSubscription/createSubscription/deleteSubscription via prisma.subscription using the unique [subscriberId, teacherId]; treat P2002 on create as idempotent duplicate, P2025 on delete as not-subscribed no-op). Keeps Prisma out of src/lib/subscriptions.ts so tests inject a fake store.
*Lines: new file*

### 6. `src/lib/actions/subscriptions.ts`
Thin server-action wrappers ('use server') exporting subscribeAction and unsubscribeAction that resolve the authenticated session user id from auth, build deps with the Prisma-backed store, and delegate to subscribe/unsubscribe. These wrappers hold the session/auth wiring; the testable core stays in src/lib/subscriptions.ts.
*Lines: new file*

### 7. `tests/helpers/fake-subscription-store.ts`
New test helper (mirroring tests/helpers/fake-reset-store.ts) exposing createFakeSubscriptionStore(users, subscriptions?) returning { store, users, subscriptions } backed by in-memory arrays, implementing the SubscriptionStore interface with correct unique/no-op semantics so tests can inspect created/removed rows.
*Lines: new file*

### 8. `tests/subscriptions-actions.test.ts`
New node:test suite using dependency injection and the fake store (no Prisma mocks) covering: subscribe creates a row; duplicate subscribe is idempotent (one row, success); self-subscribe rejected; unknown target returns not-found (no row, no throw); unsubscribe removes the row; unsubscribe-when-not-subscribed is a no-op success; unauthenticated subscribe rejected; unauthenticated unsubscribe rejected; and a privacy assertion that result shapes contain only teacherId + state, no subscriber lists/counts.
*Lines: new file*

## Test Plan
- subscribe: authenticated user A subscribing to existing user B creates exactly one Subscription row with subscriberId=A, teacherId=B and returns a success result.
- subscribe idempotent: calling subscribe twice for the same (A, B) leaves exactly one row and both calls return the same success/existing state without throwing.
- subscribe self: subscribe with teacherId equal to the session user id returns the self-subscription error and creates no row.
- subscribe unknown target: subscribe with a teacherId that is not in the user store returns the not-found result, creates no row, and does not throw a foreign-key error.
- subscribe unauthenticated: subscribe with no session user returns the unauthenticated/error result and mutates nothing.
- unsubscribe: when (A, B) subscription exists, unsubscribe removes it and returns success; the store no longer contains the row.
- unsubscribe not-subscribed: unsubscribe when no (A, B) row exists returns a clear success/no-op without throwing and leaves the store unchanged.
- unsubscribe unauthenticated: unsubscribe with no session user returns the unauthenticated/error result and mutates nothing.
- privacy: inspect returned objects from subscribe/unsubscribe and assert they contain only teacherId and subscription state keys — no subscriber ids of other users, no lists, no counts.
- subscriber-from-session: verify the created row's subscriberId always comes from the injected session, even if the input object carries an unrelated/extra subscriberId-like field.

## Edge Cases
- teacherId === session user id (self-subscription) — reject before any store write.
- teacherId references a non-existent user — must return not-found rather than letting a foreign-key constraint throw; the fake store's userExists and the Prisma store's pre-check (or P2003 handling) must both guard this.
- Duplicate subscribe racing against the unique constraint — Prisma store treats P2002 as an idempotent success returning existing state; fake store short-circuits on existing row.
- Unsubscribe on a non-existent subscription — Prisma store treats P2025 (record to delete not found) as a no-op success; fake store returns no-op.
- Unauthenticated / missing session user id (null/undefined) for both actions — reject uniformly.
- Input carrying extra fields (e.g. an attacker-supplied subscriberId) — ignored; subscriber is always the session user.
- Empty, null, or malformed teacherId input — handled as not-found/validation rather than throwing.
- Cascade delete: deleting a User must remove their Subscription rows on both subscriber and teacher sides (schema onDelete: Cascade), verified conceptually via migration DDL though account erasure is out of scope here.
- Migration must be additive and apply cleanly on a database with existing User/Course data (no backfill, no data loss).