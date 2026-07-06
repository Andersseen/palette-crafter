# Current state — Palette Forge

> Snapshot meant to be pasted at the start of a new session (with any model/tool) when there's no time for it to read the whole repo. Update it when you finish a relevant change — otherwise it lies and confuses more than it helps.
>
> Last updated: 2026-07-06 (commit `e17a23d` + uncommitted rename to `palette-forge`, branch `main`; claims verified against the source code on that date).

## One-sentence summary

Angular 21 + AnalogJS app that generates deterministic, accessible color palettes, served both in a visual playground (`/`) and an HTTP API (`/api/v1/theme`), deployed on Cloudflare Pages.

## What exists and works

- **Generation engine** (`src/shared/theme-generator.ts` + `utils.ts` + `types.ts`): pure TypeScript, no Angular or DOM dependencies. Generates base hue + harmony (analogous/complementary/split-complementary/triadic), 50–950 scales + `DEFAULT` + `foreground` for `primary`/`secondary`/`status.{info,success,warning,danger}`. Mind the accessibility nuance: the global background/text pair is adjusted iteratively until WCAG contrast ≥ 4.5:1 (`ensureAccessibleForeground`), but each scale's `foreground` is a binary choice (white if it reaches ≥ 4.5:1 against the `DEFAULT`; otherwise black **without re-verifying** that black passes). With a `seed` it's deterministic (`mulberry32` PRNG); without a `seed`, it uses `Math.random`.
- **API** (`src/server/routes/api/v1/theme.ts`, h3/Nitro via AnalogJS): `GET` and `POST` on `/api/v1/theme`. Validates `mode` (`light`/`dark`), `harmony` (4 values), `baseHue` (0–360) and responds `400` if anything is invalid, `405` if the method isn't GET/POST. Documented with `curl` examples in the [README](../README.md).
- **Client state service** (`src/services/color-palette.ts`, Angular signal-based, `providedIn: root`): requests the theme from the API via `ThemeApiClient` (always `POST`; the base URL comes from `THEME_API_BASE_URL`/`VITE_THEME_API_BASE_URL` if defined — see `envPrefix` in `vite.config.ts` — otherwise same-origin), caches the last valid theme in `localStorage` (`palette-forge:last-theme`), detects the system's `prefers-color-scheme`, applies everything as CSS custom properties on `documentElement` (`--primary`, `--primary-50`, `--primary-foreground`, `--primary-contrast`, etc.), and generates the Tailwind v4 `@theme {...}` block for export.
- **UI** (`src/components/*.ts` + `src/app/pages/(home).page.ts`): header, hero, theme preview, swatches, color scales, export panel (copies `@theme` to clipboard), "Theme Options" drawer (single/scale mode per token, status colors toggle) built with `@voltui/components`.
- **SSR + hydration**: zoneless (`provideZonelessChangeDetection`), `provideClientHydration(withEventReplay())`, `isPlatformBrowser` guards around every access to `window`/`document`/`localStorage`. The `/` route is prerendered at build time (`prerender.routes` in `vite.config.ts`).
- **Deploy**: Cloudflare Pages via Wrangler. `pnpm build:cf` → `pnpm deploy:cf`. A GitHub Action (`.github/workflows/deploy-cloudflare.yml`) deploys automatically on push to `main` (requires the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets).

## What's missing / broken (don't assume it works)

- **No real tests.** `vite.config.ts` configures Vitest (`jsdom`, `include: ["**/*.spec.ts"]`, `setupFiles: ["src/test-setup.ts"]`) but **`src/test-setup.ts` does not exist** and **there is no `*.spec.ts` file in the repo**. Also `package.json` has no `test` script. If you're going to add tests, first create that setup file and decide how to run them (`vitest` directly, since there's no script wrapper).
- **No linter or formatter configured.** There's no `.eslintrc`/`eslint.config.*` or `.prettierrc` in the repo. The current code style is the only "contract" — imitate it for consistency, don't invent new formatting rules.
- **Naming/branding unified to `palette-forge` (2026-07-06)**: `package.json` (name, repository, bugs, homepage → `https://palette-forge.pages.dev`), `wrangler.jsonc`, `angular.json`, the HTML title, the UI `<h1>` and the `localStorage` key already use `palette-forge` / "Palette Forge"; the GitHub repo is `Andersseen/palette-forge` and the canonical deploy is Cloudflare Pages (the old Vercel URL was dropped). Two deliberate leftovers:
  1. Renaming `wrangler.jsonc.name` means the next deploy targets a Cloudflare Pages project named `palette-forge` — it must be created once (`wrangler pages project create palette-forge --production-branch=main`) or the CI deploy fails; the old `palette-crafter` project keeps existing on Cloudflare until it's deleted manually.
  2. The home page seed is still `"palette-crafter-home"` (`src/app/pages/(home).page.ts`) **on purpose**: changing the seed string would change the page's default colors (the seed determines the output — see CONVENTIONS.md #2).
- **A single real page**: `src/app/pages/(home).page.ts` is the only content route (AnalogJS file-based routing). No additional routes yet.

## Architecture in 30 seconds

```
src/shared/           → pure logic (color math, theme generator). Used by the API and potentially the client. No Angular/DOM imports.
src/server/routes/    → h3/Nitro endpoints (AnalogJS API routes). Today: api/v1/theme.ts
src/services/         → Angular state (signals) + HTTP client towards the API
src/components/       → standalone Angular UI components
src/app/pages/        → AnalogJS file-based routes
```

Actual flow: user interacts with the UI → `ColorPalette` (service) calls `ThemeApiClient` → HTTP request to `/api/v1/theme` → h3 handler validates and calls `generateTheme` (shared) → response → `ColorPalette` updates signals + CSS vars + localStorage.

## Recent history (context, so you don't re-derive it with `git log` every time)

Recent branches merged into `main`: `feature/home`, `feature/angular-ssr`, `feature/api`. In that order the project was built: base UI → SSR/hydration → theme generation via API + `@voltui/components` integration. Work moves in small commits like `feat(): ...` without long bodies — follow that style if you commit.

## How to run the project

```bash
pnpm install
pnpm dev            # http://localhost:4200
pnpm build:cf && pnpm dev:cf   # preview with the Cloudflare Pages preset
```

## Related documents

- [CONTEXT.md](./CONTEXT.md) — why the project exists, who it's for, what it aims to achieve.
- [CONVENTIONS.md](./CONVENTIONS.md) — concrete rules of this repo.
- [specs/README.md](./specs/README.md) — process for speccing features before coding.
