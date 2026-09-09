---
status: done
---

# A11y repair and color code display format

## Problem

The playground shows most color labels as HEX even though users may want to
inspect or copy RGB or OKLab values while tuning a palette. The accessibility
panel also reports failing pairs, but fixing those suggestions is manual.

## Goal

- Add a compact global display setting for color code notation: HEX, RGB, or
  OKLab.
- Apply that notation to visible swatches and scale labels without changing the
  generated palette or export formats.
- Add an opt-in Accessibility action that only changes pairs currently failing
  the contrast report, using the report's existing suggested shades.

## Non-goal (out of scope)

- No redesign of the workspace.
- No changes to exported token formats.
- No automatic repair during normal palette generation.
- No attempt to make subtle non-text borders fully adaptive beyond applying the
  existing contrast suggestion when one exists.

## Design

`src/services/color-palette.ts` owns a `ColorValueFormat` signal and exposes a
formatter used by UI components. `src/components/theme-options.ts` adds a
toggle group for HEX/RGB/OKLab display. `ColorSwatch` and `ColorScaleComponent`
receive the selected format and show/copy that notation while retaining the
same underlying hex color for rendering.

`src/services/color-palette.ts` also adds `repairAccessibilityFailures()`. It
reads `buildContrastReport`, applies only failed checks that contain a
suggestion, and recomputes CSS variables. In the current report that means
brand-as-text failures can be repaired by promoting the suggested shade, and
border failures can be repaired by increasing the generated foreground-derived
border/input opacity until it passes the non-text 3:1 threshold. Checks without
suggestions remain reported instead of being guessed.

`src/components/contrast-report.ts` adds a small repair button shown only when
there are failures.

## Impact on existing contracts

- Does the `/api/v1/theme` response shape change? No.
- Does the result change for a `seed` that already existed? No.
- Does it add/rename a CSS custom property? No.

## Acceptance criteria

- [x] Options lets the user choose HEX, RGB, or OKLab display.
- [x] Swatches and scale labels update to the selected notation.
- [x] Copy actions use the selected notation.
- [x] The Accessibility panel shows an opt-in repair action only when failures
      exist.
- [x] Repair applies only checks with existing suggestions and leaves passing
      colors untouched.
- [x] Existing v1/v2/v3 generator tests continue passing.

## Out of scope / follow-ups

- Persisting the display format across reloads.
- Persisting repaired border opacity across palette regeneration.
