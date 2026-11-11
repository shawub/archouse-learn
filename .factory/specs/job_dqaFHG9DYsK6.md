# Spec: Add footer to the landing page

## Summary
Render the shared Footer component at the bottom of the public landing page (`/`).

## Acceptance Criteria
- The landing page at `/` (src/app/page.tsx) imports and renders the existing `Footer` component from `@/components/footer`.
- The Footer is placed below all landing page content (Nav, Hero, Features) as the last child of the page.
- No footer markup or styles are duplicated — the existing component is reused as-is.
- At 375px and desktop widths, the footer sits below all content and does not overlap it.
- Auth pages (`src/app/(auth)/layout.tsx`) and platform pages (`src/app/(platform)/layout.tsx`) are unchanged.
- Typecheck passes and existing tests pass.

## Implementation Plan
### 1. `src/app/page.tsx`
Add `import { Footer } from '@/components/footer'` alongside the existing imports.
*Lines: top imports*

### 2. `src/app/page.tsx`
Change the root wrapper to a flex column that fills the viewport so the footer can sit at the bottom: replace `<div className="min-h-screen bg-white">` with `<div className="min-h-screen bg-white flex flex-col">`. Keep the Nav, Hero (main), and Features (section) as-is.
*Lines: root wrapper div*

### 3. `src/app/page.tsx`
Add `<Footer />` as the last child inside the root wrapper div, after the Features `</section>`. Optionally wrap existing content so the footer is pushed to the bottom — simplest is to leave content flowing naturally and render `<Footer />` at the end; with flex-col the footer sits below all content. No layout change needed beyond ordering.
*Lines: after Features section, before closing root div*

## Test Plan
- Visit `/` as an unauthenticated user: the Footer (`© {year} archouse`) renders once at the bottom of the page, below the Features section.
- Verify the footer does not overlap content at 375px (mobile) and at a typical desktop width (e.g. 1280px).
- Verify the footer uses the existing component markup (border-t, py-4, centered xs gray text) — no duplicated markup.
- Visit an auth page (e.g. `/login`) and confirm its footer and layout are unchanged.
- Visit a platform page (e.g. `/teacher/dashboard` when logged in) and confirm its footer and layout are unchanged.
- Run typecheck (`tsc --noEmit` / `next build` typecheck) — passes with no errors.
- Run the existing test suite — all tests pass.

## Edge Cases
- Authenticated users are redirected away from `/` before render, so the Footer only appears for unauthenticated visitors — ensure the redirect path still runs before returning JSX.
- The landing page is a Server Component (`async` + `auth()`); `Footer` is a Server Component with no 'use client', so it can be rendered directly without client boundary issues.
- Short content on large viewports: with the page using normal flow, ensure the footer is not fixed/floating and simply appears after content; `flex flex-col` keeps it below content without overlap.
- Avoid introducing a second footer if a shared root layout footer is later added — only add it in page.tsx per the issue scope.
- The `new Date().getFullYear()` call runs on the server at render time; no hydration mismatch risk since it is a Server Component.