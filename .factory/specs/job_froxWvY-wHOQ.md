# Spec: Add forgot-password and reset-password flow (retry of n4hHWelQVKvS)

## Summary
Add forgot-password and reset-password flow to the auth system with secure single-use, time-limited, hashed reset tokens, rate limiting, a mailer abstraction, and neutral enumeration-safe responses.

## Acceptance Criteria
- The `/login` sign-in page shows a "Forgot password?" link next to the password field, linking to `/forgot-password`, styled consistently with existing auth links.
- `/forgot-password` presents an accessible email form (visible label) and, on submit, always renders the same neutral confirmation message ("If an account exists for that email, we've sent a reset link") regardless of whether the email is registered.
- A reset token is generated with a cryptographically secure random generator (Node `crypto.randomBytes`), stored only as a hash (SHA-256 of the raw token) in the database — never in plaintext — and expires 60 minutes after creation.
- `/reset-password?token=…` renders a form to set a new password with the same minimum-length rule as registration (8 characters) and a visible label; on success it updates the user's password hash, invalidates the token (single use), and shows a success state linking to `/login`.
- `/reset-password` rejects expired, already-used, missing, or unknown tokens with a clear, accessible error message and a link to `/forgot-password` to request a new one.
- Forgot-password requests are rate-limited both per email and per IP; exceeding the limit returns the same neutral confirmation (so it does not leak) but does not send/generate another token.
- Email sending goes through a small mailer abstraction (`src/lib/mailer.ts`). No third-party provider or new secret is added; the default mailer logs the reset link server-side in development and never throws.
- Styling of both new pages matches existing auth pages (same card layout via the `(auth)` layout, same input/button/label classes), and all fields have visible labels with accessible (aria-associated) error messages.
- Automated tests cover: token generation and expiry, single use (token invalid after reset), neutral response for unknown emails, and a successful password reset.
- `npm run typecheck` passes and all pre-existing tests continue to pass.

## Implementation Plan
### 1. `prisma/schema.prisma`
Add a `PasswordResetToken` model: `id String @id @default(cuid())`, `tokenHash String @unique`, `userId String`, `email String` (lowercased), `expires DateTime`, `usedAt DateTime?`, `createdAt DateTime @default(now())`, with a `user User @relation(fields:[userId], references:[id], onDelete: Cascade)` and indexes `@@index([userId])` and `@@index([email])`. Add the inverse relation `passwordResetTokens PasswordResetToken[]` to the `User` model. Migration/db push to be run as part of the job.
*Lines: User model + new model near other auth models*

### 2. `src/lib/mailer.ts`
New file. Export a `Mailer` interface `{ sendPasswordResetEmail(opts: { to: string; resetUrl: string }): Promise<void> }` and a `mailer` singleton. Default implementation logs the reset URL via `console.info` in development and resolves without throwing. Structure so a real provider can be swapped in later behind the same interface. Do not read any new env secrets.
*Lines: new file*

### 3. `src/lib/reset-tokens.ts`
New file with helpers: `generateResetToken()` returns `{ raw, hash }` using `crypto.randomBytes(32).toString('hex')` for raw and `crypto.createHash('sha256').update(raw).digest('hex')` for hash; `hashResetToken(raw)` for lookup; `RESET_TOKEN_TTL_MS = 60*60*1000`. Keep pure/testable (no Prisma import) so unit tests can exercise generation/hash/expiry logic.
*Lines: new file*

### 4. `src/lib/rate-limit.ts`
New file. Simple in-memory fixed-window rate limiter keyed by string with `checkRateLimit(key, limit, windowMs): boolean`. Used with per-email and per-IP keys for forgot-password. Note in a comment that this is per-instance/in-memory (acceptable for current single-instance deployment).
*Lines: new file*

### 5. `src/lib/actions/auth.ts`
Add two server actions. `forgotPasswordAction(_, formData)`: validate email with zod; derive IP from `headers()` (x-forwarded-for) — if either per-email or per-IP rate limit is exceeded, return the neutral success result without doing work; look up user by lowercased email; if user exists, generate a token, store its hash with 60-min expiry in `PasswordResetToken`, build reset URL from `NEXTAUTH_URL` (fallback localhost:3000) + `/reset-password?token=<raw>`, and call `mailer.sendPasswordResetEmail`; always return the same neutral `{ success: true }` / message result. `resetPasswordAction(_, formData)`: validate token present + password min 8 with zod; hash incoming token, find matching `PasswordResetToken` where `usedAt` is null and `expires > now`; if none, return error 'This reset link is invalid or has expired.'; otherwise bcrypt-hash new password, update the user, set `usedAt = now()` (and/or delete token) in a transaction to enforce single use, return `{ success: true }`.
*Lines: append new actions; add imports for crypto helpers, mailer, rate-limit, headers*

### 6. `src/components/forms/login-form.tsx`
Add a "Forgot password?" link next to the password label/field (e.g. a flex row with the label and a right-aligned `<Link href="/forgot-password">`), styled like the existing brand link.
*Lines: password field block*

### 7. `src/components/forms/forgot-password-form.tsx`
New client component using `useActionState(forgotPasswordAction, null)`. Renders heading, email input with visible label and accessible error (aria-describedby / role=alert), submit button, and a link back to `/login`. When `state?.success`, replace the form with the neutral confirmation message.
*Lines: new file*

### 8. `src/components/forms/reset-password-form.tsx`
New client component accepting `token: string`. Uses `useActionState(resetPasswordAction, null)`, renders a hidden `token` input, a new-password input (minLength 8, visible label, 'Minimum 8 characters' hint), accessible errors. On `state?.success` show success message + link to `/login`. If no token prop, show invalid-link message + link to `/forgot-password`.
*Lines: new file*

### 9. `src/app/(auth)/forgot-password/page.tsx`
New route rendering `<ForgotPasswordForm />` inside the existing `(auth)` layout.
*Lines: new file*

### 10. `src/app/(auth)/reset-password/page.tsx`
New route: `async` page reading `searchParams: Promise<{ token?: string }>`, awaiting it, and rendering `<ResetPasswordForm token={token ?? ''} />`.
*Lines: new file*

### 11. `src/middleware.ts`
Add `/forgot-password` and `/reset-password` to `publicPaths` so unauthenticated users can access them.
*Lines: publicPaths array*

### 12. `test/reset-password.test.ts`
New test file covering token generation/hash determinism and expiry window, single-use invalidation, neutral response for unknown emails, and a successful reset. Use the project's existing test runner; mock Prisma and the mailer. If no test runner exists yet, add a minimal one (e.g. node:test via tsx) and a `test` script in package.json.
*Lines: new file*

## Test Plan
- generateResetToken produces a raw token and a SHA-256 hash where hashResetToken(raw) === hash, and distinct calls produce distinct tokens.
- A token created now with 60-min TTL is considered valid; a token with expires in the past is rejected by resetPasswordAction with the invalid/expired error.
- resetPasswordAction with a valid token updates the user's passwordHash and marks the token used; a second resetPasswordAction call with the same token returns the invalid/expired error (single use).
- forgotPasswordAction with an email that has no matching user returns the neutral success result and does NOT create a PasswordResetToken or send email.
- forgotPasswordAction with an existing user creates exactly one hashed token (no plaintext stored) and calls mailer.sendPasswordResetEmail with a URL containing the raw token.
- forgotPasswordAction returns the identical neutral message for both known and unknown emails (response strings compared equal).
- Exceeding the per-email or per-IP rate limit returns the neutral success result without creating an additional token.
- npm run typecheck passes; all previously existing tests still pass.

## Edge Cases
- Missing or empty `token` query param on /reset-password — show invalid-link message with link to /forgot-password, do not attempt a DB lookup.
- Token exists but is already used (usedAt set) or expired — treat identically as invalid/expired.
- Email casing/whitespace — normalize to trimmed lowercase before lookup and storage to avoid mismatches.
- User exists but has no passwordHash (OAuth-only / never set) — still issue a reset and allow setting a password (sets passwordHash).
- Concurrent reset attempts with the same token — single-use enforced via transactional update guarded on usedAt null so only the first succeeds.
- Mailer failure must never surface to the user or change the neutral response; swallow/log errors so account existence isn't leaked via timing/errors.
- Rate-limit path must return the same neutral response and must not generate or store a token.
- NEXTAUTH_URL unset — fall back to http://localhost:3000 when building the reset URL.
- In-memory rate limiter is per-process; document that it resets on restart and isn't shared across instances (acceptable for current deployment, no new infra in this job).
- No plaintext token is ever persisted or logged in production; the dev-only mailer log is the sole place the raw link appears.