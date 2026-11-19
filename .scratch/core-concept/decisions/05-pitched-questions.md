Type: grilling
Status: resolved
Closed: 2026-11-19

## Parent

[core-concept map](../map.md)

## Answer

Minimum spec text that prevents v1 from foreclosing this interaction mode:

Learners can ask questions on specific lessons and request new content from teachers. Lesson questions are private to the teacher by default; the teacher controls what Q&A to make visible to subscribers. Content requests go to the teacher and are not visible to other learners. Learner identity is never exposed in published Q&A.

Load-bearing decisions:
- Lesson-level attachment (not course-level) — v1 must build lessons as extension points, not closed blobs
- Teacher-controlled visibility — v1 must not auto-publish learner questions

Dropped as build decisions: request inbox framing, inline-answer mechanism, anonymous attribution (redundant with universal child-safe defaults from ticket 04).

Glossary updated: Ask entry reflects lesson-level attachment, private-first visibility, and content request mechanics.

## Question

How do the two types of learner question interaction work: questions on existing content, and content requests?

Specific decisions needed:
- **Questions on content**: where are they attached — to a lesson? a course? Do other learners see them? Can they upvote?
- **Content requests**: do learners submit a topic/title they'd like a teacher to cover? Where does this surface for the teacher?
- **Teacher response flow**: does the teacher answer inline, create a new lesson in response, or both?
- **Moderation**: can the teacher moderate/hide questions? Are questions from all learners visible to all learners, or only the teacher?
- **Anonymous vs attributed**: are questions posted under the learner's name or anonymously?

Note: this interaction mode is out of v1 build scope. The spec should describe it well enough that v1 doesn't accidentally foreclose it.
