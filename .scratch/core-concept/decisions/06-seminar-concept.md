Type: grilling
Status: resolved
Closed: 2026-11-20

## Parent

[core-concept map](../map.md)

## Answer

Minimum spec text that prevents v1 from foreclosing the seminar feature:

Seminars are standalone events attached to the teacher (not a course). Subscription grants the right to RSVP; teacher sets a capacity limit. Live sessions are one-way broadcasts with learner-submitted typed questions. A recording is available to all subscribers after the session.

Load-bearing decisions:
- Standalone (not course-attached) — v1 must give teacher profiles an event-carrying capacity
- Typed questions — v1 must not build seminars as pure broadcasts with no learner input channel
- Recording as persistent content — v1 must leave room for a recording content type alongside courses

Dropped as build decisions: first-come-first-served queue mechanic, turn-away behaviour, seminar technology, recording retention policy, pitched-questions link (natural workflow, no special mechanic).

Glossary updated: Seminar entry reflects RSVP + capacity model, one-way broadcast + typed questions, and recording.

## Question

What does a seminar look like from the learner's and teacher's perspective, and what does the spec need to say about it?

Settled: a seminar is a scheduled live session, teacher-hosted, subscribers attend.

Specific decisions needed for the spec:
- **Scheduling**: how does a teacher schedule a seminar? Is it attached to a course or standalone?
- **Attendance**: does the learner need to register/RSVP, or does subscribe-to-teacher automatically include seminar access?
- **Interaction during the session**: can learners ask questions live (typed)? Is it one-way broadcast or two-way?
- **Async replay**: is a recording available after the session? Who can access it — same subscription gate?
- **Relationship to pitched questions**: can a seminar be a direct response to popular content requests?

Note: technology choice (Zoom, custom WebRTC, etc.) is in the fog and out of scope for this spec ticket.
