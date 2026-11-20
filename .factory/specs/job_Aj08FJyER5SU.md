# Spec: Publish and unpublish a course

## Summary
Add Course.published field with migration and owner-gated publish/unpublish server actions, tested via dependency injection with a fake course store (no Prisma mocking).

## Acceptance Criteria
- Schema: the Course model gains `published Boolean @default(false)`; a Prisma migration is generated that adds the column with a default of false.
- The migration runs clean on a fresh database and on a database with existing Course rows (existing courses backfill to published = false).
- Existing course queries (getTeacherDashboard, getTeacherCourses, getStudentDashboard, getStudentCourses, getCourseWithProgress) continue to compile and return correctly — the new field is additive and non-breaking.
- An authenticated user who owns a course calls publishCourse(courseId) → that course's `published` becomes `true`.
- An authenticated user who does NOT own the course calls publishCourse(courseId) → rejected (no data change; course remains unchanged).
- An unauthenticated caller calls publishCourse(courseId) → rejected (no data change).
- An authenticated owner calls unpublishCourse(courseId) → that course's `published` becomes `false`.
- An authenticated non-owner calls unpublishCourse(courseId) → rejected (no data change).
- An unauthenticated caller calls unpublishCourse(courseId) → rejected (no data change).
- Ownership is the ONLY permission check: a user with any role (including STUDENT) who owns the course may publish/unpublish it. No teacher-only / role-based gate is added.
- publishCourse / unpublishCourse accept injectable dependencies (session accessor + a course store) following the pattern in src/lib/password-reset.ts, so the logic can be unit-tested without Prisma.
- A thin wired entrypoint composes the real auth() session and a Prisma-backed course store for production use.
- Tests live in tests/course-publish-actions.test.ts, use a fake in-memory course store (tests/helpers/fake-course-store.ts), assert observable data changes rather than internals, and all pass.

## Implementation Plan
### 1. `prisma/schema.prisma`
Add `published Boolean @default(false)` to the Course model (place it alongside the other scalar fields, e.g. after `description`). Do not change Role or other models in this ticket.
*Lines: Course model*

### 2. `prisma/migrations/<timestamp>_add_course_published/migration.sql`
Generate via `prisma migrate dev --name add_course_published`. Resulting SQL adds the column: `ALTER TABLE "Course" ADD COLUMN "published" BOOLEAN NOT NULL DEFAULT false;`. The NOT NULL + DEFAULT false ensures existing rows backfill safely.
*Lines: new file*

### 3. `src/lib/course-publish.ts`
New core module holding the testable publish/unpublish logic. Define: a `CoursePublishStore` interface with `findCourseById(id): Promise<{ id: string; teacherId: string; published: boolean } | null>` and `setPublished(id, published): Promise<void>`; a `CoursePublishSession = { userId: string } | null` type; a `CoursePublishDeps = { getSession: () => Promise<CoursePublishSession>; store: CoursePublishStore }` type. Export `publishCourse(courseId, deps)` and `unpublishCourse(courseId, deps)` plus a shared `setCoursePublished(courseId, published, deps)` helper. Logic: resolve session; if no session/userId → throw new Error('Unauthorized'); load course; if not found → throw new Error('Not found'); if course.teacherId !== session.userId → throw new Error('Forbidden'); else store.setPublished(courseId, published). Ownership is the sole check — no role inspection. Return the updated published state (e.g. { id, published }).
*Lines: new file*

### 4. `src/lib/actions/course.ts`
New server-actions entrypoint. Import prisma, auth, and the core module. Define a Prisma-backed CoursePublishStore (findCourseById via prisma.course.findUnique selecting id/teacherId/published; setPublished via prisma.course.update data { published }). Export async server actions `publishCourse(courseId)` and `unpublishCourse(courseId)` marked 'use server' that call the core functions with deps { getSession: async () => { const s = await auth(); return s?.user?.id ? { userId: s.user.id } : null }, store: prismaCourseStore }.
*Lines: new file*

### 5. `tests/helpers/fake-course-store.ts`
New in-memory CoursePublishStore mirroring Prisma semantics, following tests/helpers/fake-reset-store.ts. Seed from an array of { id, teacherId, published }. Implement findCourseById (return a copy or null) and setPublished (mutate the backing record). Return { store, courses } so tests can assert on observable state.
*Lines: new file*

### 6. `tests/course-publish-actions.test.ts`
New test file following tests/password-reset-actions.test.ts style. A setup() helper builds the fake store with a couple of seeded courses (e.g. owned by 'owner' user, one published false) and a deps builder that lets each test set the session (owner / non-owner / null). Cover all acceptance criteria: owner publish flips to true; non-owner publish rejected + unchanged; unauthenticated publish rejected + unchanged; owner unpublish flips to false; non-owner and unauthenticated unpublish rejected + unchanged; STUDENT-role owner (ownership-only, no role gate) can publish. Assert on fake store's observable `courses` data, not internals.
*Lines: new file*

## Test Plan
- owner publishes own course → store record for that course has published === true
- owner unpublishes own course → store record has published === false
- non-owner publish → rejects (throws Forbidden) and the course's published value is unchanged
- unauthenticated publish (session null) → rejects (throws Unauthorized) and no course changes
- non-owner unpublish → rejects and unchanged
- unauthenticated unpublish → rejects and no course changes
- owner identified only by ownership (userId === teacherId) succeeds regardless of role — no role-based branch is exercised; a seeded owner is enough since role is never read
- publish/unpublish on a non-existent courseId → rejects (Not found) with no store mutation
- idempotence: publishing an already-published course leaves published === true (no error required by criteria, but no corruption)
- typecheck passes: existing teacher/student actions still compile with the new Course.published field present

## Edge Cases
- Unauthenticated session returns null or a session object without user.id — both must be treated as unauthorized.
- courseId that does not exist — must reject with a distinct Not-found error rather than silently succeeding or leaking existence differently from the forbidden case (choose consistent behaviour; Not-found before ownership check is acceptable since non-existence isn't owner-sensitive here).
- Owner has a non-TEACHER role (e.g. STUDENT or ADMIN): must still succeed because the gate is ownership only — guard against accidentally reintroducing a role check.
- Existing Course rows at migration time must receive published = false (NOT NULL DEFAULT false guarantees this on both fresh and populated databases).
- Double publish / double unpublish (idempotent calls) must not throw or corrupt state.
- The new field must not break existing findMany/include queries — it is additive; verify no select clause elsewhere accidentally needs updating.
- Core logic must not import prisma or auth directly (so it stays testable); only the actions/course.ts entrypoint wires the real dependencies.