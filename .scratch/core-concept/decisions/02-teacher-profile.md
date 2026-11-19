Type: grilling
Status: resolved
Closed: 2026-11-19

## Parent

[core-concept map](../map.md)

## Answer

**Profile visibility**: public — teacher profiles and course listings are browsable and search-engine-indexable by anyone. Lesson content is behind subscription.

**Profile fields**: the concept spec does not enumerate fields. The spec says: teachers have a public profile, findable by subject and KeyStage. What fields appear is a design/build decision.

**Course states**: publish and unpublish. The spec says teachers can publish courses (making them discoverable) and unpublish them (removing them from discovery). The archived-vs-unpublished distinction and subscriber-retention behaviour are implementation decisions.

**Content on profile**: metadata only — course title, subject, KeyStage, lesson count. No lesson text visible before subscribing.

Glossary updated: `Publish` entry notes unpublish and defers subscriber-retention to implementation.

## Question

What does a teacher's public profile look like, and what states can a course be in?

Specific decisions needed:
- **Profile fields**: what does a teacher's public page show? (Name, bio, subjects taught, KeyStages, course count — what else? Is the school affiliation shown?)
- **Course publishing states**: can a course be in draft (only teacher sees it) vs published (discoverable by learners)? Is there an archived state?
- **Profile discoverability**: is the teacher's profile public to anyone, or only to logged-in learners?
- **Content on the profile vs in the course**: does the profile show a preview of content, or just metadata (title, subject, KeyStage, lesson count)?
