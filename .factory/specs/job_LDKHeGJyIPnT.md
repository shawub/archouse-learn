# Spec: Subscribe and unsubscribe from a teacher (rerun of ZigPmBPJhfYr)

## Summary
Add user-to-user (teacher-level) subscriptions with subscribe/unsubscribe server actions, a Subscription schema + migration, and DI-based core logic with fake-store tests, rebased on branch factory/job_ZigPmBPJhfYr.

## Acceptance Criteria
- A `Subscription` model exists in prisma/schema.prisma with fields: `id` (cuid), `subscriberId`, `teacherId`, `subscribedAt` (DateTime @default(now()))
- The model has a unique constraint `@@unique([subscriberId, teacherId])`, indexes `@@index([teacherId])` and `@@index([subscriberId])`
- Two relations to `User` (subscriber and teacher), both with `onDelete: Cascade`; the `User` model gains the two matching back-relation fields with distinct relation names
- A new migration under prisma/migrations creates the Subscription table, unique constraint, both indexes, and both cascading foreign keys; it runs clean on a fresh DB and on a DB with existing data (purely additive)
- Core subscribe/unsubscribe logic lives in a dependency-injected module (e.g. src/lib/subscriptions.ts) that takes a store + the authenticated subscriber id and never reads auth or input for the subscriber
- The only external input is the target teacher's user id; the subscriber id always comes from the authenticated session in the action wrapper
- Subscribing to a non-existent user id returns a clear not-found result object (no thrown error, no FK crash)
- Self-subscription (target id === subscriber id) is rejected with a clear result
- Duplicate subscribe is idempotent: returns the existing subscription state without creating a second row and without crashing
- Unsubscribe removes an existing subscription and returns a success result; unsubscribe when not subscribed is a no-op returning a clear result
- The target teacher is not required to have any published courses for subscribe to succeed
- Server actions `subscribeToTeacher` and `unsubscribeFromTeacher` exist (e.g. src/lib/actions/subscriptions.ts), call `auth()`, and reject unauthenticated callers for both actions
- Neither action's result exposes other users' data beyond the target id and subscription state — no subscriber lists, no counts, no emails/names
- A Prisma-backed store implementation (e.g. src/lib/subscription-store.ts) mirrors the fake store semantics
- A fake in-memory store helper under tests/helpers mirrors the Prisma store, following tests/helpers/fake-reset-store.ts
- `pnpm typecheck` passes and all existing tests continue to pass
- No changes to course access/visibility logic, discovery (#18) files, auth.ts, middleware, or password-reset code

## Implementation Plan
### 1. `(git)`
Start from branch factory/job_ZigPmBPJhfYr (the implementation that passed QA) and rebase it onto current main. If discovery (#18) has merged, resolve conflicts in its favour without modifying its files (e.g. src/lib/public-teachers.ts, teacher discovery actions).

### 2. `prisma/schema.prisma`
Add a `Subscription` model: id String @id @default(cuid()); subscriberId String; teacherId String; subscribedAt DateTime @default(now()); subscriber User @relation("UserSubscriptions", fields:[subscriberId], references:[id], onDelete: Cascade); teacher User @relation("UserSubscribers", fields:[teacherId], references:[id], onDelete: Cascade); @@unique([subscriberId, teacherId]); @@index([teacherId]); @@index([subscriberId]). Add two back-relation fields to `User`: `subscriptions Subscription[] @relation("UserSubscriptions")` and `subscribers Subscription[] @relation("UserSubscribers")`. Do not touch any course access/visibility fields.
*Lines: User model relations block; new model after existing platform models*

### 3. `prisma/migrations/<timestamp>_add_subscription/migration.sql`
New migration: CREATE TABLE "Subscription" with id (PK), subscriberId, teacherId, subscribedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP; CREATE UNIQUE INDEX on (subscriberId, teacherId); CREATE INDEX on (teacherId); CREATE INDEX on (subscriberId); ADD FOREIGN KEY subscriberId -> User(id) ON DELETE CASCADE ON UPDATE CASCADE; ADD FOREIGN KEY teacherId -> User(id) ON DELETE CASCADE ON UPDATE CASCADE. Purely additive so it applies cleanly to fresh and existing databases.

### 4. `src/lib/subscriptions.ts`
New DI core module. Define types: SubscriptionStore { userExists(id): Promise<boolean>; findSubscription(subscriberId, teacherId): Promise<{ teacherId: string; subscribedAt: Date } | null>; createSubscription(subscriberId, teacherId): Promise<{ teacherId: string; subscribedAt: Date }>; deleteSubscription(subscriberId, teacherId): Promise<boolean> }. Export SubscribeResult / UnsubscribeResult discriminated unions and result constants. Implement `subscribe(subscriberId, teacherId, { store })`: reject self-subscribe; if target user does not exist return not-found; if existing subscription return it idempotently; otherwise create and return state. Guard the create against unique-constraint races by catching and re-reading. Implement `unsubscribe(subscriberId, teacherId, { store })`: delete if present (success) else no-op result. Expose only { teacherId, subscribed, subscribedAt? } in results — no other user data.

### 5. `src/lib/subscription-store.ts`
New Prisma-backed store mirroring fake-store semantics, following src/lib/password-reset-store.ts. `createPrismaSubscriptionStore(db)` with userExists via prisma.user.findUnique select id; findSubscription via findUnique on composite unique select { teacherId, subscribedAt }; createSubscription via create; deleteSubscription via deleteMany returning count>0. Export `subscriptionStore = createPrismaSubscriptionStore(prisma)`.

### 6. `src/lib/actions/subscriptions.ts`
New 'use server' module. `subscribeToTeacher(teacherId: string)`: const session = await auth(); if (!session?.user) throw/return Unauthorized; call subscribe(session.user.id, teacherId, { store: subscriptionStore }); return result. `unsubscribeFromTeacher(teacherId: string)`: same auth guard, call unsubscribe(session.user.id, teacherId, { store }). Subscriber id always from session, teacherId is the only input.

### 7. `tests/helpers/fake-subscription-store.ts`
New in-memory fake store mirroring the Prisma store, following tests/helpers/fake-reset-store.ts. Seeded with a list of user ids; tracks subscription rows; enforces the composite-unique semantics; returns { store, users, subscriptions }.

### 8. `tests/subscription-actions.test.ts`
New test file following tests/password-reset-actions.test.ts style (node:test, DI, no Prisma mocks). Cover: subscribe success returns subscribed state; duplicate subscribe is idempotent (same state, one row); self-subscribe rejected; unknown target returns not-found; target without published courses still subscribes; unsubscribe removes and returns success; unsubscribe-when-not-subscribed is a no-op result; privacy (result contains only target id + state). For action-level unauthenticated rejection, test the core via a thin wrapper or document that the action throws Unauthorized when auth() returns null.

## Test Plan
- subscribe(subscriber, teacher) with an existing target returns { teacherId, subscribed: true, subscribedAt } and creates exactly one row
- calling subscribe twice for the same pair returns the same subscription state and leaves exactly one row (idempotent)
- subscribe(user, user) is rejected with a clear self-subscription result and creates no row
- subscribe to an id not present in the store returns a not-found result (no throw, no FK error) and creates no row
- subscribe succeeds when the target has no published courses (store models a user with zero courses)
- unsubscribe for an existing subscription removes it and returns a success result
- unsubscribe when no subscription exists returns a no-op result and does not throw
- subscribe/unsubscribe results contain only the target teacher id and subscription state — no names, emails, counts, or subscriber lists
- subscribeToTeacher / unsubscribeFromTeacher reject when auth() returns null (unauthenticated) for both actions
- a concurrent/duplicate create that hits the unique constraint is caught and resolved to the existing subscription state
- pnpm typecheck passes with the new Subscription model and generated client types
- existing test suite (password-reset etc.) still passes unchanged

## Edge Cases
- Target user id does not exist — must return not-found before any create to avoid a foreign-key crash
- Self-subscription where teacherId equals the session subscriber id
- Duplicate subscribe racing against the unique constraint — catch the Prisma unique-violation and re-read to return existing state idempotently
- Unsubscribe when not subscribed — deleteMany returns count 0, treat as a clean no-op
- Unauthenticated session (auth() returns null) for both subscribe and unsubscribe
- Empty/whitespace/null teacherId input — validate and return a clear invalid/not-found result rather than throwing
- User deletion later cascades subscriptions (verified by onDelete: Cascade on both FKs) — migration must declare both cascades
- Migration must be additive and apply cleanly on a database that already contains users, courses and existing data
- Discovery (#18) merge conflicts — resolve without altering discovery files; keep the public/unauthenticated teacher actions unchanged
- Privacy leak risk — ensure store select clauses and result shapes never return other users' names, emails, subscriber lists, or counts