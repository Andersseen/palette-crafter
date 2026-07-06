# Project context — Palette Forge

> Read this first if it's your first time in the repo. It explains **why** the project exists, not the how (that's in [CONVENTIONS.md](./CONVENTIONS.md) and in the code).

## What it is

Palette Forge (npm and repo name: `palette-forge`; until 2026-07-06 it was called `palette-crafter`, and traces of the old name may remain in seeds or in the old Cloudflare project) is an Angular + AnalogJS app that does two things with the same color generation engine:

1. **Visual playground** (`/`): a page where the user generates color themes (primary/secondary palette + status colors + background/text) and sees the result applied live to real UI components (`@voltui/components`).
2. **HTTP API** (`/api/v1/theme`): the same generator exposed as a `GET`/`POST` endpoint so other apps can request a pre-computed theme (hex colors, 50–950 scales, accessible contrast) and use it in their own Tailwind config.

The project's golden rule: **the playground and the API can never diverge**, because they literally share the same function (`generateTheme` in `src/shared/theme-generator.ts`). If something changes the generator's output, it changes for both consumers at once.

## Who it exists for

- Designers/frontend teams who want a coherent palette starting point (WCAG contrast, 50–950 scales) without opening Figma.
- Other apps/services (including `volt-ui` itself, the sibling design system by the same author) that want to request a theme over HTTP instead of reimplementing color logic.

## What it is NOT (non-goals)

- Not a pixel-by-pixel color editor or an arbitrary manual HSL picker — the input is "intent" (mode, base hue, harmony type, seed), the output is always a complete, accessible palette.
- Not a multi-tenant backend with users/auth — there is no database, no login. The user's "state" is local (localStorage) and ephemeral.
- Not a design system in itself — the UI components (buttons, dialogs, checkboxes) come from `@voltui/components`, an external package. This repo consumes that system, it doesn't define it.

## Project goals (what it aims to achieve)

- Any external app can request `GET /api/v1/theme?mode=dark&seed=brand-a&harmony=triadic&baseHue=220` and always get the same result for the same `seed` (deterministic generation).
- The output is accessible by default: the text/background pair is adjusted until it meets contrast ≥ 4.5:1 (`ensureAccessibleForeground` in `theme-generator.ts`), and each scale ships a white/black `foreground` chosen by contrast (best-effort, see the nuance in [STATE.md](./STATE.md)).
- The playground user can copy a Tailwind v4 `@theme { ... }` block ready to paste into their own project ("Copy Tailwind @theme" button in `export-panel.ts`).
- Simple, cheap deploys: Cloudflare Pages via Wrangler, with no server infrastructure of our own to maintain.

## Relationship with `volt-ui`

`@voltui/components` is an Angular component library (button, dialog, checkbox, separator, etc.) published by the same author (Andersseen); its source code lives in a sibling repo (`volt-ui/projects/volt/src/lib/components`). Palette Forge is, in part, a **real consumer / demo** of that library — use it as a reference for component APIs if you need to see how they're used (`VoltButton`, `VoltDialog`, `VoltCheckbox`, `VoltCard`, `VoltSeparator`, etc.), but **don't modify it from here**: changes to the components belong in the `volt-ui` repo, not in `palette-forge`.

## Related documents

- [STATE.md](./STATE.md) — snapshot of the current state (what exists, what's missing, what's broken). Paste it at the start of a new session if you need quick context.
- [CONVENTIONS.md](./CONVENTIONS.md) — concrete rules of this repo (what not to break and why).
- [specs/README.md](./specs/README.md) — how to spec a feature before touching code (spec-driven development).
