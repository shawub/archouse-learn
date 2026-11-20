Type: wayfinder:map
Coordinator: charting-cca271d2

## Destination

A product concept spec for archouse learn: a UK-school learning platform where any user can publish courses (acting as teacher), subscribe to other teachers (acting as learner), or both. Discovery is pull — search/browse by subject and KeyStage using user-declared Interests. Safeguarding is platform-level: universal child-safe defaults for all accounts, content reporting and removal, no direct messaging. Privacy-first; no age collected. Future modes (in spec, not v1 build): pitched questions and live seminars. v1 scope: publish + subscribe loop only.

## Notes

Domain: UK schools, KeyStage KS1–KS4, 11 curriculum subjects. Load `grilling` and `domain-modeling` skills for every HITL ticket. Standing preference: v1 scope is publish + subscribe only; pitched questions and seminars belong in the spec but are deferred from v1 build.

## Decisions so far

- [Vocabulary: learner, teacher, subscribe, publish](decisions/01-vocabulary.md): Learner (not Student); Subscribe to teacher = access to all published courses; Publish means discoverable; Seminar for live sessions; Ask for learner questions.
- [UK Online Safety Act 2023 obligations](decisions/03-osa-2023-research.md): Regulated U2U service; HEAA conditional on risk assessment; 3 risk assessments required before launch; voluntary teacher verification is near-required; ICO Children's Code demands DPIA + high-privacy defaults + age-based consent.
- [Teacher public profile and course publishing states](decisions/02-teacher-profile.md): Profiles are public (browsable by anyone); findable by subject and KeyStage; metadata only before subscribing; courses publish and unpublish.
- [Learner sign-up, role claiming, and safeguarding design](decisions/04-learner-signup-safeguarding.md): Any user can publish (teacher) and/or subscribe (learner) — non-exclusive capabilities. No age collected; universal child-safe defaults. Interests = subject/KeyStage filters. Learners report content; platform removes and can suspend.
- [Pitched questions and content requests](decisions/05-pitched-questions.md): Questions attach to lessons (not courses), private to teacher by default; teacher controls Q&A visibility. Content requests go to teacher only. Learner identity never exposed.
- [Live seminar concept](decisions/06-seminar-concept.md): Standalone teacher events (not course-attached); subscription = right to RSVP; teacher sets capacity limit; one-way broadcast + typed questions; recording available to all subscribers after session.

## Added so far

- Term: **Learner** (platform-facing user role)
- Term: **Subscribe** / **Subscription** (teacher-level access relationship)
- Term: **Publish** (makes a course discoverable)
- Term: **Seminar** (live session)
- Term: **Ask** (learner question on content or content request)
- File: `GLOSSARY.md` (created with all settled terms)
- Constraint: 3 OSA risk assessments required before launch (illegal content, children's access, children's risk)
- Constraint: ICO Children's Code — DPIA before launch, parental consent under-13s, child consent 13–17s, high-privacy defaults
- Constraint: HEAA (age assurance) — conditional on children's risk assessment outcome
- Constraint: voluntary teacher identity verification — practical near-requirement
- File: `.scratch/core-concept/research/osa-2023.md` (full research)
- Concept: teacher public profile (discoverable by subject/KeyStage, metadata-only pre-subscription)
- State: Course publish / unpublish
- Term: **User** (base entity; can be teacher, learner, or both)
- Term: **Interests** (subject/KeyStage discovery filters declared at sign-up)
- Constraint: universal child-safe defaults for all accounts (no age collected)
- Constraint: content reporting and removal capability (OSA-mandated)
- Constraint: no direct messaging (safeguarding boundary by omission)
- Interaction: lesson questions (private-first, teacher-controlled Q&A)
- Interaction: content requests (teacher-only inbox, not visible to other learners)
- Interaction: Seminar (standalone live broadcast + typed questions + post-session recording)
- Model: RSVP with teacher-set capacity limit

## Not yet specified

<!-- empty — all fog cleared -->

## Out of scope

- School admin role: the platform has no institutional school accounts and no teacher gate; schools have no admin role in the open platform concept.
- Seminar technology: platform choice (Zoom, custom WebRTC, etc.) and recording retention policy are build decisions, not concept spec decisions.
- Payment and monetisation: pricing model (free, paid subscription, school licence) is a business model decision; the concept spec describes access and interaction patterns only.
- Notification mechanism: notification triggers are implied by the subscription, seminar, and Q&A models; delivery mechanism (email, push, in-app) is a build decision.
- Mobile: native apps vs PWA is a platform/delivery decision, not a concept spec decision.
