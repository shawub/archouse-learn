Type: wayfinder:map
Coordinator: charting-cca271d2

## Destination

A product concept spec for archouse learn: a UK-school learning platform where teachers publish courses (Course + Lessons, by subject and KeyStage) and learners discover and subscribe to teachers across the open platform, gaining access to all their published content. Discovery is pull — search/browse by subject and KeyStage. Safeguarding is platform-level (content moderation, age verification, no DMs). Privacy-first. The spec also captures two future interaction modes in-spec but out of v1 build: pitched questions (learners ask questions on content and request new content) and live seminars (teacher-hosted, subscriber-attended). v1 scope: publish + subscribe loop only.

## Notes

Domain: UK schools, KeyStage KS1–KS4, 11 curriculum subjects. Load `grilling` and `domain-modeling` skills for every HITL ticket. Standing preference: v1 scope is publish + subscribe only; pitched questions and seminars belong in the spec but are deferred from v1 build.

## Decisions so far

- [Vocabulary: learner, teacher, subscribe, publish](decisions/01-vocabulary.md): Learner (not Student); Subscribe to teacher = access to all published courses; Publish means discoverable; Seminar for live sessions; Ask for learner questions.
- [UK Online Safety Act 2023 obligations](decisions/03-osa-2023-research.md): Regulated U2U service; HEAA conditional on risk assessment; 3 risk assessments required before launch; voluntary teacher verification is near-required; ICO Children's Code demands DPIA + high-privacy defaults + age-based consent.

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

## Not yet specified

- Seminar technology: beyond "scheduled live session, teacher-hosted, subscriber-attended" — platform choice (Zoom? custom?), async replay, recording policy
- School admin role: whether schools have an admin user who can manage their teachers/learners on the platform
- Payment and monetisation model: free tier, subscription, school licence, teacher revenue share
- Notification system: how learners are informed of new content, upcoming seminars, teacher responses to questions
- Mobile: native apps or PWA
