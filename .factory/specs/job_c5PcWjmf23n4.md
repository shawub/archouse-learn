# Spec: Add forgot-password and reset-password flow (retry of n4hHWelQVKvS)

## Summary
Add forgot-password and reset-password flow with secure single-use tokens, neutral responses, rate limiting, and a mailer abstraction.

## Acceptance Criteria
- The `/login` page shows a "Forgot password?" link next to the password field, linking to `/forgot-password`, styled to match existing auth links.
- `/forgot-password` presents an email field with a visible label and accessible error messaging, and always returns the same neutral confirmation message ("If an account exists for that email, we've sent a reset link") regardless of whether the account exists.
- A reset token is generated using a cryptographically secure random generator (Node `crypto.randomBytes`), stored only as a hash (e.g. SHA-256) never in plaintext, and expires 60 minutes after creation.
- When a reset is requested for an existing account, a reset link containing the plaintext token is sent via the mailer; the plaintext token is never persisted.
- `/reset-password?token=…` shows a password form (same minimum-length rule as registration: min 8 characters) with visible labels and accessible error messages.
- Submitting a valid, unexpired, unused token successfully updates the user's passwordHash (bcrypt) and invalidates/consumes the token so it cannot be reused.
- Expired, already-used, or unknown tokens are rejected with a clear message and a link back to `/forgot-password` to request a new one.
- Requests to `/forgot-password` are rate-limited per email and per IP; exceeding the limit still returns the neutral confirmation (does not leak state) but suppresses additional emails.
- Email sending goes through a small mailer abstraction. If an email provider already exists it is used; otherwise the mailer logs the reset link server-side (dev) and never throws. No third-party provider or new secrets are added.
- `/forgot-password` and `/reset-password` are added to the middleware `publicPaths` so unauthenticated users can access them.
- Styling matches existing auth pages (brand colours, rounded inputs, error banner pattern).
- Tests cover: token generation and expiry, single-use enforcement, neutral response for unknown emails, and a successful reset.
- `npm run typecheck` and existing tests pass.

## Implementation Plan
### 1. `prisma/schema.prisma`
Add a `PasswordResetToken` model: id (cuid), tokenHash (String @unique), userId (String), identifier/email (String) for per-email rate limiting, expires (DateTime), used (Boolean @default(false)) or usedAt (DateTime?), createdAt (DateTime @default(now())). Add relation to User and a `passwordResetTokens PasswordResetToken[]` field on User. Index on tokenHash and userId/email.

### 2. `prisma/migration (db push)`
Note in spec: a `prisma migrate dev` / `db push` is required to apply the new model. Document the command; do not hand-write SQL.

### 3. `src/lib/mailer.ts`
New small mailer abstraction exporting e.g. `sendMail({ to, subject, text, html })` and a helper `sendPasswordResetEmail(email, resetUrl)`. If no provider configured, log the reset link via console in development and resolve successfully (never throw). Keep interface provider-agnostic so a real provider can be slotted in later.

### 4. `src/lib/tokens.ts`
New module for token logic: `generateResetToken()` returns { token (plaintext, crypto.randomBytes hex), tokenHash (sha256 of token) }; `hashToken(token)` for lookups; `RESET_TOKEN_TTL_MS = 60 * 60 * 1000`. Keep pure/unit-testable (no DB).

### 5. `src/lib/rate-limit.ts`
New simple in-memory rate limiter keyed by email and IP (fixed window or token bucket). Export a `checkRateLimit(key)` returning allowed/blocked. In-memory is acceptable per job scope (no new infra/secrets).

### 6. `src/lib/actions/auth.ts`
Add `forgotPasswordAction` and `resetPasswordAction`. forgotPasswordAction: zod-validate email, check per-email + per-IP rate limit, if user exists generate token, store hashed token with 60-min expiry, send email with reset URL (`${baseUrl}/reset-password?token=…`); ALWAYS return the neutral confirmation result. resetPasswordAction: zod-validate token + password (min 8), hash token, look up unexpired+unused token, reject with clear error if invalid/expired/used, else bcrypt-hash new password, update user, mark token used (and optionally delete other tokens for that user), return success.

### 7. `src/app/(auth)/forgot-password/page.tsx`
New route rendering a `ForgotPasswordForm` component inside the existing auth layout.

### 8. `src/components/forms/forgot-password-form.tsx`
New client component using `useActionState(forgotPasswordAction, null)`. Email field with visible label, accessible error (aria-describedby / role=alert), neutral success banner on completion, and a link back to `/login`. Match register/login styling.

### 9. `src/app/(auth)/reset-password/page.tsx`
New route that reads `token` from searchParams (await Promise) and passes it to `ResetPasswordForm`. If token missing, render the invalid-token message with link to `/forgot-password`.

### 10. `src/components/forms/reset-password-form.tsx`
New client component using `useActionState(resetPasswordAction, null)`. Hidden input carrying the token, password + confirm-password fields with visible labels, minLength=8, accessible errors, success state redirecting/ linking to `/login`, and an invalid-token state linking to `/forgot-password`.

### 11. `src/components/forms/login-form.tsx`
Add a "Forgot password?" Link to `/forgot-password` positioned next to the password label/field, styled like existing brand links.

### 12. `src/middleware.ts`
Add `/forgot-password` and `/reset-password` to `publicPaths` so they are accessible when unauthenticated.

### 13. `tests (test runner TBD / add if absent)`
Add unit tests for tokens.ts (generation shape, hash determinism, expiry logic), and integration-style tests for the actions covering single-use, expiry rejection, neutral unknown-email response, and successful reset. Mock prisma + mailer.

### 14. `Branch factory/job_n4hHWelQVKvS`
May be reused as a starting point since prior implementation passed QA; reconcile with current acceptance criteria before finalising.

## Test Plan
- tokens: generateResetToken returns a non-empty plaintext token and a distinct hash; hashToken(token) equals the stored tokenHash (deterministic).
- tokens: a token created now with TTL 60min is considered valid before expiry and invalid after expiry (clock advanced past expires).
- forgotPasswordAction: unknown email returns the exact neutral confirmation message and does NOT create a token or send an email.
- forgotPasswordAction: known email creates exactly one hashed token (no plaintext persisted) and triggers the mailer once, still returning the neutral message.
- forgotPasswordAction: exceeding per-email or per-IP rate limit returns the neutral message and suppresses additional email sends.
- resetPasswordAction: valid unexpired unused token with a >=8 char password updates passwordHash and marks the token used; the new password authenticates via the credentials authorize flow.
- resetPasswordAction: reusing an already-used token returns the clear invalid-token error.
- resetPasswordAction: an expired token returns the clear invalid-token error.
- resetPasswordAction: a password shorter than 8 chars returns the min-length validation error without consuming the token.
- resetPasswordAction: unknown/garbage token returns the invalid-token error with guidance to request a new link.
- typecheck: `npm run typecheck` passes.
- existing test suite continues to pass.

## Edge Cases
- Reset requested for an email with no passwordHash (e.g. OAuth-only user) — treat as neutral, do not send a usable reset (document behaviour).
- Multiple reset requests for the same user — later tokens should not be invalidated unexpectedly, or decide to invalidate prior tokens on new request; ensure consistent single-use semantics.
- Token present in URL but empty/malformed — render invalid-token state, never query with a hash of empty string as valid.
- Concurrent use of the same token (double submit) — ensure atomic consume so only one succeeds (e.g. updateMany with used=false guard).
- In-memory rate limiter resets across server restarts / serverless cold starts — acceptable per scope but note it is best-effort.
- Determining base URL for the reset link — use NEXTAUTH_URL/request origin; avoid hardcoding localhost in production.
- Mailer with no provider configured must log and resolve, never throw, so the action still returns the neutral message.
- Timing side-channel: keep response timing/behaviour similar for existing vs non-existing accounts to avoid user enumeration.
- Expired tokens left in the DB — optionally clean up on use; not required but avoid unbounded growth assumptions in tests.
- Email with different casing — normalise/lowercase consistently with existing user lookups to avoid missed matches.