# Current state — Palette Crafter

> Snapshot meant to be pasted at the start of a new session (with any model/tool) when there's no time for it to read the whole repo. Update it when you finish a relevant change — otherwise it lies and confuses more than it helps.
>
> Last updated: 2026-09-01 (local tree; test count verified with `pnpm test`).

## One-sentence summary

Angular 21 + AnalogJS app that generates deterministic, accessible color palettes, served in a visual playground (`/`) and an HTTP API (`/api/v1/theme` frozen, `/api/v2/theme` current, `/api/v2/theme-family` for light/dark pairs), deployed on Cloudflare Pages.

## What exists and works

- **Generation engine** (`src/shared/`): pure TypeScript, no Angular or DOM dependencies. Two algorithms:
  - **`v1` — frozen.** HSL scales on a fixed lightness ramp. Every seed in the wild depends on its exact output. Do not change it (see CONVENTIONS.md #2).
  - **`v2` — current.** OKLCH perceptual scales, chroma tapering at both ends, gamut mapping by chroma reduction (never RGB clipping, which shifts hue). The input color is preserved _exactly_ at the shade matching its lightness, so `baseColor` puts your real brand hex in the palette. Body text targets WCAG AAA (7:1). Base lightness is 0.52 light / 0.72 dark — chosen because those are the values where every hue agrees on white/black button labels.
  - Selected via `algorithm: "v1" | "v2"`, **defaulting to `v1`** so no existing consumer moves silently.
- **Theme families** (`generateThemeFamily` in `src/shared/theme-generator.ts`): additive light/dark generation from one shared identity (`seed`, `baseColor`, `baseHue`, `harmony`, `algorithm`). `generateTheme()` is unchanged and still defaults to v1.
- **Export module** (`src/shared/export.ts`): seven formats — Tailwind v4 `@theme`, plain CSS variables, SCSS, JSON, shadcn/ui, Volt UI, and W3C Design Tokens. Emits **literal color values**, so a pasted snippet works in a project that does not have this app's runtime variables.
- **Volt adapter** (`src/shared/volt.ts`): maps Palette Crafter themes to Volt UI's current semantic color tokens (`surface`, `muted`, `border`, `ring`, `input`, status aliases such as `danger` → `destructive`/`error`) without putting Volt concepts inside the core generator. ThemeFamily Volt export emits `:root` and `.dark` together.
- **Contrast module** (`src/shared/contrast.ts`): audits the pairs the theme actually renders, composites semi-transparent tokens at their real opacity, and — when a check fails — suggests the scale shade that would pass.
- **API** (`src/server/handlers/theme.ts`): `GET`/`POST`, CORS with a real `OPTIONS` preflight (204), `Cache-Control` that allows edge caching for seeded requests and forbids it for random ones, coherent 400s for every invalid parameter, `?format=` to get a rendered export directly and `?contrast=true` for the single-theme audit. `/api/v2/theme-family` returns a machine-to-machine contract with `contractVersion: 1`, `algorithm`, `themes.light`, `themes.dark`, and shared `meta`; `format=volt` returns complete Volt CSS for both modes.
- **Playground** (`src/components/*`, `src/app/pages/(home).page.ts`): laid out as a tool, not a landing page — a sticky command bar (`command-bar.ts`) holds generate / brand color / mode / options plus provenance chips (seed, harmony, hue, algorithm, WCAG pass count); a sticky left rail shows the base, brand and status swatches; the right side is a panel switcher over Scales / Preview / Export / Accessibility. Keyboard: `G` generate, `D` mode, `1`/`2` lock primary/secondary (ignored while typing).
- **Client state** (`src/services/color-palette.ts`, signals, `providedIn: root`): generates **in-process** from the shared generator — parity comes from the shared function, not from HTTP. Only calls the API when `THEME_API_BASE_URL` points at a remote instance, and then via GET.
- **SSR + hydration**: zoneless, `provideClientHydration(withEventReplay())`, `/` prerendered. CSS variables are written on the server too, so **the prerendered document already carries the palette** (193 custom properties on `<html>`) — no flash of default colors.
- **UI libraries**: `@voltui/components@0.6.0` for every base component and `angular-movement@0.5.0` for every animation, both by the same author and consumed here on purpose as a real integration test — see [LIB-FINDINGS.md](./LIB-FINDINGS.md).
- **Theme reveal** (`src/services/theme-reveal.ts`): the circular wipe on generate/mode-switch. Paints the overlay with the _incoming_ color, expands a clip-path circle from the click point to the furthest viewport corner, commits the palette while covered, then uncovers. Driven by `MoveTrigger.play()` promises, not `setTimeout`.
- **Tests**: 136 across 10 files. `pnpm test`.
- **Deploy**: Cloudflare Pages via Wrangler. `pnpm build:cf` → `pnpm deploy:cf`, plus a GitHub Action on push to `main`. Output dir is `dist/analog/public`. The Action passes `gitHubToken` to `wrangler-action` (with `deployments: write`) so each Cloudflare deploy registers a GitHub Deployment and shows in the repo's Deployments/Environments sidebar — but only once the deploy actually runs (see the missing-secrets note below).

## What's missing / broken (don't assume it works)

- **No linter or formatter configured.** There's no `.eslintrc`/`eslint.config.*` or `.prettierrc` in the repo. The current code style is the only "contract" — imitate it for consistency, don't invent new formatting rules.
- **Naming is Palette Crafter.** Verified in `package.json`, repository metadata, `wrangler.jsonc`, `index.html`, and the docs. The home page seed remains `"palette-crafter-home"` on purpose: changing the seed string would change the page's default colors (see CONVENTIONS.md #2).
- **Deploy secrets are not locally verifiable from this tree.** The workflow `.github/workflows/deploy-cloudflare.yml` deploys Cloudflare Pages on pushes to `main` and fails early with a named error if `CLOUDFLARE_API_TOKEN` or `CLOUDFLARE_ACCOUNT_ID` is missing. `wrangler.jsonc.name` is `palette-crafter`, matching the documented Pages project name.
- **A single real page**: `src/app/pages/(home).page.ts` is the only content route (AnalogJS file-based routing). No additional routes yet.

## Architecture in 30 seconds

```
src/shared/           → pure logic: color math, generator, exports, contrast.
                        No Angular/DOM imports, no environment-specific globals.
src/server/handlers/  → shared API logic (validation, CORS, caching)
src/server/routes/    → thin h3/Nitro route files: api/v1/theme.ts,
                        api/v2/theme.ts, api/v2/theme-family.ts
src/services/         → Angular state (signals); generates locally, HTTP only if configured
src/components/       → standalone Angular UI components
src/app/pages/        → AnalogJS file-based routes
```

Actual flow: user interacts → `ColorPalette` calls `generateTheme` in-process → signals update → CSS vars written to `documentElement` → permalink synced to the URL and theme cached in localStorage. External single-theme consumers hit `/api/v2/theme`, which calls the _same_ `generateTheme`; tooling that needs both modes can hit `/api/v2/theme-family`, which calls `generateThemeFamily`.

## Testing

```bash
pnpm test          # 136 tests
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
