# archouse learn

A UK-school learning platform where teachers publish courses and learners discover and subscribe to them.

## Language

**Learner**:
A user who subscribes to teachers and consumes published courses on the platform.
_Avoid_: Student, Pupil

**Teacher**:
A user who publishes courses and hosts seminars on the platform.
_Avoid_: Educator, Instructor

**Subscribe**:
The act of a learner gaining access to all of a teacher's published courses. One subscription covers the full teacher catalogue.
_Avoid_: Enrol (per-course), Follow

**Subscription**:
The relationship between a learner and a teacher, created by subscribing. Grants access to all current and future published courses by that teacher.
_Avoid_: Enrollment, Registration

**Publish**:
The act of a teacher making a course discoverable to learners on the platform. Published courses appear in search results and are accessible to subscribed learners.
_Avoid_: Release, Share

**Course**:
The primary unit of published content. A teacher publishes one or more Courses; each Course contains an ordered set of Lessons.
_Avoid_: Module, Class

**Seminar**:
A live session hosted by a teacher, available for subscribed learners to attend. Distinct from a Course Lesson.
_Avoid_: Session, Class, Live lesson, Webinar

**Ask**:
The verb for learner interactions with a teacher: asking a question on existing content ("ask a question") or requesting new content on a topic ("ask for content"). These are two distinct interactions that share one verb.
_Avoid_: Pitch, Submit, Post

## Relationships

- A **Teacher** publishes many **Courses**
- A **Learner** subscribes to many **Teachers** (one **Subscription** per Teacher)
- A **Subscription** grants access to all published Courses by that Teacher
- A **Teacher** hosts many **Seminars**; subscribed Learners may attend
