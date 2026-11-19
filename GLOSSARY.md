# archouse learn

A UK-school learning platform where teachers publish courses and learners discover and subscribe to them.

## Language

**User**:
A person with an account on archouse learn. A user may act as a teacher (publishing courses, hosting seminars), a learner (subscribing to other teachers, consuming courses), or both simultaneously. These are non-exclusive capabilities, not a fixed identity.
_Avoid_: Account, Member

**Learner**:
The capability a user exercises when subscribing to teachers and consuming published courses. Any user can be a learner.
_Avoid_: Student, Pupil

**Teacher**:
The capability a user exercises when publishing courses and hosting seminars. Any user can be a teacher.
_Avoid_: Educator, Instructor

**Interests**:
The subjects and KeyStages a user selects to filter teacher discovery. Set at sign-up, editable. Used only as search/browse filters — not for algorithmic personalisation or recommendations.
_Avoid_: Preferences, Topics

**Subscribe**:
The act of a learner gaining access to all of a teacher's published courses. One subscription covers the full teacher catalogue.
_Avoid_: Enrol (per-course), Follow

**Subscription**:
The relationship between a learner and a teacher, created by subscribing. Grants access to all current and future published courses by that teacher.
_Avoid_: Enrollment, Registration

**Publish**:
The act of a teacher making a course discoverable to learners on the platform. Published courses appear in search results and are accessible to subscribed learners. A teacher can unpublish a course to remove it from discovery; subscriber-retention behaviour on unpublish is an implementation decision.
_Avoid_: Release, Share

**Course**:
The primary unit of published content. A teacher publishes one or more Courses; each Course contains an ordered set of Lessons.
_Avoid_: Module, Class

**Seminar**:
A live session hosted by a teacher, available for subscribed learners to attend. Distinct from a Course Lesson.
_Avoid_: Session, Class, Live lesson, Webinar

**Ask**:
The verb for two distinct learner interactions with a teacher. "Ask a question" is attached to a specific lesson, private to the teacher by default; the teacher controls whether the Q&A is published to subscribers. "Ask for content" is a request for a new topic, visible only to the teacher. Learner identity is never exposed in published Q&A.
_Avoid_: Pitch, Submit, Post

## Relationships

- A **Teacher** publishes many **Courses**
- A **Learner** subscribes to many **Teachers** (one **Subscription** per Teacher)
- A **Subscription** grants access to all published Courses by that Teacher
- A **Teacher** hosts many **Seminars**; subscribed Learners may attend
