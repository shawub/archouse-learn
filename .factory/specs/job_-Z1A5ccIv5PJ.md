# Spec: Discover teachers and view public profiles

## Summary
Add two public, unauthenticated server actions — discoverTeachers (filter-based) and getPublicTeacherProfile — with strict field whitelisting via explicit Prisma selects, following the dependency-injection + fake-store pattern.

## Acceptance Criteria
- discoverTeachers with subject and/or keyStage filters returns only teachers who have at least one published course matching all supplied filters; filters are ANDed and applied against published courses only.
- discoverTeachers with no filters returns all teachers who have at least one published course.
- Unpublished courses never contribute to discovery results and never appear in any returned course list.
- getPublicTeacherProfile returns the teacher's display name and id plus their published courses (whitelisted course fields only) without requiring an authenticated session.
- getPublicTeacherProfile returns a clear not-found result (not a thrown error / leak) when the teacher id is unknown or the user exists but has no published courses are still surfaced as profile-not-visible per decision below.
- Neither action calls auth()/getSession; both are callable with no session present.
- Returned objects for both actions contain ONLY whitelisted fields: teacher { id, name } and course { id, title, subject, keyStage, lessonCount }. No email, role, passwordHash, accounts, sessions, subscriber lists, subscriber counts, or learner progress appear anywhere in the returned shape.
- Results use a stable deterministic order: teachers ordered by name (nulls last) then id; courses ordered by title then id. No ranking/scoring.
- Core logic is pure and injectable (store passed as a dependency); a fake in-memory store mirrors Prisma semantics and is used in tests — Prisma is not mocked.
- The Prisma-wired store uses explicit `select` (never `include` of whole records) so only whitelisted columns are fetched.

## Implementation Plan
### 1. `src/lib/public-teachers.ts`
New core module (no 'use server', no Prisma, no auth import). Define whitelisted DTO types: PublicCourse = { id, title, subject, keyStage, lessonCount: number }; PublicTeacher = { id, name: string | null }; PublicTeacherProfile = PublicTeacher & { courses: PublicCourse[] }. Define DiscoverFilters = { subject?: Subject; keyStage?: KeyStage }. Define PublicTeacherStore interface with two narrow methods that already return only whitelisted fields: findTeachersWithPublishedCourses(filters): Promise<PublicTeacher[]> and getPublicProfile(teacherId): Promise<PublicTeacherProfile | null>. Export discoverTeachers(filters, deps) and getPublicTeacherProfile(teacherId, deps) that call the store, apply stable deterministic sorting (teachers by name then id; courses by title then id) defensively, and map to the DTOs. getPublicTeacherProfile returns { found: false } when store returns null and { found: true, profile } otherwise, so unknown ids are a value not an exception. Import Subject/KeyStage types from @prisma/client only as types.
*Lines: new file*

### 2. `src/lib/actions/teacher.ts`
Add 'use server'-compatible wired exports at module level (file already has server-action functions). Build a prismaPublicTeacherStore implementing PublicTeacherStore using EXPLICIT selects only. findTeachersWithPublishedCourses: prisma.user.findMany({ where: { createdCourses: { some: { published: true, ...(subject ? { subject } : {}), ...(keyStage ? { keyStage } : {}) } } }, select: { id: true, name: true }, orderBy: [{ name: 'asc' }, { id: 'asc' }] }). getPublicProfile: prisma.user.findUnique({ where: { id }, select: { id: true, name: true, createdCourses: { where: { published: true }, select: { id: true, title: true, subject: true, keyStage: true, _count: { select: { lessons: true } } }, orderBy: [{ title: 'asc' }, { id: 'asc' }] } } }) then map _count.lessons -> lessonCount and project to the DTO (return null if user not found). Export async discoverTeachers(filters) and getPublicTeacherProfile(teacherId) that delegate to the core functions with { store: prismaPublicTeacherStore }. These exports must NOT call auth(). Note: existing authenticated functions in this file are unchanged.
*Lines: append new exports; no changes to existing functions*

### 3. `tests/helpers/fake-public-teacher-store.ts`
New test helper: createFakePublicTeacherStore(seed) where seed is an array of teachers each with { id, name, email?, role?, passwordHash?, courses: Array<{ id, title, subject, keyStage, published, lessonCount, subscriberCount?, progress? }> }. Implement PublicTeacherStore so it mirrors the Prisma selects exactly — findTeachersWithPublishedCourses filters to teachers with >=1 published course matching supplied filters and returns ONLY { id, name }; getPublicProfile returns ONLY { id, name, courses: published-courses-mapped-to {id,title,subject,keyStage,lessonCount} } or null for unknown id. The helper deliberately holds sensitive fields (email/role/passwordHash/subscriberCount/progress) in the seed but must never surface them, so tests can assert the leak-prevention boundary.
*Lines: new file*

### 4. `tests/public-teachers.test.ts`
New test file mirroring tests/password-reset-actions.test.ts style (node:test, assert/strict, DI via fake store). Cover: filter AND semantics; no-filter returns all teachers with >=1 published course; teachers with only unpublished courses excluded; unpublished courses absent from profile course lists; getPublicTeacherProfile returns name + published courses with lessonCount; unknown id returns { found: false }; deterministic ordering (teachers by name then id, courses by title then id); and a shape-assertion test that deep-inspects every returned object key set to prove no email/role/passwordHash/subscriberCount/progress/accounts/sessions fields are present. Confirm callable with no session (the functions take no session dependency).
*Lines: new file*

## Test Plan
- discoverTeachers({ subject: 'MATHS', keyStage: 'KS2' }) returns only teachers having a published MATHS/KS2 course; a teacher whose only MATHS course is KS3 is excluded (filters ANDed).
- discoverTeachers({}) returns every teacher with >=1 published course and excludes teachers with zero published courses.
- A teacher whose MATHS/KS2 course is unpublished is excluded from discoverTeachers({ subject: 'MATHS', keyStage: 'KS2' }).
- getPublicTeacherProfile(knownId) returns { found: true, profile: { id, name, courses } } where courses contains only published courses, each with { id, title, subject, keyStage, lessonCount }.
- getPublicTeacherProfile includes a teacher's published course and excludes their unpublished course in the returned courses array.
- getPublicTeacherProfile(unknownId) returns { found: false } and does not throw.
- Ordering: discoverTeachers returns teachers sorted by name then id; profile.courses sorted by title then id — assert exact array order against a seed designed to require sorting.
- Shape/leak test: for both actions, assert Object.keys of every teacher object === ['id','name'] (profile adds 'courses') and every course object's keys === ['id','title','subject','keyStage','lessonCount']; assert no key named email, role, passwordHash, accounts, sessions, subscribers, subscriberCount, subscriptions, enrollments, progress, or lessonProgress appears anywhere in the JSON-stringified result.
- No-session test: both actions resolve successfully when invoked with only the fake store and no session/auth provided.

## Edge Cases
- Teacher with name = null: must still be returned (name: null) and sorted deterministically (nulls ordered consistently, e.g. last) without crashing.
- Teacher exists but has zero published courses: excluded from discoverTeachers; for getPublicTeacherProfile decide and document — return { found: true, profile: { id, name, courses: [] } } (profile is public even with empty catalogue) OR { found: false }; recommend { found: true, courses: [] } to match 'view profile' AC, but ensure no sensitive data leaks either way.
- Unknown teacher id: return a not-found value, never throw an error that could leak internal detail.
- Filters supplied with only subject or only keyStage: apply just that filter; empty/undefined filters apply none.
- Course with zero lessons: lessonCount must be 0, not undefined, and the course still appears.
- Deduplication: a teacher with multiple matching published courses appears exactly once in discoverTeachers results.
- Ensure the Prisma query uses explicit `select` end-to-end (including nested createdCourses and _count) so sensitive columns are never fetched, not merely dropped after fetch.
- Invalid/unknown enum values passed as filters should produce no matches rather than an error leak (validate or treat as no-match).