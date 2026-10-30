# Spec: Add a footer with copyright year to all pages

## Summary
Add a shared Footer component displaying "© [current year] archouse" and render it on all auth and platform pages via their layouts.

## Acceptance Criteria
- A new `Footer` component exists at `src/components/footer.tsx` and is exported for reuse.
- The footer renders a single centred line in the exact format `© [current year] archouse`, where the year is computed dynamically via `new Date().getFullYear()`.
- The footer is styled consistently with the existing design: a light `border-t` (e.g. `border-gray-100`/`border-gray-200`) and small, muted text (e.g. `text-sm`/`text-xs` with `text-gray-400`/`text-gray-500`), horizontally centred.
- The footer appears on all auth pages (login, register) by rendering it in `src/app/(auth)/layout.tsx`.
- The footer appears on all platform pages (dashboard, courses, etc.) by rendering it in `src/app/(platform)/layout.tsx`.
- The footer sits at the bottom of the page without overlapping or pushing out existing content; on the auth layout it stays below the centred card, and on the platform layout it stays below the scrollable main content.

## Implementation Plan
### 1. `src/components/footer.tsx`
Create a new server-compatible React component named `Footer` (named export `export function Footer()`). It returns a `<footer>` element with Tailwind classes for a light top border, centred layout, and small muted text, e.g. `<footer className="border-t border-gray-100 py-4 text-center text-xs text-gray-400">`. Inside it renders the copyright line using a template literal: `{`© ${new Date().getFullYear()} archouse`}`.
*Lines: entire new file*

### 2. `src/app/(auth)/layout.tsx`
Import `Footer` from `@/components/footer`. The root div already uses `min-h-screen flex flex-col`; render `<Footer />` as the last child of that flex-column div, after the `flex-1` centering wrapper, so the footer sits pinned below the card.
*Lines: add import at top; add `<Footer />` before the closing `</div>` of the outer flex-col container*

### 3. `src/app/(platform)/layout.tsx`
Import `Footer` from `@/components/footer`. Wrap the `<main>` content so the footer appears below it within the main column. Convert `<main>` into a flex column (`flex flex-col`), keep the inner `max-w-5xl` content wrapper with `flex-1`, and add `<Footer />` after it inside `<main>` so the footer spans the main content area beneath the page content.
*Lines: add import at top; adjust `<main>` structure and append `<Footer />`*

## Test Plan
- Render the `Footer` component in isolation and assert it displays text matching `© <year> archouse` where `<year>` equals `new Date().getFullYear()`.
- Verify `Footer`'s root element is a `<footer>` with classes including a top border and muted small text, and that content is centred.
- Visit the login page (`/login`) and confirm the footer is visible at the bottom of the page.
- Visit the register page and confirm the footer is visible at the bottom.
- Visit the student dashboard (`/student/dashboard`) and confirm the footer renders below the dashboard content.
- Visit a courses page under the platform layout and confirm the footer renders consistently.
- Snapshot/visual check: footer year updates to the current year (mock the system date to a known year and assert the rendered text).

## Edge Cases
- Year boundary: text must reflect the current year at render time (server-rendered), not a hardcoded value.
- Short-content pages: on auth layout, ensure the `min-h-screen flex flex-col` keeps the footer at the bottom without overlapping the centred card.
- Long/scrollable platform pages: the platform `<main>` uses `overflow-auto`; ensure the footer scrolls with content and does not get clipped or detached when content exceeds viewport height.
- Casing: the brand word must be lowercase `archouse` exactly as specified, even though other UI uses `Archouse Learn`.
- Server component context: ensure `Footer` does not require client-only hooks so it can be rendered inside server-component layouts without a `'use client'` directive.