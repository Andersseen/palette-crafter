# Conventions and hard rules — Palette Crafter

> Rules specific to this repo. These are not generic Angular style preferences: each one exists because breaking it breaks something concrete (SSR, the API, or UI/API parity). If you're about to do something that contradicts a rule here, stop and ask before continuing.

## 1. `src/shared/` must stay framework-agnostic

`theme-generator.ts`, `utils.ts`, `types.ts`, `export.ts` and `contrast.ts` are imported by **both** the Angular client (via `@shared/*`) **and** the h3/Nitro server handler (via relative imports). This means:

- Never import `@angular/*`, `window`, `document` or anything DOM-related inside `src/shared/`.
- **No environment-specific globals either.** This code runs in the browser, during SSR under Node, and inside the Cloudflare Worker that serves the API. `export.ts` builds its query strings with `encodeURIComponent` instead of `URLSearchParams` for that reason.
- If you need to change the generation algorithm, remember the change affects the playground and the public API **at the same time** — there is no way to change one without the other.
- The API handler (`src/server/handlers/theme.ts`) uses **relative** imports, not the `@shared/*` alias, even though the alias exists in `tsconfig.json`. That's the current pattern — keep it unless you explicitly verify that the Nitro/Cloudflare build resolves the alias correctly (don't assume it does just because it works in the Vite client).

## 2. The API's determinism contract is public — don't break it silently

`GET/POST /api/v1/theme` with the same `seed` **must** always return the same result (it's documented in the README as a feature). If you change `normalizeSeed`, `mulberry32`, the order in which `random()` is consumed, or the hue/lightness/saturation values hardcoded in the v1 path, **every seed already in use in production changes its output without warning**.

**The mechanism for changing the algorithm is versioning, not editing.** `generateTheme` takes `algorithm: "v1" | "v2"` and defaults to `v1`. To change generation behavior, add a version — do not modify an existing one. `/api/v1/theme` defaults to `v1`, `/api/v2/theme` to `v2`.

Two traps worth naming, both of which were hit while building v2:

- **`random()` consumption is lazy and that laziness is part of the contract.** `baseHue` only draws from the PRNG when no explicit hue was supplied. Pulling it eagerly — even into a variable you then ignore — shifts every later draw and silently changes the harmony for every seed that passes `baseHue`.
- **`src/shared/theme-generator.contract.spec.ts` is the tripwire.** It freezes v1 across a seed/mode/harmony matrix, with hardcoded expectations that `vitest -u` cannot rewrite. If it fails, you broke the contract. Do not update it to make the suite green.

Only `theme` (the colors) is frozen. `meta` may grow new fields additively.

## 3. CSS custom properties convention: names AND value format

`ColorPalette.updateCSSVariables()` (in `src/services/color-palette.ts`) writes variables on `documentElement` following this exact pattern, and `styles.css` + the generated `@theme` block depend on it:

```
--{token}                  → DEFAULT color (e.g. --primary)
--{token}-foreground       → foreground for the DEFAULT
--{token}-contrast         → computed contrast for the DEFAULT
--{token}-{shade}          → shade 50..950 (e.g. --primary-500)
--{token}-{shade}-contrast → computed contrast for that shade
```

Two non-obvious details that break things if ignored:

- **The value of these variables is a bare RGB triplet** (e.g. `59 130 246`, produced by `hexToRgb`), **not** a full CSS color. They are always consumed as `rgb(var(--primary))` — that's what `getTailwindConfig()` emits and what `styles.css` uses. If you write a hex or a full `rgb(...)` into one of these variables, the styles produce invalid colors with no visible error.
- Besides the tokens, `updateCSSVariables()` writes shadcn-style semantic variables (`--background`, `--foreground`, `--surface`, `--popover`, `--muted`, `--accent`, `--border`, `--input`, `--ring`) consumed by `@voltui/components`. These DO carry the full value (`rgb(r g b)` or with alpha). Don't rename or delete them even if you find no references in this repo — the reader is the external library.

If you add a new color token (another status color, for example), it must follow this pattern exactly (name and format) or the Tailwind `@theme` generation (`getTailwindConfig()`) and the CSS in `styles.css` break.

Volt-specific semantic mapping belongs in the export/adapter layer (`src/shared/volt.ts`), not in `generateTheme()`. Palette Crafter's core theme shape stays generic; Volt can consume it through a first-class adapter.

## 4. Path aliases — use them, not long relative imports

`tsconfig.json` defines `@app/*`, `@components/*`, `@types/*`, `@services/*`, `@shared/*`. Use them in `src/app`, `src/components`, `src/services`. The exceptions are inside `src/shared/` itself (which references itself with `./` because it's its own folder) and the server endpoint (see rule 1).

## 5. Angular zoneless + signals — don't mix in old patterns

The project uses `provideZonelessChangeDetection()`. That means:

- Reactive state goes through `signal()`/`computed()`, not Zone.js-based change detection or patterns that assume a `setTimeout`/promise triggers automatic detection.
- Any access to `window`, `document`, `localStorage` or browser-only APIs must sit behind `isPlatformBrowser(inject(PLATFORM_ID))` — the tree is also rendered on SSR (`provideClientHydration(withEventReplay())`), and touching those APIs on the server breaks the build/render.

## 6. `@voltui/components` is a versioned external dependency (0.6.0, pre-1.0)

It's the component library by the same author, developed in the sibling repo `volt-ui`. It's at an early version (`0.6.0`) — its API may change between versions. Before using a component you haven't already seen used in this repo:

- Check `node_modules/@voltui/components` (types + README) or the source in `volt-ui/projects/volt/src/lib/components/<component>` to see the real API; don't assume from the name.
- Don't modify `@voltui/components` code from this repo — design system changes belong in `volt-ui`.
- **Never remove `resolve.dedupe` from `vite.config.ts`.** It lists `@angular/core`, `@angular/common` and `@angular/cdk`. Volt is built on `ng-primitives`, which resolves elements with the CDK's `coerceElement` (an `instanceof ElementRef` check). A duplicated Angular copy in the dev SSR graph makes that check fail and kills the whole server render with a misleading `nativeElement.addEventListener is not a function`. `@angular/cdk` is a direct devDependency purely so it can be deduped — under pnpm, deduping a transitive-only package makes it unresolvable.

## 7. Testing works; linting still does not exist

`pnpm test` runs 136 Vitest tests (`pnpm test:watch` for the watcher). Add tests for anything you change in `src/shared/` — it is pure logic with no setup cost, and it is what the API contract rests on.

There is still **no linter or formatter configured** (no `eslint.config.*`, no `.prettierrc`). Don't assume `pnpm lint` exists. The surrounding code style is the only contract.

Two things to know about the test setup:

- Specs are **typechecked** by the Analog plugin, so a type error fails the run before any assertion executes.
- `src/test-setup.ts` initialises the Angular TestBed and stubs `matchMedia` (jsdom has none, and the palette service reads the OS colour-scheme preference on start-up).

## 8. Exports must stand alone

Anything `src/shared/export.ts` emits gets pasted into *someone else's* project, where this app's runtime CSS variables do not exist. Always emit **literal color values** — never `rgb(var(--primary))`. There is a test asserting exactly this; it exists because the original Tailwind export shipped references that resolved to nothing outside this app.

## 9. Commit style

Recent history uses short messages like `feat(): update demo`, `fix: add missing commas in type definitions for H3 module`, almost never with a long body. Follow that tone if asked to commit — don't generate multi-paragraph changelog-style messages unless explicitly requested.

## 10. Before a non-trivial change: write a spec first

See [specs/README.md](./specs/README.md). A one-line bugfix doesn't need a spec. A new feature, an API contract change, or an architecture change does.
