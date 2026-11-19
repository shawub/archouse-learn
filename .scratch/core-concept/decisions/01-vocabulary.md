Type: grilling
Status: resolved
Closed: 2026-11-19

## Parent

[core-concept map](../map.md)

## Answer

**Learner** (not Student): the platform-facing term. `Role.STUDENT` → `Role.LEARNER` is an implementation decision deferred to the build; the spec uses "learner" throughout.

**Subscribe** (not Enrol): load-bearing distinction. Subscribing to a teacher grants access to all their published courses — one teacher-level relationship, not per-course enrolment.

**Publish**: "teachers publish; published courses are discoverable." The draft/published lifecycle (create-then-publish workflow) is an implementation detail deferred to the build.

**Seminar**: the term for a live session hosted by a teacher.

**Ask**: the shared verb. Two distinct interactions: "ask a question" (on existing content) and "ask for content" (request a topic from a teacher). Both use "ask" as the verb but are explicitly different actions.

Glossary written to [GLOSSARY.md](../../../GLOSSARY.md).

## Question

What are the canonical terms for the core concepts in archouse learn?

The existing codebase uses `STUDENT` / `TEACHER` roles and `Enrollment` / `Assignment` models. The product concept uses "learners and teachers" and "subscribe." Before the spec can be drafted, these terms need to be settled.

Specific decisions needed:
- **Learner vs Student**: is the platform-facing term "learner" (open, any age) or "student" (school-specific)? Does the `Role` enum rename `STUDENT` → `LEARNER`?
- **Subscribe vs Enrol**: what does the act of gaining access to a teacher's content mean? Subscribing (following a teacher) or enrolling (in a course)?
- **Publish vs Create**: do teachers "publish" courses or "create" them? What does "published" mean as a state?
- **Seminar**: is this the right term for the live session, or "session", "class", "live lesson"?
- **Pitch a question**: is "pitch" right, or "submit", "ask", "request"?
