# Spec: Report content

## Summary
Add a ContentReport model + migration and a tested, DI-based report-content server action that lets authenticated users report a course or lesson into an operator review queue (no automated takedown in v1).

## Acceptance Criteria
- New file src/lib/report-content.ts exports a pure core function reportContent(input, deps) plus its types (ReportContentDeps, ReportContentStore, ReportContentResult, ReportContentInput), with no direct Prisma/auth imports — all effects go through injected deps, mirroring src/lib/password-reset.ts and src/lib/course-publish.ts.
- A thin server-action wrapper src/lib/actions/report.ts ('use server') wires the core to prisma + auth() + the shared rate limiter, exposing reportContent(input) for the app, mirroring src/lib/actions/course.ts.
- The reporter id is ALWAYS taken from deps.getSession() (session), never from input; ReportContentInput is exactly { contentType, contentId, reason, category? } — it carries no reporterId.
- Unauthenticated call (getSession returns null) returns { error: <UNAUTHENTICATED_MESSAGE> } and creates no report.
- contentType is validated against the literal union 'course' | 'lesson'; any other value returns { error: <INVALID_CONTENT_TYPE_MESSAGE> } and creates no report.
- Reporting an existing course creates a report with contentType 'course', the given contentId, trimmed reason, status 'open', and reporterId from the session; returns { success: true, reportId, status: 'open' }.
- Reporting an existing lesson creates a report with contentType 'lesson' and the lesson's id; ownership is resolved via the lesson's course teacherId.
- Unknown content (course id or lesson id not found) returns a clear { error: <NOT_FOUND_MESSAGE> } result — never a thrown error or leaked internal detail — and creates no report.
- Owner self-report is rejected: for a course the owner is course.teacherId; for a lesson the owner is the teacherId of its parent course. If the session user is the owner, return { error: <OWN_CONTENT_MESSAGE> } and create no report.
- reason is required, trimmed before validation and storage; empty/whitespace-only reason returns a validation error; reason longer than MAX_REASON_LENGTH (1000) characters returns a validation error. Both happen before any store write.
- reason is stored as plain text and the action never returns or renders it as HTML; the result object does not echo other users' reasons or identities.
- Optional category: an enum 'inappropriate' | 'safeguarding' | 'spam' | 'copyright' | 'other'; when provided it is validated and stored, when omitted it defaults to 'other'. Free-text reason remains required regardless of category.
- Duplicate reports by the same reporter for the same (contentType, contentId) are handled idempotently: instead of creating a second row, the existing report's reason/category/updatedAt are updated and its existing id/status returned (no unbounded duplicate rows).
- Per-user rate limiting reuses createRateLimiter from @/lib/rate-limit keyed by reporter id; exceeding the limit returns { error: <RATE_LIMITED_MESSAGE> } and creates no report. Rate-limit check happens after auth but before store writes.
- Privacy: the result exposes only the current reporter's own report status (reportId + status), never other reports, counts, or reporter identities.
- On creating a NEW report the action logs at info level (console.info) a message containing the report id, contentType and contentId, and NOT the reason text nor the reporter's email/identity.
- prisma/schema.prisma adds a ContentReport model with fields: id, reporterId (nullable), contentId, contentType, category, reason (@db.Text), status (default 'open'), createdAt (default now()), updatedAt (@updatedAt); a @@unique([reporterId, contentType, contentId]) to enforce idempotency; @@index([contentType, contentId]) and @@index([status]); and a reporter relation to User with onDelete: SetNull (report retained for safeguarding, reporter nulled). User gains the back-relation contentReports ContentReport[].
- A new migration under prisma/migrations/<timestamp>_add_content_report/migration.sql creates the ContentReport table, indexes, unique constraint and the SetNull FK; it runs clean on a fresh DB and on an existing DB (CREATE TABLE only — no destructive changes to existing tables). It does not touch Subscription (#14) or discovery (#18) files.
- tests/report-content.test.ts follows tests/password-reset-actions.test.ts: node:test + node:assert/strict, dependency injection via a fake in-memory store (new tests/helpers/fake-report-store.ts), no Prisma mocks, importing the core function from @/lib/report-content.

## Implementation Plan
### 1. `prisma/schema.prisma`
Add a ContentReport model after the LessonProgress model: id String @id @default(cuid()); reporterId String?; contentId String; contentType String; category String @default("other"); reason String @db.Text; status String @default("open"); createdAt DateTime @default(now()); updatedAt DateTime @updatedAt; reporter User? @relation("UserContentReports", fields: [reporterId], references: [id], onDelete: SetNull); @@unique([reporterId, contentType, contentId]); @@index([contentType, contentId]); @@index([status]). Document the SetNull choice in a comment: report retained for safeguarding, reporter nulled on user deletion. Keep contentType/category/status as String columns (values validated in app code) so no new Prisma enums are introduced.
*Lines: after model LessonProgress*

### 2. `prisma/schema.prisma`
On model User add the back-relation: contentReports ContentReport[] @relation("UserContentReports"). Do not modify Subscription/Interest relations owned by other open PRs.
*Lines: User relations block*

### 3. `prisma/migrations/20261121000000_add_content_report/migration.sql`
New migration: CREATE TABLE "ContentReport" with columns id, reporterId (nullable), contentId, contentType, category (DEFAULT 'other'), reason, status (DEFAULT 'open'), createdAt (DEFAULT CURRENT_TIMESTAMP), updatedAt, PK on id; CREATE UNIQUE INDEX on (reporterId, contentType, contentId); CREATE INDEX on (contentType, contentId); CREATE INDEX on (status); ALTER TABLE ADD CONSTRAINT FK reporterId -> User(id) ON DELETE SET NULL ON UPDATE CASCADE. Only additive DDL so it applies cleanly to fresh and existing databases.
*Lines: new file*

### 4. `src/lib/report-content.ts`
New pure core module. Export constants: MAX_REASON_LENGTH = 1000; message constants UNAUTHENTICATED_MESSAGE, INVALID_CONTENT_TYPE_MESSAGE, NOT_FOUND_MESSAGE, OWN_CONTENT_MESSAGE, RATE_LIMITED_MESSAGE, EMPTY_REASON_MESSAGE, REASON_TOO_LONG_MESSAGE; RATE_LIMIT config (limit/window). Export types: ContentType = 'course' | 'lesson'; ReportCategory union; ReportContentInput = { contentType; contentId; reason; category? }; ReportContentResult = { success: true; reportId: string; status: string } | { error: string }; ReportContentStore interface with findCourseOwner(id) -> { teacherId } | null, findLessonOwner(id) -> { teacherId } | null, findExistingReport(reporterId, contentType, contentId) -> { id; status } | null, createReport(data) -> { id; status }, updateReport(id, { reason; category }) -> { id; status }; ReportContentDeps = { getSession: () => Promise<{ userId: string } | null>; store: ReportContentStore; checkRateLimit: (key, limit, windowMs) => boolean; now?: () => Date; logger?: { info: (msg) => void } }. Implement reportContent(input, deps): (1) session check -> UNAUTHENTICATED; (2) validate contentType in allowed set -> INVALID_CONTENT_TYPE; (3) validate/trim reason (empty -> EMPTY_REASON, >MAX -> REASON_TOO_LONG); (4) validate category (default 'other', unknown -> treat as validation error or coerce to 'other' — choose reject); (5) rate-limit by reporter id -> RATE_LIMITED; (6) resolve owner via findCourseOwner/findLessonOwner -> null => NOT_FOUND; (7) if owner.teacherId === session.userId -> OWN_CONTENT; (8) findExistingReport -> if found, updateReport (idempotent) and return its id/status WITHOUT logging a new report; else createReport, log info with reportId/contentType/contentId (no reason, no email) and return. Use a zod schema internally for input validation. Never throw on not-found/validation — return error results.
*Lines: new file*

### 5. `src/lib/actions/report.ts`
New 'use server' wrapper mirroring src/lib/actions/course.ts: build prismaReportStore implementing ReportContentStore via prisma (course.findUnique select teacherId; lesson.findUnique select course.teacherId; contentReport.findUnique on the composite unique; contentReport.create; contentReport.update). Build deps = { getSession: () => auth() -> { userId } | null, store, checkRateLimit: createRateLimiter().checkRateLimit, logger: { info: console.info } } using the module-level shared limiter. Export async function reportContent(input: ReportContentInput) { return reportContentCore(input, deps) }.
*Lines: new file*

### 6. `tests/helpers/fake-report-store.ts`
New in-memory ReportContentStore mirroring Prisma semantics: seed with courses [{id, teacherId}] and lessons [{id, teacherId}]; keep reports array with nextId counter. findCourseOwner/findLessonOwner look up seeds; findExistingReport matches reporterId+contentType+contentId; createReport pushes { id: `r${n}`, status: 'open', ... } and returns id/status; updateReport mutates reason/category and returns existing id/status. Export factory createFakeReportStore({ courses, lessons }) returning { store, reports, courses, lessons }.
*Lines: new file*

### 7. `tests/report-content.test.ts`
New test file following tests/password-reset-actions.test.ts structure: a setup() builds the fake store (owner 'teacher1'), a real createRateLimiter(), and deps with getSession returning a configurable user and a logger capturing infos. Cover: report course (record shape + success), report lesson (contentType 'lesson', owner via course), owner rejected (course and lesson), unknown content (bad course id, bad lesson id), invalid contentType, empty reason, whitespace-only reason, too-long reason (MAX+1), duplicate report updates existing row and does not create a second (assert reports.length stays 1 and no second info log), rate limit (loop to limit then blocked), unauthenticated (getSession null). Also assert the info log on new report includes reportId/contentType/contentId and excludes the reason text and reporter email.
*Lines: new file*

## Test Plan

## Edge Cases