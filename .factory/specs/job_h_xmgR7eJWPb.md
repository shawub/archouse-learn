# Spec: Request account deletion (#17): rerun of o7ZQ2XUlMhQQ with the migration renamed

## Summary
Rerun of job o7ZQ2XUlMhQQ for issue #17: reuse the existing reviewed branch and only rename the deletion-request migration folder so it sorts after all existing migrations; SQL and all other code unchanged.

## Acceptance Criteria
- Work starts from the existing branch factory/job_o7ZQ2XUlMhQQ, which holds the already-reviewed implementation; that branch is reused as-is.
- The migration folder prisma/migrations/20261121000100_add_deletion_request is renamed to prisma/migrations/20261122000000_add_deletion_request.
- The migration.sql content inside the renamed folder is byte-for-byte identical to before (SQL unchanged).
- Listing prisma/migrations in name (lexicographic) order puts 20261122000000_add_deletion_request last, after 20261121000100_add_user_interest and every other existing migration.
- Any spec, documentation, or comment references to the old folder name 20261121000100_add_deletion_request are updated to 20261122000000_add_deletion_request.
- No changes are made to the Prisma model, the server action, the store, the logging, or the tests.
- Typecheck and the full test suite pass unchanged.
- Nothing else in the branch is modified.

## Implementation Plan
### 1. `prisma/migrations/20261121000100_add_deletion_request/migration.sql`
Move this file to prisma/migrations/20261122000000_add_deletion_request/migration.sql. Rename the containing directory only; do not edit the SQL content in any way (byte-for-byte identical). Use a rename/move so git tracks it as a rename.
*Lines: whole folder*

### 2. `prisma/migrations/20261122000000_add_deletion_request/`
Confirm the new folder name is exactly 20261122000000_add_deletion_request and sorts lexicographically after 20261121000100_add_user_interest and all other existing migration folders.
*Lines: folder name*

### 3. `(any spec / docs / comments referencing the old folder)`
Search the branch for the string 20261121000100_add_deletion_request in spec files, docs, READMEs, and code comments, and update each occurrence to 20261122000000_add_deletion_request. Do not change any surrounding content or behaviour.
*Lines: reference occurrences only*

## Test Plan
- Run the existing deletion-request test suite (fake-store based) and confirm all pass unchanged: creation, idempotent second call, unauthenticated rejection, cross-user isolation, log line contains no email, user data unchanged, and the concurrent-create race.
- Run typecheck and confirm it passes.
- List prisma/migrations sorted by name and assert add_deletion_request appears last, after 20261121000100_add_user_interest.
- Diff the migration.sql before and after the rename and assert it is identical (no content change).
- Grep the repository for the old folder name 20261121000100_add_deletion_request and assert zero remaining references.

## Edge Cases
- Accidentally editing the migration SQL while moving the folder — SQL must remain byte-for-byte identical.
- Choosing a new timestamp that still collides with or sorts before an existing migration — 20261122000000 must sort strictly after 20261121000100_add_user_interest.
- Git treating the move as a delete+add instead of a rename (acceptable, but ensure no content drift).
- Missing a lingering reference to the old folder name in a spec, doc, or comment.
- Unintentionally modifying the model, action, store, logging, or tests — all must stay exactly as on the reviewed branch.
- Re-implementing from scratch instead of reusing branch factory/job_o7ZQ2XUlMhQQ — this is a narrow rename-only rerun, not a reimplementation.