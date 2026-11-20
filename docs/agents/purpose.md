# Repo Purpose

## What it is

`PURPOSE.md` at the repo root is the product north star: who the platform is for, what it does, what it explicitly doesn't do, and non-negotiable constraints. It is intentionally short — an agent must be able to hold it in one context window.

It is not a spec. Implementation detail does not belong here.

## When to read it

- **Before naming a wayfinder destination** — confirm the new effort is in scope before charting a map. A destination that conflicts with PURPOSE.md is a signal to either narrow the scope or evolve the purpose first.
- **During triage** — validate incoming issues against PURPOSE.md before assigning labels. Issues outside it get `wontfix` with a reason, not silent discard.
- **During grilling** — use PURPOSE.md to constrain options. When a user proposes something that conflicts with it, surface the conflict before resolving the ticket.

## How to evolve it

**Grilling (small refinement):** load the `grilling` skill for a focused 3–5 question session challenging a specific boundary ("should we allow school-level accounts?"). The resolved answer produces a targeted edit to PURPOSE.md. Commit the change named after the question.

**Wayfinder (significant shift):** when a direction change would affect multiple specs or existing decisions, chart a map with destination = "revised PURPOSE.md". Decisions in the map become the update. Close the map when PURPOSE.md is updated and the downstream specs are flagged for review.

## What triggers an evolution

- A proposed issue or spec that is clearly valuable but sits outside the current scope
- A constraint that turns out to be wrong or unenforceable
- A new external obligation (regulatory, legal, platform) that changes the non-negotiables

## What doesn't trigger an evolution

- A single edge-case ticket that sits close to the boundary — that's triage, not a purpose change
- An implementation decision — PURPOSE.md never names modules, schemas, or routes
