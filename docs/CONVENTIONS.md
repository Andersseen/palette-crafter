# Conventions and hard rules — Palette Forge

> Rules specific to this repo. These are not generic Angular style preferences: each one exists because breaking it breaks something concrete (SSR, the API, or UI/API parity). If you're about to do something that contradicts a rule here, stop and ask before continuing.

## 1. `src/shared/` must stay framework-agnostic

`theme-generator.ts`, `utils.ts` and `types.ts` are imported by **both** the Angular client (via `@shared/*`) **and** the h3/Nitro server endpoint (via relative imports `../../../../shared/...`). This means:

- Never import `@angular/*`, `window`, `document` or anything DOM-related inside `src/shared/`.
- If you need to change the generation algorithm (PRNG, hues, scales), remember the change affects the playground and the public API **at the same time** — there is no way to change one without the other.
- The API endpoint (`src/server/routes/api/v1/theme.ts`) uses **relative** imports, not the `@shared/*` alias, even though the alias exists in `tsconfig.json`. That's the current pattern — keep it unless you explicitly verify that the Nitro/Cloudflare build resolves the alias correctly (don't assume it does just because it works in the Vite client).

## 2. The API's determinism contract is public — don't break it silently

`GET/POST /api/v1/theme` with the same `seed` **must** always return the same result (it's documented in the README as a feature). If you change `normalizeSeed`, `mulberry32`, the order in which `random()` is consumed, or the hue/lightness/saturation values hardcoded in `generateTheme`, **every seed already in use in production changes its output without warning**. If you need to change the algorithm:

- Treat it as a breaking change, not a silent fix.
- Call it out explicitly in the commit/PR message.

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

## 4. Path aliases — use them, not long relative imports

`tsconfig.json` defines `@app/*`, `@components/*`, `@types/*`, `@services/*`, `@shared/*`. Use them in `src/app`, `src/components`, `src/services`. The exceptions are inside `src/shared/` itself (which references itself with `./` because it's its own folder) and the server endpoint (see rule 1).

## 5. Angular zoneless + signals — don't mix in old patterns

The project uses `provideZonelessChangeDetection()`. That means:

- Reactive state goes through `signal()`/`computed()`, not Zone.js-based change detection or patterns that assume a `setTimeout`/promise triggers automatic detection.
- Any access to `window`, `document`, `localStorage` or browser-only APIs must sit behind `isPlatformBrowser(inject(PLATFORM_ID))` — the tree is also rendered on SSR (`provideClientHydration(withEventReplay())`), and touching those APIs on the server breaks the build/render.

## 6. `@voltui/components` is a versioned external dependency (0.1.0, pre-1.0)

It's the component library by the same author, developed in the sibling repo `volt-ui`. It's at an early version (`0.1.0`) — its API may change between versions. Before using a component you haven't already seen used in this repo:

- Check `node_modules/@voltui/components` (types + README) or the source in `volt-ui/projects/volt/src/lib/components/<component>` to see the real API; don't assume from the name.
- Don't modify `@voltui/components` code from this repo — design system changes belong in `volt-ui`.

## 7. Testing and linting: don't assume mechanisms you haven't seen run

There is no linter/formatter configured and the test pipeline (Vitest) is declared but not functional (see [STATE.md](./STATE.md)). If the user asks to "run the tests" or "run lint", first verify the tooling actually exists (`pnpm test` doesn't exist as a script) instead of assuming a standard command.

## 8. Commit style

Recent history uses short messages like `feat(): update demo`, `fix: add missing commas in type definitions for H3 module`, almost never with a long body. Follow that tone if asked to commit — don't generate multi-paragraph changelog-style messages unless explicitly requested.

## 9. Before a non-trivial change: write a spec first

See [specs/README.md](./specs/README.md). A one-line bugfix doesn't need a spec. A new feature, an API contract change, or an architecture change does.
