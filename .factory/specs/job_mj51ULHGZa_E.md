# Spec: Declare and update Interests (#15, recreated after gate expiry)

## Summary
Add a UserInterest model and a dependency-injected server-actions layer that lets an authenticated user set/replace/clear their own subject+KeyStage discovery Interests atomically, plus a read of their own interests.

## Acceptance Criteria
- An authenticated user calls the update action with a list of {subject, keyStage} pairs; after it returns, the UserInterest rows for that user exactly match the (validated, de-duplicated) input and all prior interests for that user have been removed.
- Calling the update action with an empty list clears all of the caller's interests; no UserInterest rows remain for that user.
- An unauthenticated call to either the update or read action is rejected with an unauthenticated result and mutates nothing.
- The user whose interests are written is always taken from the session; no caller-supplied userId is ever honoured. One user's update never touches another user's rows.
- Every subject and keyStage value in the input is validated against the existing Subject and KeyStage Prisma enums; any unknown value causes the whole update to be rejected with a validation error and no rows are changed.
- Duplicate {subject, keyStage} pairs in the input are collapsed to a single row before writing.
- Input size is capped at the number of valid Subject x KeyStage combinations (11 x 4 = 44); input exceeding the cap is rejected with a validation error and no rows are changed.
- The replace is performed as a deleteMany followed by createMany inside a single transaction; if the create fails, the transaction rolls back and the caller's previous interest set is left exactly intact.
- A read action returns the caller's own current interests as a list of {subject, keyStage} pairs.
- prisma/schema.prisma declares a UserInterest model with userId, subject (Subject enum), keyStage (KeyStage enum), a unique constraint on [userId, subject, keyStage], a user relation with onDelete: Cascade, and a @@index([userId]) (added because the leading column of the unique index already covers userId, the index is added explicitly only if the unique constraint does not; include it to be safe and match the Subscription precedent). The existing Subject and KeyStage enums are reused unchanged.
- A new, additive-only Prisma migration creates the UserInterest table, its unique index, its userId index, and the Cascade foreign key; it drops/alters nothing. The migration applies clean on top of current main.
- All listed test cases pass against the fake store without mocking Prisma directly.
- No files owned by #14 (subscriptions), #16 (content reports) or #18 (discovery) are edited beyond reusing the Subject/KeyStage enums already in the shared schema.

## Implementation Plan
### 1. `prisma/schema.prisma`
Add a UserInterest model: id String @id @default(cuid()); userId String; subject Subject; keyStage KeyStage; user User @relation(fields: [userId], references: [id], onDelete: Cascade); @@unique([userId, subject, keyStage]); @@index([userId]). Add `interests UserInterest[]` to the User model's relation list. Do NOT add or modify the Subject or KeyStage enums (reuse the existing ones). Touch nothing owned by #14/#16/#18 beyond this additive relation field on User.
*Lines: User model + new model after KeyStage enum*

### 2. `prisma/migrations/20261121000000_add_user_interest/migration.sql`
New additive migration. CREATE TABLE "UserInterest" (id TEXT PK, userId TEXT NOT NULL, subject "Subject" NOT NULL, keyStage "KeyStage" NOT NULL). CREATE UNIQUE INDEX "UserInterest_userId_subject_keyStage_key". CREATE INDEX "UserInterest_userId_idx". ALTER TABLE ... ADD CONSTRAINT "UserInterest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE. No DROP or ALTER of existing objects. Mirror the structure of 20261120000200_add_subscription/migration.sql.
*Lines: new file*

### 3. `src/lib/interests.ts`
Core, framework-free module (mirrors src/lib/subscriptions.ts pattern). Export: type Interest = { subject: Subject; keyStage: KeyStage }; type InterestSession = { userId: string } | null; interface InterestStore { replaceInterests(userId: string, interests: Interest[]): Promise<void> (delete+create in one transaction); listInterests(userId: string): Promise<Interest[]> }; interface InterestDeps { store: InterestStore; getSession: () => Promise<InterestSession> }. Export constants UNAUTHENTICATED_MESSAGE and INVALID_INTEREST_MESSAGE, and MAX_INTERESTS (= number of Subject x KeyStage combinations, derived from the enum members, i.e. Object.keys(Subject).length * Object.keys(KeyStage).length). Export validateInterests(input): a parser that (a) rejects non-array/non-object input, (b) rejects unknown subject/keyStage values against the Subject/KeyStage enum sets, (c) rejects inputs exceeding MAX_INTERESTS, (d) de-duplicates pairs. Export updateInterests(input, deps): resolve session -> if null return {ok:false, reason:'unauthenticated', error:UNAUTHENTICATED_MESSAGE}; validate -> on failure return {ok:false, reason:'invalid', error:INVALID_INTEREST_MESSAGE}; else store.replaceInterests(session.userId, cleaned) and return {ok:true, interests: cleaned}. Export getMyInterests(deps): session -> if null return {ok:false, reason:'unauthenticated', error:UNAUTHENTICATED_MESSAGE}; else return {ok:true, interests: await store.listInterests(session.userId)}. userId is ALWAYS session.userId; never read any userId from input.
*Lines: new file*

### 4. `src/lib/interest-store.ts`
Prisma-backed InterestStore (mirrors src/lib/subscription-store.ts). createPrismaInterestStore(db) where db: PrismaClient | Prisma.TransactionClient. listInterests(userId): db.userInterest.findMany({ where: { userId }, select: { subject: true, keyStage: true }, orderBy: [{ subject: 'asc' }, { keyStage: 'asc' }] }). replaceInterests(userId, interests): prisma.$transaction(async tx => { await tx.userInterest.deleteMany({ where: { userId } }); if (interests.length) await tx.userInterest.createMany({ data: interests.map(i => ({ userId, subject: i.subject, keyStage: i.keyStage })) }) }). Export interestStore = createPrismaInterestStore(prisma).
*Lines: new file*

### 5. `src/lib/actions/interests.ts`
'use server' thin wrapper (mirrors src/lib/actions/subscriptions.ts). Build deps = { getSession: async () => { const s = await auth(); return s?.user?.id ? { userId: s.user.id } : null }, store: interestStore }. Export async updateInterests(input) => updateInterestsCore(input, deps) and async getMyInterests() => getMyInterestsCore(deps). No userId parameter is exposed.
*Lines: new file*

### 6. `tests/helpers/fake-interest-store.ts`
In-memory InterestStore mirroring Prisma semantics (mirrors tests/helpers/fake-subscription-store.ts). createFakeInterestStore(initialRows?) holding an array of { userId, subject, keyStage }. listInterests(userId) returns a sorted copy of that user's rows. replaceInterests(userId, interests) emulates the transaction: build the next-state array (other users' rows unchanged + the new rows), and only if a caller-injectable `failCreate` flag is set, throw BEFORE committing so the original array is untouched (models rollback). Expose the backing rows array and a way to toggle the failure so the 'failure mid-replace leaves old set intact' test can be written.
*Lines: new file*

### 7. `tests/interests-actions.test.ts`
node:test suite using the fake store and an `as(session)` helper that returns { store, getSession: async () => session } (mirrors subscription-actions.test.ts). Cover every listed test case.
*Lines: new file*

## Test Plan
- set interests: authenticated user updates with [{MATHS,KS3},{ENGLISH,KS2}] -> ok:true, store holds exactly those two rows for that user.
- replace interests: user with existing [{MATHS,KS3}] updates to [{SCIENCE,KS4}] -> only {SCIENCE,KS4} remains; the old {MATHS,KS3} row is gone.
- empty clears all: user with existing rows updates with [] -> ok:true and no rows remain for that user.
- duplicates removed: update with [{MATHS,KS3},{MATHS,KS3},{ENGLISH,KS2}] -> store holds exactly two rows ({MATHS,KS3},{ENGLISH,KS2}).
- invalid enum rejected: update with [{subject:'BIOLOGY',keyStage:'KS3'}] and with [{subject:'MATHS',keyStage:'KS9'}] -> {ok:false, reason:'invalid'} and no rows changed.
- cap enforced: update with MAX_INTERESTS+1 pairs -> {ok:false, reason:'invalid'} and no rows changed; update with exactly MAX_INTERESTS valid pairs succeeds.
- unauthenticated update rejected: session null -> {ok:false, reason:'unauthenticated'} and store unchanged.
- unauthenticated read rejected: getMyInterests with null session -> {ok:false, reason:'unauthenticated'}.
- failure mid-replace leaves old set intact: user has [{MATHS,KS3}]; with the fake store's failCreate enabled, update to [{SCIENCE,KS4}] throws/returns failure and the user's rows are still exactly [{MATHS,KS3}].
- cross-user isolation: alice has [{MATHS,KS3}], bob has [{ENGLISH,KS2}]; alice updates to [{SCIENCE,KS4}] -> bob's [{ENGLISH,KS2}] is unchanged.
- user from session only: an input object smuggling a userId field is ignored; rows are written under session.userId, and getMyInterests returns only the session user's rows.
- read returns caller's own interests: after setting, getMyInterests returns the same (sorted) pairs.

## Edge Cases