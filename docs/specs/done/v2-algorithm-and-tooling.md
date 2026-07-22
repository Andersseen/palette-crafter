---
status: done
---

# v2 algorithm, export formats, permalinks and test coverage

> Written alongside the implementation (2026-07-22) rather than before it, which
> departs from the process in [specs/README.md](../README.md). Recorded here so
> the decisions are not lost — particularly the ones about what was deliberately
> *not* changed.

## Problem

Several things were wrong or missing, found by auditing the code against the
documented intent:

1. **The playground could produce an inaccessible palette.** Clicking a shade in
   a color scale promoted it to `DEFAULT` but left `foreground` pointing at the
   old shade's contrast color. Selecting shade 50 left white text on a near-white
   fill at 1.15:1.
2. **Dark mode barely differed from light mode.** `generateTheme` chose a lighter
   primary for dark mode (HSL L=60), but `generateColorScale` rebuilt every scale
   from hue and saturation alone and pinned `DEFAULT` to L=50, discarding the
   choice. The same applied to the four status colors.
3. **A generated palette could not be recovered.** "Generate" produced an
   unseeded, random palette. There was no URL, no history, and the localStorage
   cache was overwritten on every load by the home seed, so a reload always
   returned the same default palette.
4. **The public API was unusable from a browser.** No CORS headers, and `OPTIONS`
   returned 405, so any cross-origin preflight failed.
5. **No caching.** Seeded output is a pure function of the query string, yet
   nothing was cacheable — and the client always used POST, which cannot be
   cached at all.
6. **Validation was inconsistent.** An invalid `mode` returned 400 while an
   unparseable `baseHue` was silently dropped, quietly returning a random palette
   instead of an error.
7. **Colour flash on every load.** The palette was only generated in the browser,
   so the prerendered page shipped hardcoded blue/green and swapped after
   hydration.
8. **Only one export format**, and it emitted `rgb(var(--primary))` — references
   to runtime variables that do not exist in the project the user pastes into.
9. **No tests at all**, despite a documented public determinism contract.
10. **Scales were not perceptually even.** Fixed-lightness HSL meant yellow-500
    scored 1.98:1 against white while blue-500 scored 5.48:1.

## Goal

- Fix the defects without ever changing the colors an existing `v1` seed returns.
- Make the output good enough to build a real design system on.
- Make the API consumable by the audience [CONTEXT.md](../../CONTEXT.md) claims.

## Non-goal (out of scope)

- Changing `v1` output in any way. It stays frozen forever.
- Auth, rate limiting, persistence or multi-tenancy.
- Editing `@voltui/components` (CONVENTIONS.md #6).
- Publishing to npm — the package is built and verified, publishing is a
  deliberate human step.

## Design

**Algorithm versioning.** `generateTheme` takes `algorithm: "v1" | "v2"`,
defaulting to `v1` so nothing moves silently. `/api/v1/theme` defaults to `v1`,
the new `/api/v2/theme` defaults to `v2`, and an explicit `algorithm` parameter
overrides either. Both routes share `src/server/handlers/theme.ts`.

**v2 colour model.** Scales are generated in OKLCH (`generateColorScaleV2`) on a
perceptual lightness ramp modelled on Tailwind v4, with a chroma envelope that
tapers at both ends and gamut mapping that reduces chroma rather than clipping
RGB — clipping would shift the hue. The input color is preserved *exactly* at
the shade its own lightness belongs to, which is what makes `baseColor` honest.

**v2 base lightness** is 0.52 in light mode and 0.72 in dark. These are not
arbitrary: 0.52 is the lightest value at which every hue still takes white text
(worst case 5.13:1). Around 0.58 the white/black choice flips hue by hue, so two
palettes from the same tool would disagree on whether primary buttons have light
or dark labels. Guarded by a test.

**`bestForeground`** replaces the "white if it clears 4.5:1, otherwise black"
rule, which could return the worse of the two. Measured over 252 hue/saturation
combinations the old rule never actually failed at v1's fixed L=50 — it was
latent, not live. It became live the moment `updateActiveShade` moved `DEFAULT`
off L=50, which is exactly defect 1.

**New shared modules.** `export.ts` and `contrast.ts` live in `src/shared/`, not
in the Angular service, so the API can serve them too (`?format=`,
`?contrast=true`). Exports emit literal colors so a pasted snippet works
standalone.

**Client.** Generates in-process via the shared `generateTheme` — parity comes
from the shared function, not from HTTP (CONTEXT.md). `ThemeApiClient` is used
only when `THEME_API_BASE_URL` points at a remote instance, and now uses GET.
CSS variables are written on the server too, so the prerendered document ships
with the palette already applied.

**npm package.** `pnpm build:core` compiles `src/shared` to `dist/core` as
`@palette-forge/core`. Generated rather than kept as a second source tree so
there is only ever one copy of the generator.

## Impact on existing contracts

- **Does the `/api/v1/theme` response shape change?** Additively only. `meta`
  gains `algorithm`, plus `seed`/`baseColor` when supplied. `contrast` appears
  only with `?contrast=true`. Existing consumers reading `theme` are unaffected.
- **Does the result change for a seed that already existed?** **No.** This was
  the hard constraint. `theme-generator.contract.spec.ts` freezes the v1 output
  for a seed/mode/harmony matrix, with hardcoded values that `vitest -u` cannot
  rewrite. New behavior is reachable only via `algorithm: "v2"` or `/api/v2/`.
- **Does it add/rename a CSS custom property?** Adds `--info`, `--success`,
  `--warning`, `--danger` and their `-foreground` pairs to `styles.css`, in the
  existing bare-RGB-triplet format (CONVENTIONS.md #3). Nothing renamed.
- **Behavioural change in the playground:** it now uses v2, so the default
  palette differs from before. The v1 colors remain reachable through the API.

## Acceptance criteria

- [x] Every v1 seed returns byte-identical colors, proven by a frozen test.
- [x] Promoting any shade to `DEFAULT` keeps its foreground above 4.5:1.
- [x] The dark-mode primary is measurably lighter than the light-mode one in v2.
- [x] `baseColor` appears verbatim in the generated scale.
- [x] Every hue picks the same primary button label color within a mode.
- [x] `OPTIONS` returns 204 with CORS headers; GET responses carry them too.
- [x] Seeded responses are cacheable; unseeded responses are `no-store`.
- [x] An unparseable `baseHue` returns 400 instead of a random palette.
- [x] The prerendered document contains the palette (193 custom properties).
- [x] Six export formats, all emitting literal values.
- [x] A palette can be reproduced from its permalink.
- [x] `@palette-forge/core` runs in plain Node with no dependencies.

## Out of scope / follow-ups

- **Publishing the npm package** and reserving the `@palette-forge` scope.
- **Both modes in one export** — the CSS export covers the current mode only;
  emitting `:root` plus `.dark` in a single file needs generating both themes.
- **The `Border` contrast check reports Fail** for the deliberately subtle
  0.2-alpha divider. It is reported honestly rather than hidden, but the theme
  could offer a stronger border token for WCAG 1.4.11 compliance.
- **Deleting the old `palette-crafter` Cloudflare project**, still noted in
  STATE.md.
- **A linter/formatter** is still not configured.
- **Component tests** — the TestBed is now initialised in `src/test-setup.ts`,
  but only the service is covered.
