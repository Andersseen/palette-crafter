---
status: done
---

# v3 adaptive semantic status colors

## Problem

Palette Crafter v2 generates perceptual brand scales and accessible fixed
status colors, but the four semantic statuses do not react to the generated
palette. A violet, teal, or terracotta brand can all receive the same canonical
blue, green, yellow, and red status colors. The result is accessible, but not a
fully coherent semantic theme.

## Goal

- Add a v3 color algorithm where `info`, `success`, `warning`, and `danger`
  adapt to the generated brand palette.
- Keep each status inside a recognizable semantic OKLCH hue family.
- Preserve deterministic output, AA status foreground contrast, and perceptual
  separation between statuses and the brand colors.

## Non-goal (out of scope)

- No changes to frozen v1 output.
- No changes to public v2 output.
- No playground redesign or new controls.
- No redefinition of `baseColor`; v3 keeps v2's exact primary behavior.

## Design

`src/shared/theme-generator.ts` adds a v3 path next to v1 and v2. v3 reuses the
v2 background, foreground, brand scale, and theme-family mechanics. Only status
generation changes: each status starts from a canonical OKLCH semantic recipe,
then receives bounded hue and chroma adaptation derived from the primary and
secondary brand colors.

The status recipes keep hues in semantic neighborhoods:

- `info`: cyan, blue, and blue-violet.
- `success`: green and teal-green.
- `warning`: warm yellow, amber, and yellow-orange.
- `danger`: red, coral, and red-magenta.

The palette character is intentionally simple: primary and secondary OKLCH hues
create a bounded hue bias from each semantic anchor, and their weighted chroma
raises or softens status chroma. Hue movement is smaller than chroma movement so
semantic meaning remains obvious.

`src/shared/utils.ts` exposes `oklabDistance()` for reusable perceptual distance
checks. v3 uses that distance to nudge semantic colors away from other statuses
and from primary/secondary when they get too close, while staying inside the
same status recipe's hue range.

API additions follow the existing route pattern:

```text
/api/v3/theme
/api/v3/theme-family
```

Both routes default to `algorithm: "v3"`. `algorithm=v3` is also accepted by
the shared handler. The playground switches its hardcoded current algorithm
from v2 to v3, and the remote client points at `/api/v3/theme`.

## Impact on existing contracts

- Does the `/api/v1/theme` response shape change? No.
- Does the result change for a `seed` that already existed? No for v1 and v2.
  New colors are reachable only through `algorithm: "v3"` or `/api/v3/*`.
- Does it add/rename a CSS custom property? No. Existing status token names are
  reused: `--info`, `--success`, `--warning`, and `--danger`, plus foreground
  and shade variables in the current format.

## Acceptance criteria

- [x] `ThemeAlgorithm` supports `"v1" | "v2" | "v3"`.
- [x] `/api/v3/theme` and `/api/v3/theme-family` default to v3.
- [x] v1 contract tests remain unchanged and passing.
- [x] v2 has representative fixed-output regression tests and remains passing.
- [x] v3 is deterministic for seeded, brand-color, harmony, and mode inputs.
- [x] v3 statuses stay inside their semantic hue regions across a hue sweep.
- [x] v3 status colors adapt across distinct brand palettes and muted/vivid
      chroma inputs.
- [x] Every v3 status `DEFAULT`/`foreground` pair is at least 4.5:1 in light
      and dark mode.
- [x] v3 status colors stay perceptually distinct from each other and from
      primary/secondary in representative matrices.
- [x] Theme families remain deterministic and share one identity.

## Out of scope / follow-ups

- Investigate whether a future v4 should reinterpret `baseColor` differently
  per mode. v3 deliberately preserves the exact v2 primary behavior.
