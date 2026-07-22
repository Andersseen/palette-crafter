# Current state — Palette Forge

> Snapshot meant to be pasted at the start of a new session (with any model/tool) when there's no time for it to read the whole repo. Update it when you finish a relevant change — otherwise it lies and confuses more than it helps.
>
> Last updated: 2026-07-22 (branch `main`; claims verified by running the test suite, the build, and curl against a dev server on that date).

## One-sentence summary

Angular 21 + AnalogJS app that generates deterministic, accessible color palettes, served in a visual playground (`/`), an HTTP API (`/api/v1/theme` frozen, `/api/v2/theme` current) and a publishable npm package, deployed on Cloudflare Pages.

## What exists and works

- **Generation engine** (`src/shared/`): pure TypeScript, no Angular or DOM dependencies. Two algorithms:
  - **`v1` — frozen.** HSL scales on a fixed lightness ramp. Every seed in the wild depends on its exact output. Do not change it (see CONVENTIONS.md #2).
  - **`v2` — current.** OKLCH perceptual scales, chroma tapering at both ends, gamut mapping by chroma reduction (never RGB clipping, which shifts hue). The input color is preserved *exactly* at the shade matching its lightness, so `baseColor` puts your real brand hex in the palette. Body text targets WCAG AAA (7:1). Base lightness is 0.52 light / 0.72 dark — chosen because those are the values where every hue agrees on white/black button labels.
  - Selected via `algorithm: "v1" | "v2"`, **defaulting to `v1`** so no existing consumer moves silently.
- **Export module** (`src/shared/export.ts`): six formats — Tailwind v4 `@theme`, plain CSS variables, SCSS, JSON, shadcn/ui, and W3C Design Tokens. Emits **literal color values**, so a pasted snippet works in a project that does not have this app's runtime variables.
- **Contrast module** (`src/shared/contrast.ts`): audits the pairs the theme actually renders, composites semi-transparent tokens at their real opacity, and — when a check fails — suggests the scale shade that would pass.
- **API** (`src/server/handlers/theme.ts`, shared by both routes): `GET`/`POST`, CORS with a real `OPTIONS` preflight (204), `Cache-Control` that allows edge caching for seeded requests and forbids it for random ones, coherent 400s for every invalid parameter, `?format=` to get a rendered export directly and `?contrast=true` for the audit.
- **Playground** (`src/components/*`, `src/app/pages/(home).page.ts`): brand-color input, per-token lock so you can keep the primary and reroll the rest, live accessibility report, export panel with format switcher, copy and download, shareable permalink.
- **Client state** (`src/services/color-palette.ts`, signals, `providedIn: root`): generates **in-process** from the shared generator — parity comes from the shared function, not from HTTP. Only calls the API when `THEME_API_BASE_URL` points at a remote instance, and then via GET.
- **SSR + hydration**: zoneless, `provideClientHydration(withEventReplay())`, `/` prerendered. CSS variables are written on the server too, so **the prerendered document already carries the palette** (193 custom properties on `<html>`) — no flash of default colors.
- **npm package**: `pnpm build:core` compiles `src/shared` to `dist/core` as `@palette-forge/core` (ESM + types, zero dependencies, verified running in plain Node). **Not yet published.**
- **Tests**: 100 across 7 files. `pnpm test`.
- **Deploy**: Cloudflare Pages via Wrangler. `pnpm build:cf` → `pnpm deploy:cf`, plus a GitHub Action on push to `main`. Output dir is `dist/analog/public`.

## What's missing / broken (don't assume it works)

- **No linter or formatter configured.** No `eslint.config.*` or `.prettierrc`. The existing code style is the only contract — imitate it.
- **The npm package is built but not published.** `@palette-forge/core` needs the scope reserved and `npm publish dist/core --access public` run deliberately.
- **Only the service is covered by Angular tests.** `src/test-setup.ts` initialises the TestBed, so component tests are possible, but none exist.
- **The `Border` contrast check reports Fail** for the deliberately subtle 0.2-alpha divider. This is reported honestly rather than hidden; if you want WCAG 1.4.11 compliance for non-text UI, the border token needs to be stronger.
- **Exports cover the current mode only.** Emitting `:root` plus `.dark` in one file would require generating both themes.
- **Cloudflare project rename leftover**: `wrangler.jsonc.name` is `palette-forge`, so the Pages project must exist (`wrangler pages project create palette-forge --production-branch=main`) or CI deploy fails. The old `palette-crafter` project still exists on Cloudflare until deleted manually.
- **The home seed is still `"palette-crafter-home"`** (`src/services/color-palette.ts`) **on purpose** — the seed determines the output, so renaming it changes the default palette.
- **A single real page.** `/` is the only content route.

## Architecture in 30 seconds

```
src/shared/           → pure logic: color math, generator, exports, contrast.
                        No Angular/DOM imports. Also shipped as an npm package.
                        Internal imports use .js extensions so the built
                        package is valid ESM.
src/server/handlers/  → shared API logic (validation, CORS, caching)
src/server/routes/    → thin h3/Nitro route files: api/v1/theme.ts, api/v2/theme.ts
src/services/         → Angular state (signals); generates locally, HTTP only if configured
src/components/       → standalone Angular UI components
src/app/pages/        → AnalogJS file-based routes
```

Actual flow: user interacts → `ColorPalette` calls `generateTheme` in-process → signals update → CSS vars written to `documentElement` → permalink synced to the URL and theme cached in localStorage. External consumers hit `/api/v2/theme`, which calls the *same* `generateTheme`.

## Testing

```bash
pnpm test          # 100 tests
pnpm test:watch
```

The most important file is `src/shared/theme-generator.contract.spec.ts`: it freezes the v1 output. Its hardcoded expectations cannot be rewritten by `vitest -u` — that is deliberate. **If it fails, you changed the public contract**, which is a breaking change, not a fix.

## How to run the project

```bash
pnpm install
pnpm dev            # http://localhost:4200
pnpm build:cf && pnpm dev:cf   # preview with the Cloudflare Pages preset
pnpm build:core     # build the npm package into dist/core
```

## Related documents

- [CONTEXT.md](./CONTEXT.md) — why the project exists, who it's for.
- [CONVENTIONS.md](./CONVENTIONS.md) — concrete rules of this repo.
- [specs/done/v2-algorithm-and-tooling.md](./specs/done/v2-algorithm-and-tooling.md) — why v2 exists and what was deliberately left alone.
