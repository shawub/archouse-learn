# Spec: Add a footer with copyright year to all pages

## Summary
Add a shared Footer component displaying "© 2026 archouse" and render it at the bottom of every page across all layouts.

## Acceptance Criteria
- A reusable Footer component exists at src/components/footer.tsx and renders the text "© 2026 archouse".
- The footer appears at the bottom of every page: auth pages, platform pages, and any pages rendered directly by the root layout.
- The footer is pinned to the bottom of the viewport on short pages and sits below content on tall pages (sticky-footer behaviour, no overlap).
- The footer uses existing Tailwind utility classes and is visually consistent with the app (muted gray text, border separator, appropriate padding).
- The copyright year renders dynamically-safe but shows 2026 as specified (static string acceptable).
- No existing layout functionality (auth redirect, sidebar, max-width content container) is broken.

## Implementation Plan
### 1. `src/components/footer.tsx`
Create a new server component `Footer` that returns a <footer> element with Tailwind classes, e.g. `<footer className="border-t border-gray-100 px-6 py-4 text-center text-xs text-gray-400">© 2026 archouse</footer>`. Keep it presentational and stateless so it can be used in both server and client contexts.

### 2. `src/app/(auth)/layout.tsx`
Import Footer and render it as the last child inside the root flex-col div, after the flex-1 content wrapper. Because the container is `min-h-screen flex flex-col` with a `flex-1` content area, the footer will naturally sit at the bottom.
*Lines: render <Footer /> just before closing the outer div*

### 3. `src/app/(platform)/layout.tsx`
Restructure the <main> to be a flex column (`flex-1 bg-gray-50 overflow-auto flex flex-col`) so the content container can be wrapped with a `flex-1` div and the Footer placed after it, keeping the footer at the bottom of the main scroll area. Import and render <Footer /> after the content container.
*Lines: wrap content div, add Footer at bottom of <main>*

### 4. `src/app/layout.tsx`
Make the body a full-height flex column (`${inter.className} min-h-screen flex flex-col`) and wrap {children} in a `flex-1` container, then render <Footer /> after it. This guarantees any page not covered by the auth/platform group layouts (e.g. the root landing page) still shows the footer. Import Footer.
*Lines: update body className, wrap children, add Footer*

## Test Plan
- Visit the public landing page (/) and confirm the footer "© 2026 archouse" is visible at the bottom.
- Visit an auth page (/login) and confirm the footer appears at the bottom and does not overlap the centered card.
- Sign in and visit a platform page (e.g. /teacher/dashboard) and confirm the footer appears at the bottom of the main content area, below the sidebar-adjacent content.
- On a page with little content, confirm the footer is pinned to the bottom of the viewport (not floating mid-screen).
- On a page with content taller than the viewport, confirm the footer sits below content and scrolls into view rather than overlapping.
- Verify no duplicate footer appears on pages nested in the group layouts (each page should show exactly one footer).

## Edge Cases
- Avoid double footers: since both the root layout and group layouts render a footer, decide on a single ownership strategy. Recommended: render Footer only in the root layout so every page gets exactly one footer, and skip adding it to group layouts to prevent duplicates. If per-layout styling is needed, instead render it ONLY in each group layout and NOT the root — but then the root landing page would lack a footer. The spec chooses root-only ownership to guarantee universal coverage with no duplicates; if group layouts are also edited, they must not re-render Footer.
- Platform layout uses `overflow-auto` on <main>; ensure the footer is inside the scroll container so it is reachable, and flex layout prevents it overlapping content.
- Sidebar has `min-h-screen`; ensure footer placement in the content column does not push total page height beyond viewport causing unexpected scroll on empty pages.
- Group layout route groups ((auth), (platform)) share the root layout, so a root-level footer will render for them automatically — confirm this is intended and remove any group-layout footers to avoid duplication.
- Ensure the footer text uses a literal © character correctly encoded in JSX (use {'©'} or the character directly) to avoid rendering issues.