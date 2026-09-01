# Guide for agents / AI models

This file is the entry point for any AI model or tool working on this repo (Claude Code, Cursor, Codex, etc.). It is intentionally short — the depth lives in `docs/`.

## Read in this order

1. [docs/CONTEXT.md](./docs/CONTEXT.md) — what this project is, who it exists for, what it aims to achieve. Read it if this is your first time here.
2. [docs/STATE.md](./docs/STATE.md) — snapshot of the current state: what works, what's missing, what's broken. Paste it at the start of a new session if you need quick context without re-exploring the whole repo.
3. [docs/CONVENTIONS.md](./docs/CONVENTIONS.md) — hard rules of this repo and why they exist (breaking them breaks SSR, the public API, or the playground/API parity).
4. [docs/specs/README.md](./docs/specs/README.md) — before implementing a non-trivial feature, write a spec using the template in `docs/specs/TEMPLATE.md`. A one-line fix doesn't need one; a new feature or an API contract change does.

## The bare minimum if you won't read anything else

- `src/shared/` (the color generator) is used **simultaneously** by the Angular client and the API endpoint — don't put anything Angular/DOM-specific in there, and any algorithm change affects both consumers at once.
- The same `seed` on `/api/v1/theme` must always return the same result — it's a public contract, don't change it silently.
- Tests exist and run with `pnpm test`; there is still no linter configured (see STATE.md).
- `@voltui/components` is an external library (sibling repo `volt-ui`, version 0.6.0) — don't modify it from here.

## Keep these documents up to date

If your change alters anything described in `docs/STATE.md` (a new feature, a test that now exists, a fix for one of the listed inconsistencies), update that file as part of the same change. An outdated state document is worse than having none.
