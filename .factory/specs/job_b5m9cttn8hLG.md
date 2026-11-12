# Spec: Add Google and Microsoft sign-in behind configuration (retry of sqPIMaV7aNaF)

## Summary
Add Google and Microsoft OAuth sign-in via Auth.js, enabled only when provider env vars are set, with role preservation on register and verified-email account linking (ships disabled by default).

## Acceptance Criteria
- "Continue with Google" and "Continue with Microsoft" buttons appear on /login and /register when the relevant provider is configured, implemented via Auth.js providers consistent with the existing credentials setup.
- Google button renders only when GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are both set; Microsoft button renders only when MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, and MICROSOFT_TENANT_ID are all set. When unset, the button is hidden and no runtime error occurs.
- No credentials are committed to the repo; only placeholder variable names are added to .env.example.
- .env.example documents GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, and MICROSOFT_TENANT_ID with explanatory comments.
- First-time OAuth sign-in initiated from /register preserves the selected role (TEACHER or STUDENT) and the created user is assigned that role.
- OAuth sign-in from /login where no account exists for the email does NOT silently create an account; the user is redirected to /register with name and email prefilled.
- An existing email/password account is linked to the OAuth provider only when the provider reports email_verified true; otherwise linking is refused.
- Only openid, email, and profile scopes are requested for both providers.
- state validation and PKCE are enabled (Auth.js defaults) to protect against CSRF and code interception.
- Buttons follow Google and Microsoft branding guidelines and are fully keyboard accessible (focusable, operable via Enter/Space, visible focus ring).
- Tests cover: buttons hidden when unconfigured; role preserved on register OAuth flow; verified-email account linking (and refusal when unverified).
- pnpm/npm typecheck passes and existing tests pass.

## Implementation Plan
### 1. `branch factory/job_sqPIMaV7aNaF`
Start from the prior QA-passed implementation on this branch as a baseline where it aligns with the operator-approved acceptance criteria; reconcile any drift against this spec before finalizing.

### 2. `src/lib/auth-providers.ts (new)`
Add a helper that builds the list of configured OAuth providers. Export isGoogleConfigured() and isMicrosoftConfigured() (checking all required env vars) and a buildProviders() function returning the Auth.js Google/MicrosoftEntraID provider instances with authorization params limited to scope 'openid email profile'. Keep edge-safe: only env reads, no Prisma import. Reuse this in both auth.config.ts (optional) and the server components that decide which buttons to render.

### 3. `src/auth.ts`
Import Google and MicrosoftEntraID providers from next-auth/providers. Conditionally append them to the providers array based on isGoogleConfigured()/isMicrosoftConfigured(). Configure each with authorization.params.scope = 'openid email profile'; PKCE + state are on by default. Add a signIn callback implementing the policy: (1) if account.provider is an OAuth provider, look up user by email; (2) if no user exists, read an intent cookie/state to decide register-with-role vs reject-and-redirect-to-register; (3) if user exists with passwordHash and no linked account, allow linking ONLY when profile email_verified is true, otherwise return false / redirect to an error that routes to /register; (4) set role for newly created OAuth users from the register intent. Use an events.createUser or the adapter flow to stamp the role. Guard logic so credentials flow is unaffected.
*Lines: providers array + callbacks*

### 4. `src/auth.config.ts`
No behavioral change needed for edge middleware, but ensure the jwt/session callbacks still populate token.role for OAuth-created users (role is read from the user record). Add a comment that OAuth providers live only in auth.ts (non-edge).

### 5. `src/lib/actions/oauth.ts (new)`
Add server actions startGoogleSignIn(role?) and startMicrosoftSignIn(role?) that set a short-lived, httpOnly 'oauth_intent' cookie encoding { source: 'login'|'register', role } and then call signIn('google'|'microsoft-entra-id', { redirectTo }). The signIn callback reads this cookie to enforce role preservation and the login-vs-register no-silent-create rule.

### 6. `src/components/forms/oauth-buttons.tsx (new)`
Add a client component rendering the two provider buttons following Google/Microsoft branding (official logos/colors, correct label text), wired to the oauth server actions. Accept props { showGoogle, showMicrosoft, source: 'login'|'register', role? }. Buttons are real <button> elements inside forms, keyboard accessible with visible focus-visible ring and aria-labels. Include an 'or continue with' divider.

### 7. `src/components/forms/login-form.tsx`
Render <OAuthButtons source="login" showGoogle showMicrosoft /> (flags passed from the page based on server-side config checks) below the sign-in button.

### 8. `src/components/forms/register-form.tsx`
Render <OAuthButtons source="register" role={selectedRole} .../> and ensure the currently selected role is passed to the OAuth action (read the checked radio value client-side on button click, or submit role via the server action).

### 9. `src/app/(auth)/login/page.tsx`
Compute isGoogleConfigured()/isMicrosoftConfigured() on the server and pass as props to LoginForm so buttons are hidden when unconfigured. Read optional prefill searchParams (name/email) to pass into the form when redirected back from an OAuth login with no account.

### 10. `src/app/(auth)/register/page.tsx`
Compute provider config flags server-side and pass to RegisterForm; also accept name/email prefill searchParams to prefill fields when OAuth login redirects an unknown user here, while preserving existing role searchParam handling.

### 11. `src/components/forms/login-form.tsx & register-form.tsx (props)`
Add defaultName/defaultEmail prefill props and showGoogle/showMicrosoft props threaded from pages.

### 12. `.env.example`
Add commented GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET and MICROSOFT_CLIENT_ID/MICROSOFT_CLIENT_SECRET/MICROSOFT_TENANT_ID with a note that providers are disabled until set and that no credentials should be committed.

### 13. `package.json`
No new runtime deps needed (Google and MicrosoftEntraID providers ship with next-auth 5). Add a test runner/dev deps only if the repo has none; otherwise reuse existing test setup.

### 14. `tests (new)`
Add tests for: provider config helper (hidden when env unset, shown when set), signIn callback role preservation from register intent, account linking allowed when email_verified true and refused when false, and login-with-no-account redirect to /register with prefill. Mock prisma and env.

## Test Plan
- Config gating: with no provider env vars, login/register pages render no OAuth buttons; with GOOGLE_CLIENT_ID+SECRET set, only the Google button renders; with all three MICROSOFT_* set, only the Microsoft button renders.
- No-crash when unconfigured: visiting /login and /register with empty env produces no runtime error and credentials login still works.
- Role preserved on register: initiating Google/Microsoft sign-in from /register with TEACHER selected creates a user with role TEACHER; with STUDENT selected creates role STUDENT.
- Login no-silent-create: OAuth sign-in from /login for an email with no existing account redirects to /register with name and email prefilled and does not create a user.
- Verified-email linking: existing email/password user signing in via OAuth where profile.email_verified is true links the account successfully.
- Unverified-email refusal: same scenario with email_verified false does not link the account and surfaces an error / redirect to /register.
- Scopes: provider configuration requests exactly 'openid email profile'.
- Security: Auth.js state and PKCE remain enabled for both providers (checksPKCE/state not disabled).
- Accessibility: OAuth buttons are reachable by keyboard, activate on Enter/Space, and show a visible focus ring.
- Regression: npm run typecheck passes and the full existing test suite passes.

## Edge Cases
- Only one provider configured (e.g. Google set, Microsoft unset): only the configured button appears; the other path never initializes a provider.
- Partial Microsoft config (e.g. missing MICROSOFT_TENANT_ID): treat as unconfigured and hide the button rather than crashing at startup.
- User selects a different role on register after already starting OAuth once: intent cookie must reflect the latest selection and expire quickly to avoid stale role leakage.
- OAuth provider returns no email or email_verified absent: treat as unverified; do not link to an existing password account.
- Existing user already linked to the same provider: subsequent sign-ins succeed without re-linking or duplicate Account rows.
- Email case sensitivity: normalize email (lowercase/trim) when matching OAuth email to existing accounts to avoid duplicate users.
- Intent cookie missing/tampered on callback: default to safe behavior (login source => redirect to register with prefill; no silent account creation).
- Edge middleware must not import the OAuth providers or Prisma (auth.config.ts stays edge-compatible).
- CSRF: ensure state/PKCE cookies work under the ALLOWED_ORIGINS/tunnel setup and NEXTAUTH_URL; callback URL must match configured origin.
- Account linking collision: if the OAuth email matches an existing user but a different provider account already exists, avoid creating conflicting Account records.