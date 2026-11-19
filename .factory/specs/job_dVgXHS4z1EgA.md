# Spec: Add forgot-password and reset-password flow (retry of n4hHWelQVKvS / c5PcWjmf23n4)

## Summary
Add a secure forgot-password / reset-password flow with hashed single-use tokens, neutral responses, rate limiting, and a logging mailer, coexisting with PR #8 OAuth sign-in.

## Acceptance Criteria
- The `/login` page shows a "Forgot password?" link next to the password field, linking to `/forgot-password`, without breaking the layout or existing tests, and keeping the Continue with Google / Microsoft buttons from PR #8 intact.
- `/forgot-password` accepts an email and always returns the identical neutral confirmation "If an account exists for that email, we've sent a reset link" regardless of whether the account exists.
- Response timing for `/forgot-password` does not obviously differ between registered and unknown emails (a constant minimum work/delay is applied on both paths).
- A reset token is generated with `crypto.randomBytes`, only its SHA-256 hash is stored in the database (plaintext only appears in the emailed/logged link), and it expires 60 minutes after issuance.
- `/reset-password?token=…` lets a user set a new password with the same minimum-length rule as registration (>= 8 chars), then invalidates the token so it cannot be reused.
- Expired or already-used tokens on `/reset-password` are rejected with a clear message and a link back to `/forgot-password` to request a new one.
- Issuing a new reset token invalidates all earlier unused tokens for that account; a successful reset invalidates all outstanding tokens for the account.
- OAuth-only accounts (no passwordHash) receive the same neutral confirmation; the chosen behaviour is: the reset flow lets them set a password (adding credentials login alongside OAuth), and this decision is documented in the PR description and covered by a test.
- `/forgot-password` requests are rate-limited per email and per IP.
- Email sending goes through a mailer abstraction; since no provider exists, the dev mailer logs the reset link server-side and never throws, with no new third-party dependency or secret added.
- `/forgot-password` and `/reset-password` are reachable without authentication (added to middleware public paths).
- Styling matches existing auth pages, all fields have visible labels, and errors are rendered as accessible messages (role="alert").
- Tests cover token generation+expiry, single use, earlier-token invalidation, neutral unknown-email response, OAuth-only account case, rate limiting, and a successful reset.
- `npm run typecheck` and the existing test suite (including PR #8 OAuth tests) pass.

## Implementation Plan
### 1. `GIT`
Rebase branch `factory/job_n4hHWelQVKvS` onto current `main`. Resolve conflicts in `/login`, `/register`, `src/auth.ts`, and the auth config by preserving PR #8's OAuth changes (OAuthButtons, buildProviders, getOAuthAvailability, signIn callback) and layering the reset-password additions on top rather than overwriting.

### 2. `prisma/schema.prisma`
Add a `PasswordResetToken` model: `id String @id @default(cuid())`, `userId String`, `tokenHash String @unique`, `expires DateTime`, `usedAt DateTime?`, `createdAt DateTime @default(now())`, relation `user User @relation(fields:[userId], references:[id], onDelete: Cascade)`, and `@@index([userId])`. Add the back-relation `passwordResetTokens PasswordResetToken[]` to the `User` model. Run `prisma generate` / `db push` as part of the change.

### 3. `src/lib/mailer.ts`
New file: a minimal mailer abstraction. Export `interface Mailer { sendPasswordResetEmail(args: { to: string; resetUrl: string }): Promise<void> }` and a `mailer` instance. Since no provider exists, implement a dev/no-op mailer that `console.log`s the reset URL server-side and never throws. Keep it swappable for a real provider later (no new secrets/deps).

### 4. `src/lib/password-reset.ts`
New file with the core logic (pure/unit-testable where possible): `generateToken()` using `crypto.randomBytes(32).toString('base64url')`; `hashToken(token)` using `crypto.createHash('sha256')`; `TOKEN_TTL_MS = 60*60*1000`; `createResetToken(userId)` that deletes/marks all prior unused tokens for the user then inserts the new hashed token with `expires = now + TTL`; `consumeToken(rawToken, newPasswordHash)` that looks up by hash, validates not expired and not used, sets the user's passwordHash, marks the token used, and invalidates all other outstanding tokens for that user in a transaction; `isTokenValid(record, now)` helper. Keep hashing/expiry helpers exported for direct unit tests.

### 5. `src/lib/rate-limit.ts`
New file: a small in-memory fixed-window rate limiter keyed by string. Export `checkRateLimit(key, { limit, windowMs })` returning `{ allowed: boolean }`. Used with keys `pwreset:email:<normalizedEmail>` and `pwreset:ip:<ip>`. Note in comments that it's per-process (fine for dev / single instance; swap for shared store in prod).

### 6. `src/lib/actions/password-reset.ts`
New server actions file: `requestPasswordResetAction(_, formData)` — validate email with zod, normalize it, check per-email and per-IP rate limits (read IP via `headers()` x-forwarded-for), look up user case-insensitively; if found and has/needs a password, create a token and call `mailer.sendPasswordResetEmail` with `${origin}/reset-password?token=…`. Always return the same neutral success result and enforce a constant-time-ish minimum duration so timing doesn't leak existence. For OAuth-only users, still issue a token (chosen policy: allow setting a password). `resetPasswordAction(_, formData)` — validate token + password (min 8) with zod, hash the new password with bcrypt(12), call `consumeToken`; on success redirect to `/login`, on invalid/expired/used return an error flagged so the UI can show the 'request a new link' CTA.

### 7. `src/app/(auth)/forgot-password/page.tsx`
New route (force-dynamic). Server component rendering `<ForgotPasswordForm />`. Reachable unauthenticated.

### 8. `src/components/forms/forgot-password-form.tsx`
New client component using `useActionState(requestPasswordResetAction, null)`. Email field with visible label, submit button matching auth styling, and on success render the neutral confirmation message (role="status"). Errors rendered with role="alert". Link back to `/login`.

### 9. `src/app/(auth)/reset-password/page.tsx`
New route (force-dynamic). Reads `searchParams.token`; renders `<ResetPasswordForm token={token} />`. If no token present, show the invalid-token message with a link to `/forgot-password`.

### 10. `src/components/forms/reset-password-form.tsx`
New client component using `useActionState(resetPasswordAction, null)`. Hidden token input, password field (minLength 8, visible label, autoComplete new-password, 'Minimum 8 characters' hint). On invalid/expired/used error show message plus a 'Request a new link' link to `/forgot-password`. Styling matches register-form.

### 11. `src/components/forms/login-form.tsx`
Add a 'Forgot password?' link next to the password field (e.g. a flex row with the password label on the left and the link on the right, or directly under the password input) linking to `/forgot-password`, styled like the existing brand links. Do not alter the OAuthButtons placement or form structure that PR #8 tests rely on.

### 12. `src/middleware.ts`
Add `/forgot-password` and `/reset-password` to the `publicPaths` array so both are reachable without a session.

### 13. `tests/password-reset.test.ts`
New tests: token generation produces distinct base64url values; hashToken is deterministic and stores a hash (not plaintext); expiry logic rejects tokens past TTL; consumeToken marks token used and rejects reuse; creating a new token invalidates earlier unused ones; successful reset invalidates all outstanding tokens. Use an injected/mock Prisma-like store so tests run without a real DB (refactor password-reset.ts to accept a db dependency or an in-memory fake).

### 14. `tests/password-reset-actions.test.ts`
New tests: unknown email returns the same neutral result as a known email; OAuth-only account (no passwordHash) still gets neutral confirmation and a token is issued (chosen policy); rate limiting blocks after the configured limit per email and per IP; a full successful reset path sets the new password hash.

## Test Plan
- `generateToken()` returns unique, URL-safe strings of expected length on repeated calls.
- `hashToken(raw)` is deterministic and never equals the raw token; stored value is the hash.
- A token created at T is valid before T+60min and invalid at/after T+60min.
- `consumeToken` sets the user's passwordHash, marks the token `usedAt`, and a second call with the same token is rejected as used.
- `createResetToken` for a user invalidates all previously issued unused tokens for that user.
- After a successful reset, all other outstanding tokens for that user are invalidated.
- `requestPasswordResetAction` returns byte-identical neutral result for a registered email and an unknown email.
- `requestPasswordResetAction` for an OAuth-only (no passwordHash) user returns the neutral confirmation and issues a reset token (documented policy).
- `requestPasswordResetAction` is blocked after exceeding the per-email limit and after exceeding the per-IP limit.
- `resetPasswordAction` with an expired, used, or unknown token returns an error that triggers the 'request a new link' UI.
- `resetPasswordAction` with a valid token and a password >= 8 chars succeeds and redirects to `/login`; a password < 8 chars is rejected.
- Existing OAuth tests (`tests/oauth-adapter.test.ts`, `tests/auth-providers.test.ts`) and `npm run typecheck` still pass.
- Middleware allows GET of `/forgot-password` and `/reset-password` while unauthenticated.

## Edge Cases