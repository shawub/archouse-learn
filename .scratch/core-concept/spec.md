Status: ready-for-agent
Category: enhancement

## Parent

[core-concept map](./map.md)

---

# archouse learn — Core Concept Spec

## Problem Statement

The existing archouse learn platform uses a school-assignment model: a teacher creates courses, creates an assignment for a cohort, and students enrol in that assignment. This model is closed and institution-scoped. Learners cannot discover teachers or content independently; teachers cannot share knowledge with learners outside their immediate school context. The platform does not reflect how learning actually happens — often self-directed, interest-driven, and not bounded by a single institution or assignment.

The result: a tool that replicates the constraints of the classroom without offering the freedoms of the web.

## Solution

Replace the assignment model with a **publish + subscribe** model. Any user can publish courses (acting as a teacher), subscribe to other teachers (acting as a learner), or do both simultaneously — these are non-exclusive capabilities, not a fixed identity. Teachers have public profiles discoverable by anyone; learners find teachers by browsing subject and KeyStage using their declared Interests.

Safeguarding is platform-level: universal child-safe defaults for all accounts, a content reporting and removal capability, and no direct messaging between users.

v1 delivers the publish + subscribe core. Two further interaction modes — lesson Q&A / content requests, and live seminars — are designed into the spec so that v1 cannot accidentally foreclose them, but their implementation is deferred.

## User Stories

### Discovery and sign-up

1. As a visitor (not logged in), I want to browse the platform and view teacher profiles so that I can decide whether to register.
2. As a visitor, I want to see a teacher's published courses (title, subject, KeyStage, lesson count) on their profile so that I can assess their content before signing up.
3. As a new user, I want to register with an email and password so that I have an account.
4. As a new user, I want to select the subjects and KeyStages I am interested in learning during sign-up so that the teacher discovery is filtered to relevant content.
5. As a user, I want to update my subject and KeyStage Interests at any time so that my discovery reflects my current learning goals.
6. As a user, I want to search and browse teachers by subject and KeyStage so that I can find relevant content.
7. As a user, I want my learner activity (subscriptions, progress) to be private by default so that other users cannot see it.

### Publishing (teacher capability)

8. As a user, I want to create a course (title, description, subject, KeyStage) so that I can organise lessons for learners.
9. As a user, I want to add, edit, reorder, and remove lessons within a course so that I can shape the learning journey.
10. As a user, I want to publish a course so that it becomes discoverable and accessible to my subscribers.
11. As a user, I want to unpublish a course so that it is no longer discoverable to new learners.
12. As a user, I want all my published courses to appear on my public profile so that potential subscribers can see my catalogue.
13. As a user, I want my unpublished courses to be visible only to me so that works-in-progress are not shown publicly.

### Subscribing (learner capability)

14. As a user, I want to subscribe to a teacher so that I gain immediate access to all their published courses.
15. As a user, I want to unsubscribe from a teacher so that I no longer have access to their courses.
16. As a user, I want to browse and work through lessons in a course I have access to so that I can learn at my own pace.
17. As a user, I want my lesson completion progress to be tracked so that I can see where I am in a course.
18. As a user, I want to see all teachers I subscribe to in one place so that I can navigate to their content easily.

### Safeguarding and moderation

19. As a user, I want to report a course or lesson so that the platform can review harmful or inappropriate content.
20. As a platform operator, I want to remove reported content and suspend the responsible account so that the platform remains safe.
21. As a user, I want to request deletion of my account and data so that my information is erased from the platform.

### Lesson Q&A (described, not v1)

22. As a learner, I want to ask a question on a specific lesson so that the teacher can help me understand it.
23. As a teacher, I want to see questions asked on my lessons privately so that I control which questions to respond to.
24. As a teacher, I want to publish a Q&A exchange to all my subscribers so that it becomes a shared learning resource (learner identity is never exposed, unconditionally).
25. As a learner, I want to request new content on a topic from a teacher so that future courses address my learning gaps.
26. As a teacher, I want to see content requests from my subscribers so that I can prioritise what to publish next.

### Seminars (described, not v1)

27. As a teacher, I want to schedule a standalone live seminar (not attached to a specific course) so that my subscribers can attend.
28. As a subscriber, I want to RSVP to a seminar so that I can attend (subject to the teacher's capacity limit).
29. As a subscriber, I want to submit typed questions during a live seminar so that the teacher can address them.
30. As a subscriber, I want to access a recording of a seminar after it ends so that I can review it on my own schedule.

## Implementation Decisions

### Role and capability model

The binary `Role.TEACHER / Role.STUDENT` model is replaced. Any authenticated user may publish courses and subscribe to other teachers simultaneously. The `Role` enum will need to change; the exact migration strategy (deprecate the enum, replace with a `capabilities` field, or remove role-based access control entirely) is a build decision. What the spec requires: access-control checks at the action level must not use the existing role enum as the sole gate on publishing or subscribing.

### Schema additions (v1)

**`Course.published: Boolean`** — added to the `Course` model, default `false`. A published course is discoverable in search and accessible to subscribers. An unpublished course is visible only to its creator.

**`Subscription` model** — replaces `Assignment` + `Enrollment`:

```
Subscription {
  id           String   @id @default(cuid())
  subscriberId String
  teacherId    String
  subscribedAt DateTime @default(now())

  subscriber   User @relation("SubscriberSubscriptions", ...)
  teacher      User @relation("TeacherSubscriptions", ...)

  @@unique([subscriberId, teacherId])
}
```

A Subscription is teacher-level, not course-level. It grants access to all current and future published courses by that teacher.

**`UserInterest` model** — stores a user's declared discovery filters:

```
UserInterest {
  id       String   @id @default(cuid())
  userId   String
  subject  Subject
  keyStage KeyStage

  user     User @relation(...)

  @@unique([userId, subject, keyStage])
}
```

**`Assignment` and `Enrollment` models** — deprecated by this spec. A migration plan is required before v1 ships; existing enrolled learners must be migrated to Subscriptions or the data retired.

### Schema: future-proofing requirements

v1 must not foreclose:

- **Lesson questions**: the `Lesson` model must carry a stable identifier usable as a foreign key for a future `LessonQuestion` model. Do not render lessons as opaque blobs in the data layer.
- **Seminar recordings**: the `Course` model must not be the only content entity on the teacher's profile. Teacher profiles must support a future `Seminar` entity with its own recording URL. Do not build teacher profiles as `Course`-only views.
- **Seminar RSVP**: a future `SeminarAttendee` join model must be able to reference both `User` and `Seminar` with a unique constraint. Plan the `User` PKs accordingly.
- **Seminar questions**: a future `SeminarQuestion` model must be able to reference both `User` and `Seminar`. The `Seminar` model must carry a stable identifier for this foreign key. Do not build seminar sessions as closed blobs with no question-attachment point.

### Server action modules (v1)

New or substantially rewritten modules in `src/lib/actions/`:

- **`publish.ts`** — `publishCourse(courseId)`, `unpublishCourse(courseId)`. Caller must own the course.
- **`subscribe.ts`** — `subscribeToTeacher(teacherId)`, `unsubscribeFromTeacher(teacherId)`. Self-subscription rejected.
- **`interests.ts`** — `updateInterests(subjects: Subject[], keyStages: KeyStage[])`. Replaces the user's full interest set atomically.
- **`discovery.ts`** — `discoverTeachers(subjects?: Subject[], keyStages?: KeyStage[])`, `getPublicTeacherProfile(teacherId)`. Both are public (no auth required).
- **`report.ts`** — `reportContent(contentId, contentType: 'course' | 'lesson', reason)`. Requires authentication. The caller cannot be the content owner.
- **`account.ts`** — `requestAccountDeletion()`. Requires authentication. Initiates the right-to-erasure workflow; data erasure is an operator step in v1.

### Access control

- **Publishing actions**: require authentication; caller must own the course (match `course.teacherId`).
- **Subscribe/unsubscribe**: require authentication; self-subscription is rejected. Unsubscribing deletes the `Subscription` record and immediately revokes access to the teacher's courses.
- **Lesson content access**: requires an active `Subscription` to the course's teacher. Unauthenticated users and non-subscribers may see course and lesson metadata on the public profile but must not receive lesson body content.
- **Discovery / public profile**: no auth required. Public pages must not leak private learner data (subscriptions, progress, subscriber counts) on teacher profiles.
- **Interests update**: requires authentication; scoped to the caller's own record.
- **Content reports**: require authentication; the reporting user cannot be the content owner.

### Child-safe defaults (v1 must implement)

The platform applies universal child-safe defaults to all accounts regardless of age:

- No cross-site tracking or third-party analytics beyond first-party operational data.
- No recommendation engine. Interests are search filters, not personalisation signals.
- Learner profile (subscriptions, progress) is private — not visible to other users.
- No direct messaging API or UI.

These are non-negotiable. No feature may introduce opt-out personalisation, public learner profiles, or messaging without a spec change.

### Content reporting

Every published course and lesson must expose a report action. Reports must be persisted (a `ContentReport` model or equivalent) so that platform operators can review and act. The action outcome — remove content, suspend account — is an operator workflow and need not be automated in v1.

## Testing Decisions

Good tests verify external behaviour: what the action does to observable state (database records, returned data, error responses). They do not test Prisma internals, SQL, or the shape of intermediate variables.

**Seam**: Server Actions layer (`src/lib/actions/`). Prior art: `tests/password-reset-actions.test.ts`.

**`publish.ts`**
- Authenticated owner calls `publishCourse` → `course.published` is `true`.
- Authenticated non-owner calls `publishCourse` → rejected (error or no-op with explicit failure).
- Unauthenticated call → rejected.
- `unpublishCourse` mirrors the above; `course.published` becomes `false`.

**`subscribe.ts`**
- Authenticated user calls `subscribeToTeacher(teacherId)` → `Subscription` record created.
- Duplicate subscription → handled gracefully (idempotent or explicit error, no crash).
- Self-subscription → rejected.
- `unsubscribeFromTeacher` removes the record; calling when not subscribed is a no-op or returns a clear error.

**`interests.ts`**
- `updateInterests([MATHS], [KS3])` → `UserInterest` rows replaced atomically; prior interests removed.
- Empty array call → all interests cleared.

**`discovery.ts`**
- `discoverTeachers({ subjects: [MATHS], keyStages: [KS3] })` → returns only teachers with ≥1 published course matching that filter.
- `discoverTeachers()` with no filters → returns all teachers with ≥1 published course.
- Unpublished courses do not appear in results.
- `getPublicTeacherProfile(teacherId)` → returns teacher display name and published courses without requiring auth.
- `getPublicTeacherProfile` does not return learner subscription data, subscriber lists, or progress data.

**`report.ts`**
- Authenticated user reports a course → `ContentReport` record created with correct `contentId`, `contentType`, and `reason`.
- Authenticated content owner reports their own content → rejected.
- Unauthenticated call → rejected.

**`account.ts`**
- Authenticated user calls `requestAccountDeletion()` → deletion request persisted; user's own record is targeted, not another user's.

## Out of Scope

- **Lesson Q&A and content requests** — described in this spec (stories 22–26) to prevent v1 from foreclosing them. Implementation is deferred.
- **Seminars** — described in this spec (stories 27–30) for the same reason. Implementation is deferred.
- **Notification delivery** — notification triggers are implied by the subscription model; delivery mechanism (email, push, in-app) is a separate build decision.
- **Payment and monetisation** — the subscription model in v1 describes access, not billing. Pricing is a business decision outside this spec.
- **School admin portal** — the platform has no institutional school accounts. Schools have no admin role.
- **Mobile apps / PWA** — platform delivery decision outside this spec.
- **Teacher identity verification mechanism** — a practical near-requirement for OSA compliance (see Further Notes), but the specific mechanism (school email domain, manual review) is an operational decision outside this spec.
- **OSA risk assessment documentation** — a legal/operational obligation. See `.scratch/core-concept/research/osa-2023.md`.
- **OSA complaints procedure** — the statutory complaints mechanism required by OSA 2023 (distinct from content reporting). Must be designed and built before launch; specced separately.

## Further Notes

**OSA 2023 compliance — mandatory before launch.** archouse learn is a regulated user-to-user service under OSA 2023. Three risk assessments must be completed and documented before launch: (1) illegal content risk assessment, (2) children's access assessment, (3) children's risk assessment. All deadlines have passed; these must be treated as day-one obligations. The platform must also provide a **complaints procedure** — a mechanism for users to appeal content moderation decisions and report unresolved safety concerns — which is an OSA mandatory requirement separate from the content reporting mechanism in this spec. Full research: `.scratch/core-concept/research/osa-2023.md`.

**ICO Children's Code (DPIA).** A Data Protection Impact Assessment must be completed before launch. The child-safe defaults in the Implementation Decisions section are a direct output of this obligation.

**Age assurance.** HEAA (highly effective age assurance) is not automatically required for a purely educational platform, but is conditional on the children's risk assessment conclusion. v1 should be architected to allow HEAA to be added to the registration flow without a full redesign (do not hardcode open-access registration as an irremovable assumption).

**Teacher verification.** No gate exists in this spec on the teacher publishing capability. The OSA children's risk assessment must affirmatively document this posture and name the reactive safeguards (content reporting, removal, account suspension) as the mitigation. Voluntary identity verification (ID check + self-declaration of DBS status) is recommended before public launch and should be planned in parallel with v1.

**Migration.** The `Assignment` and `Enrollment` models are deprecated by this spec. A migration strategy is required: either migrate existing enrolled learners to Subscriptions, or retire the data with user communication. This should be specced separately before v1 ships.
