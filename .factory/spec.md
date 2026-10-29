# Spec: Add a hello world page

## Summary
Add a Next.js App Router page at /hello that displays a "Hello World" heading and a welcome message, styled with Tailwind.

## Acceptance Criteria
- Navigating to /hello renders a page with an h1 heading reading "Hello World".
- The page displays a one-sentence welcome message below the heading.
- The page uses Tailwind utility classes consistent with the existing codebase (e.g. brand color palette, centered layout).
- The new file lives at src/app/hello/page.tsx and is the default export of a React component.
- `npm run typecheck` passes with no new type errors.
- `npm run build` succeeds and the /hello route is generated.

## Implementation Plan
### 1. `src/app/hello/page.tsx`
Create a new file. Define and default-export a React component named HelloPage. It should return a centered full-height container using Tailwind classes consistent with the existing design (e.g. min-h-screen, flex, items-center, justify-center, bg-white or bg-gray-50). Inside, render an <h1> with "Hello World" using text-4xl/text-5xl font-bold text-gray-900 (optionally text-brand-600 accent), and a <p> with a one-sentence welcome message such as "Welcome to Archouse Learn — we're glad you're here." styled with text-gray-500. No imports beyond React are required; the component can be a plain synchronous function (no async/auth needed).
*Lines: new file*

## Test Plan
- Run `npm run dev` and visit http://localhost:3000/hello — confirm the heading "Hello World" and the welcome sentence render.
- Run `npm run typecheck` — confirm no type errors are introduced.
- Run `npm run build` — confirm the build succeeds and /hello appears in the route manifest.
- Visually confirm Tailwind styling is applied (centered content, heading sizing, muted welcome text).

## Edge Cases
- Ensure the component is a default export so the App Router picks it up as a page.
- Avoid adding auth() or redirect() logic — unlike the landing page, /hello should be publicly accessible with no server-side dependencies.
- Use only Tailwind classes that exist/are generated (standard utilities plus the configured brand palette); avoid undefined custom classes.
- Keep the component synchronous (no async) since there is no data fetching, to avoid unnecessary server-component overhead.
- Use valid JSX with a single root element to prevent build errors.