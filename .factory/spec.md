# Spec: Add a footer with copyright year to all pages

## Summary
Add a shared Footer component displaying "© 2026 archouse" to the bottom of every page across all layouts.

## Acceptance Criteria
- A footer showing "© 2026 archouse" appears at the bottom of every page in the application.
- The footer renders on platform pages (src/app/(platform)/layout.tsx).
- The footer renders on auth pages (src/app/(auth)/layout.tsx).
- The copyright year is dynamic (derived from the current year) so it reads 2026 in 2026 and updates automatically in future years.
- The footer is styled consistently with existing Tailwind classes (muted gray text, consistent padding, border separator).
- The footer is always positioned at the bottom of the viewport even when page content is short (sticky/push-to-bottom layout).
- A single reusable Footer component is created and used by all layouts rather than duplicating markup.

## Implementation Plan
### 1. `src/components/nav/footer.tsx`
Create a new reusable server component `Footer`. It renders a <footer> element with Tailwind classes consistent with the codebase (e.g. `border-t border-gray-100 bg-white px-6 py-4 text-center text-sm text-gray-500`). Text content: `© {new Date().getFullYear()} archouse`. Export as a named export `Footer`.
*Lines: new file*

### 2. `src/app/(platform)/layout.tsx`
Import `Footer` from '@/components/nav/footer'. Restructure the <main> so its inner content area and the footer stack vertically: wrap the content container and footer in a flex column that fills height (e.g. make <main> `flex flex-col`, keep the max-w content div, and append <Footer /> after it so the footer sits at the bottom of the scroll area / page). Use `mt-auto` on the footer wrapper if needed to push it down.
*Lines: main section*

### 3. `src/app/(auth)/layout.tsx`
Import `Footer` from '@/components/nav/footer'. Add <Footer /> as the last child of the outer `min-h-screen flex flex-col` container, after the centered content div, so it sits at the bottom of the page.
*Lines: outer div*

## Test Plan
- Visit a platform page with short content and confirm the footer "© 2026 archouse" is visible at the bottom of the viewport.
- Visit a platform page with long/scrolling content and confirm the footer appears at the end of the scrollable content without overlapping.
- Visit an auth page (e.g. /login) and confirm the footer appears at the bottom.
- Confirm the year rendered matches the current year (2026) and is not hardcoded.
- Snapshot/render test of the Footer component asserts it outputs a <footer> element containing the text `archouse` and the current year.
- Verify footer styling classes (text-gray-500, text-sm, border-t) are applied.

## Edge Cases
- Short-content pages: footer must stay at bottom without large gap artifacts (handle with flex-col + mt-auto or min-h-screen).
- Long-content pages inside the (platform) layout's `overflow-auto` main: ensure footer scrolls into view at the end rather than being clipped.
- Year rollover: using new Date().getFullYear() means tests asserting a hardcoded 2026 will break after 2026 — assert against the computed current year instead.
- Server vs client rendering of new Date(): since layouts are server components, the year is computed at render time on the server, avoiding hydration mismatch; keep Footer a server component (no 'use client').
- The root layout (src/app/layout.tsx) wraps both route groups; if a page exists outside both (auth) and (platform) groups it would lack a footer — consider whether footer should instead live in the root layout to truly cover ALL pages.
- Accessibility: use semantic <footer> element so it maps to the contentinfo landmark.