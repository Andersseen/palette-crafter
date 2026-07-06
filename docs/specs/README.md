# Spec-driven development in this repo

> Goal: a model (or person) less familiar with the project should not start writing code before it's clear **what** is going to be built, **why**, and **how we know it's done right**. This is deliberately lightweight — it's not a corporate process, it's a 10-minute checklist that prevents rework.

## When to write a spec

Write a spec in `docs/specs/<slug>.md` **before** touching code when the change is:

- a new feature (new endpoint, new component, new playground option),
- an API contract change (`/api/v1/theme`: parameters, response shape, error codes),
- a change to the color generation algorithm (`src/shared/theme-generator.ts` / `utils.ts`) that alters existing outputs,
- an architecture change (moving folders, changing how client/server communicate, adding a large dependency).

**No** spec is needed for: a one-off bugfix, a styles/Tailwind tweak, a copy/text correction, or an internal refactor with no observable behavior change.

When in doubt, write the spec — it's cheaper than a half-done change that has to be undone.

## How to write one

1. Copy [`TEMPLATE.md`](./TEMPLATE.md) to `docs/specs/<descriptive-slug>.md` (e.g. `docs/specs/api-batch-themes.md`).
2. Fill in every section. If a section doesn't apply, write "N/A" and why — don't delete it; deliberate absence is information.
3. If you're implementing for someone else / another process (not for yourself in the same session), **stop and wait for spec approval** before writing code. If you're resolving a direct request in the same conversation, you may proceed straight to implementation once the spec is complete and consistent with [CONTEXT.md](../CONTEXT.md) and [CONVENTIONS.md](../CONVENTIONS.md).
4. Implement following the spec. If during implementation the spec turns out to be wrong or incomplete, **update the spec first** — don't improvise silently.
5. When the feature is implemented and merged, move the file to `docs/specs/done/` (same name) as a historical record. Don't delete it — it helps understand past decisions without archaeology in the `git log`.

## What goes in a spec (summary — see the template for detail)

- **Problem**: what can't be done today, or what's wrong, in terms of the user / API consumer — not in terms of code.
- **Goal / Non-goal**: what this aims to solve and what is explicitly left out.
- **Design**: which files it touches, which contracts change (types, API response shape, component props).
- **Impact on the API contract / determinism**: if applicable, say it explicitly (see rule 2 in [CONVENTIONS.md](../CONVENTIONS.md)).
- **Acceptance criteria**: a verifiable, unambiguous list ("the endpoint returns 400 if `harmony` is not one of the 4 valid values", not "validation works well").
- **Out of scope**: what is explicitly left for later.

## Existing specs

- `done/` — specs for features already implemented (empty for now; this system was created retroactively on a project already in motion, so work prior to that date has no written spec — see [STATE.md](../STATE.md) for a summary of what's already built).
