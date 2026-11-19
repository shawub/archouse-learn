Type: grilling
Status: resolved
Closed: 2026-11-19

## Parent

[core-concept map](../map.md)

## Answer

**Role claiming**: no gate. Publishing (teacher capability) and subscribing (learner capability) are non-exclusive — any user can do both simultaneously. The binary TEACHER/STUDENT model is replaced by a capability set. Glossary updated: User is the base entity; Learner and Teacher describe capabilities, not identities.

**Age and sign-up**: no date of birth collected. Universal child-safe defaults applied to all accounts. Users declare subject and KeyStage Interests at sign-up (multiple of each), used only as discovery filters.

**Teacher identity**: no verification gate on publishing. OSA compliance posture: the children's risk assessment must affirmatively document the no-gate decision and the reactive safeguards that mitigate it.

**Content moderation**: learners can report content; the platform can remove it and suspend the account. Mechanism is a build decision.

**Right to erasure**: constraint — any user can request account deletion and data erasure.

**No direct messaging**: safeguarding boundary by omission — no DM capability built.

**Interests**: subjects + KeyStages selected at sign-up, editable, used as discovery filters only. No algorithmic personalisation. Consistent with universal child-safe defaults.

Glossary updated: added User, Interests; updated Learner and Teacher as capabilities.

## Question

How do learners sign up and claim their role, and what safeguarding mechanisms does the platform need?

This ticket builds on the OSA 2023 research findings (ticket 03). Specific decisions needed:
- **Role claiming**: how does a new user declare themselves a teacher vs a learner? Is there a gate on the teacher role (e.g. school email domain, manual verification, or open self-declaration)?
- **Age assurance for learners**: does the platform need to verify or estimate age before granting access? What mechanism?
- **Teacher identity**: does the platform require any verification that a teacher is a real educator (school email? DBS reference number? nothing)?
- **No-DM enforcement**: how is the no-direct-messaging rule enforced technically?
- **Content moderation process**: is there a report/review flow for learners to flag teacher content?
- **Account deletion and data retention**: what does a learner's right-to-erasure look like given they're likely a minor?
