# Current state — Palette Crafter

> Snapshot meant to be pasted at the start of a new session (with any model/tool) when there's no time for it to read the whole repo. Update it when you finish a relevant change — otherwise it lies and confuses more than it helps.
>
> Last updated: 2026-07-22 (branch `main`; claims verified by running the test suite, the build, and curl against a dev server on that date).

## One-sentence summary

Angular 21 + AnalogJS app that generates deterministic, accessible color palettes, served in a visual playground (`/`) and an HTTP API (`/api/v1/theme` frozen, `/api/v2/theme` current), deployed on Cloudflare Pages.

## What exists and works

- **Generation engine** (`src/shared/`): pure TypeScript, no Angular or DOM dependencies. Two algorithms:
  - **`v1` — frozen.** HSL scales on a fixed lightness ramp. Every seed in the wild depends on its exact output. Do not change it (see CONVENTIONS.md #2).
  - **`v2` — current.** OKLCH perceptual scales, chroma tapering at both ends, gamut mapping by chroma reduction (never RGB clipping, which shifts hue). The input color is preserved _exactly_ at the shade matching its lightness, so `baseColor` puts your real brand hex in the palette. Body text targets WCAG AAA (7:1). Base lightness is 0.52 light / 0.72 dark — chosen because those are the values where every hue agrees on white/black button labels.
  - Selected via `algorithm: "v1" | "v2"`, **defaulting to `v1`** so no existing consumer moves silently.
- **Export module** (`src/shared/export.ts`): six formats — Tailwind v4 `@theme`, plain CSS variables, SCSS, JSON, shadcn/ui, and W3C Design Tokens. Emits **literal color values**, so a pasted snippet works in a project that does not have this app's runtime variables.
- **Contrast module** (`src/shared/contrast.ts`): audits the pairs the theme actually renders, composites semi-transparent tokens at their real opacity, and — when a check fails — suggests the scale shade that would pass.
- **API** (`src/server/handlers/theme.ts`, shared by both routes): `GET`/`POST`, CORS with a real `OPTIONS` preflight (204), `Cache-Control` that allows edge caching for seeded requests and forbids it for random ones, coherent 400s for every invalid parameter, `?format=` to get a rendered export directly and `?contrast=true` for the audit.
- **Playground** (`src/components/*`, `src/app/pages/(home).page.ts`): laid out as a tool, not a landing page — a sticky command bar (`command-bar.ts`) holds generate / brand color / mode / options plus provenance chips (seed, harmony, hue, algorithm, WCAG pass count); a sticky left rail shows the base, brand and status swatches; the right side is a panel switcher over Scales / Preview / Export / Accessibility. Keyboard: `G` generate, `D` mode, `1`/`2` lock primary/secondary (ignored while typing).
- **Client state** (`src/services/color-palette.ts`, signals, `providedIn: root`): generates **in-process** from the shared generator — parity comes from the shared function, not from HTTP. Only calls the API when `THEME_API_BASE_URL` points at a remote instance, and then via GET.
- **SSR + hydration**: zoneless, `provideClientHydration(withEventReplay())`, `/` prerendered. CSS variables are written on the server too, so **the prerendered document already carries the palette** (193 custom properties on `<html>`) — no flash of default colors.
- **UI libraries**: `@voltui/components@0.6.0` for every base component and `angular-movement@0.5.0` for every animation, both by the same author and consumed here on purpose as a real integration test — see [LIB-FINDINGS.md](./LIB-FINDINGS.md).
- **Theme reveal** (`src/services/theme-reveal.ts`): the circular wipe on generate/mode-switch. Paints the overlay with the _incoming_ color, expands a clip-path circle from the click point to the furthest viewport corner, commits the palette while covered, then uncovers. Driven by `MoveTrigger.play()` promises, not `setTimeout`.
- **Tests**: 110 across 8 files. `pnpm test`.
- **Deploy**: Cloudflare Pages via Wrangler. `pnpm build:cf` → `pnpm deploy:cf`, plus a GitHub Action on push to `main`. Output dir is `dist/analog/public`.

## What's missing / broken (don't assume it works)

- **No real tests.** `vite.config.ts` configures Vitest (`jsdom`, `include: ["**/*.spec.ts"]`, `setupFiles: ["src/test-setup.ts"]`) but **`src/test-setup.ts` does not exist** and **there is no `*.spec.ts` file in the repo**. Also `package.json` has no `test` script. If you're going to add tests, first create that setup file and decide how to run them (`vitest` directly, since there's no script wrapper).
- **No linter or formatter configured.** There's no `.eslintrc`/`eslint.config.*` or `.prettierrc` in the repo. The current code style is the only "contract" — imitate it for consistency, don't invent new formatting rules.
- **Naming/branding unified to `palette-forge` (2026-07-06)**: `package.json` (name, repository, bugs, homepage → `https://palette-forge.pages.dev`), `wrangler.jsonc`, `angular.json`, the HTML title, the UI `<h1>` and the `localStorage` key already use `palette-forge` / "Palette Forge"; the GitHub repo is `Andersseen/palette-forge` and the canonical deploy is Cloudflare Pages (the old Vercel URL was dropped). Two deliberate leftovers:
  1. ~~Renaming `wrangler.jsonc.name` means the next deploy targets a Cloudflare Pages project named `palette-forge` — it must be created once.~~ **This is what broke CI** (2026-07-22): `wrangler pages deploy` cannot create a project non-interactively, so it failed with a bare `exit code 1`. Verified with `wrangler pages project list` — only `palette-crafter` exists; `palette-forge` returns `Project not found [code: 8000007]`. `wrangler.jsonc.name` now points back at **`palette-crafter`**, the project that actually exists and holds the current deploys. Before changing that name again, create the target project first.
  2. The home page seed is still `"palette-crafter-home"` (`src/app/pages/(home).page.ts`) **on purpose**: changing the seed string would change the page's default colors (the seed determines the output — see CONVENTIONS.md #2).
- **Deploy CI is red: the Cloudflare secrets do not exist (2026-07-22)**. `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are referenced by the workflow but the repo has **zero** secrets configured — repo-level and in both the `Production` and `Preview` environments (`gh api repos/Andersseen/palette-crafter/actions/secrets` → `total_count: 0`). `wrangler-action` forwards the empty token anyway, so wrangler fails with `In a non-interactive environment, it's necessary to set a CLOUDFLARE_API_TOKEN environment variable`, surfacing as another bare `exit code 1`. **This is not a code fix — someone has to add the two secrets.** The workflow now fails early with a named error instead, so the next red run says which secret is missing. Note this is a _different_ cause from the project-name break above; both produced the same useless `exit code 1`.
- **A single real page**: `src/app/pages/(home).page.ts` is the only content route (AnalogJS file-based routing). No additional routes yet.

## Architecture in 30 seconds

```
src/shared/           → pure logic: color math, generator, exports, contrast.
                        No Angular/DOM imports, no environment-specific globals.
src/server/handlers/  → shared API logic (validation, CORS, caching)
src/server/routes/    → thin h3/Nitro route files: api/v1/theme.ts, api/v2/theme.ts
src/services/         → Angular state (signals); generates locally, HTTP only if configured
src/components/       → standalone Angular UI components
src/app/pages/        → AnalogJS file-based routes
```

Actual flow: user interacts → `ColorPalette` calls `generateTheme` in-process → signals update → CSS vars written to `documentElement` → permalink synced to the URL and theme cached in localStorage. External consumers hit `/api/v2/theme`, which calls the _same_ `generateTheme`.

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
```

## Related documents

- [CONTEXT.md](./CONTEXT.md) — why the project exists, who it's for.
- [CONVENTIONS.md](./CONVENTIONS.md) — concrete rules of this repo.
- [specs/done/v2-algorithm-and-tooling.md](./specs/done/v2-algorithm-and-tooling.md) — why v2 exists and what was deliberately left alone.
