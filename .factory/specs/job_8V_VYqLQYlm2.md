# Spec: Add Google and Microsoft sign-in behind configuration (retry of sqPIMaV7aNaF)

## Summary
Add optional Google and Microsoft Entra ID OAuth sign-in to /login and /register via Auth.js, gated on environment configuration, shipping disabled by default.

## Acceptance Criteria
- "Continue with Google" and "Continue with Microsoft" buttons appear on both /login and /register, wired to Auth.js OAuth providers using the app's existing next-auth v5 beta approach.
- Each provider is registered only when its environment variables are present: Google requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET; Microsoft requires MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, and MICROSOFT_TENANT_ID. When a provider's variables are absent, its button is not rendered and the app builds, typechecks, and runs without error.
- No credentials or secrets are committed to the repository; the feature is disabled by default because no provider env vars are set.
- All four variables (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_TENANT_ID) are documented in .env.example with placeholder values and explanatory comments.
- First-time OAuth sign-in initiated from /register preserves the chosen role (TEACHER or STUDENT) and the new user is created with that role; default role remains STUDENT when none is supplied.
- First-time OAuth sign-in initiated from /login where no matching account exists does NOT silently create an account; instead the user is redirected to /register with name and email prefilled from the OAuth profile.
- An existing email/password (credentials) account is automatically linked to the OAuth provider account only when the provider reports the email as verified; unverified-email profiles are not auto-linked.
- OAuth requests use only the minimal scopes: openid, email, profile (plus provider-required equivalents for Microsoft/Entra).
- OAuth flows validate the state parameter and use PKCE (Auth.js defaults) to protect against CSRF and authorization-code interception; these are not disabled.
- Provider buttons follow Google and Microsoft branding guidelines (correct logos, wording, colors) and are keyboard accessible (focusable, Enter/Space activatable, visible focus ring, accessible names).
- Automated tests cover: buttons hidden when provider unconfigured, role preserved through OAuth register flow, and verified-email account linking (vs. no-link when unverified).
- npm run typecheck passes and all existing tests continue to pass.

## Implementation Plan
### 1. `src/lib/auth-providers.ts`
New module exporting a function/const that conditionally builds the OAuth provider list. Import Google from 'next-auth/providers/google' and Microsoft Entra ID from 'next-auth/providers/microsoft-entra-id'. Add Google only when GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET are set, configured with authorization scope 'openid email profile'. Add Microsoft only when MICROSOFT_CLIENT_ID && MICROSOFT_CLIENT_SECRET && MICROSOFT_TENANT_ID are set, configured with issuer/tenant and scope 'openid email profile'. Also export booleans googleEnabled / microsoftEnabled (and a helper getEnabledOAuthProviders()) usable from both server auth and UI. Keep PKCE and state at Auth.js defaults (checks: ['pkce','state']).

### 2. `src/auth.ts`
Spread the conditionally-built OAuth providers into the providers array alongside the existing Credentials provider. Add signIn and (if needed) createUser event/callback logic: (1) a signIn callback that, for OAuth sign-ins where no user exists and the flow originated from /login, prevents silent account creation and redirects to /register with name & email prefilled; (2) account-linking logic that links an OAuth account to an existing credentials user only when the provider reports email_verified/verified true. Use allowDangerousEmailAccountLinking=false and implement controlled linking explicitly, or gate linking on verified email within the signIn callback. Ensure role from register flow is applied to newly created OAuth users.

### 3. `src/auth.config.ts`
If OAuth provider names must be known to the edge/middleware JWT config, keep edge config free of Prisma/node-only provider instantiation. Only add provider id references if required; otherwise leave unchanged. Ensure jwt/session callbacks still populate role for OAuth users (role may come from DB via adapter on first JWT issuance).

### 4. `src/lib/actions/auth.ts`
Add server actions to initiate OAuth sign-in: e.g. oauthSignInAction(provider, { role?, callbackUrl }) that calls signIn(provider, { redirectTo }) and passes role/origin context (via callbackUrl query or signIn params) so the role from /register and the originating page (/login vs /register) are preserved through the OAuth round-trip. Alternatively encode role and origin in the callbackUrl/state-adjacent param consumed by the auth.ts signIn callback.

### 5. `src/components/oauth-buttons.tsx`
New client/server component rendering the Google and Microsoft buttons. Accepts props: origin ('login'|'register') and optional role. Reads enabled flags (passed from server as props to avoid leaking server-only imports into client bundle) and renders only enabled providers. Buttons use branded markup (Google 'G' logo + 'Continue with Google'; Microsoft four-square logo + 'Continue with Microsoft'), correct colors, type=button, accessible names, and visible focus styles. On click/submit, invoke the oauth sign-in server action with origin and role.

### 6. `src/components/forms/login-form.tsx`
Render an 'or' divider and the OAuthButtons component (origin='login') beneath the credentials form. Receive enabled-provider flags via props from the page (server) so the client form does not import server-only env logic directly.

### 7. `src/components/forms/register-form.tsx`
Render an 'or' divider and the OAuthButtons component (origin='register') passing the currently selected role so it is preserved through the OAuth flow. Receive enabled-provider flags via props from the page.

### 8. `src/app/(auth)/login/page.tsx`
Compute enabled provider flags server-side (import from src/lib/auth-providers) and pass them (plus any defaultEmail from searchParams for the prefill-from-register redirect) into LoginForm.

### 9. `src/app/(auth)/register/page.tsx`
Compute enabled provider flags server-side and pass them into RegisterForm. Read optional name and email from searchParams (set by the /login no-account redirect) to prefill the registration form; keep existing role handling.

### 10. `.env.example`
Add a documented 'Optional OAuth providers' section with GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_TENANT_ID placeholders and comments noting that leaving them blank disables the respective button and that credentials are configured by the owner.

### 11. `package.json`
Add a test runner (e.g. vitest) and a 'test' script if none exists, plus any needed devDependencies, so the required tests can run as part of 'existing tests pass'. If a runner is already present in the branch factory/job_sqPIMaV7aNaF being reused, align with it instead of adding a new one.

### 12. `src/lib/__tests__/auth-providers.test.ts`
Tests asserting getEnabledOAuthProviders()/flags: no OAuth providers when env unset; Google present when its two vars set; Microsoft present only when all three vars set; scopes limited to openid/email/profile.

### 13. `src/lib/__tests__/oauth-flow.test.ts`
Tests for the auth.ts signIn callback logic: role preserved for new OAuth user from register origin; login-origin with no account redirects to /register (no user created); existing credentials account linked only when email verified, not linked when unverified.

## Test Plan
- Unit: with no OAuth env vars set, getEnabledOAuthProviders() returns an empty list and both googleEnabled/microsoftEnabled are false.
- Unit: with GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET set, Google provider is included and configured with scope 'openid email profile'; absent either var, it is excluded.
- Unit: Microsoft provider is included only when MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, and MICROSOFT_TENANT_ID are all set; missing any one excludes it.
- Component/render: LoginForm and RegisterForm render no OAuth buttons when flags are false; render Google and/or Microsoft buttons when respective flags are true.
- Accessibility: rendered OAuth buttons have type=button, accessible names ('Continue with Google' / 'Continue with Microsoft'), are focusable, and expose a visible focus style.
- Flow: OAuth sign-in from /register with role=TEACHER creates a new user whose role is TEACHER; with role=STUDENT (or unspecified) role is STUDENT.
- Flow: OAuth sign-in from /login with no matching account does not create a user and results in a redirect to /register with name and email query params populated from the profile.
- Flow: existing credentials user with matching email is linked to the OAuth account when the profile email is verified.
- Flow: existing credentials user is NOT auto-linked when the profile email is unverified.
- Security: provider configs retain checks including 'pkce' and 'state' (not disabled); allowDangerousEmailAccountLinking is not enabled.
- Project: npm run typecheck passes; the full existing test suite passes.

## Edge Cases