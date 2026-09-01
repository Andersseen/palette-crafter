---
status: done
---

# Theme Family and Volt Export

## Problem

API and tooling consumers can only request one mode at a time. A future app creator that needs a coherent light/dark pair for Volt UI would have to call the API twice, combine the results, and know Volt's semantic token contract.

## Goal

- Generate a light/dark ThemeFamily from one shared identity.
- Add a machine-to-machine `/api/v2/theme-family` contract with explicit `contractVersion`.
- Add a first-class Volt UI adapter/export without putting Volt concepts inside the core generator.

## Non-goal (out of scope)

- No project rewrite, auth, storage, CLI, package publishing, or Andersseen Stack dependency.
- No changes to v1 color output or to existing `/api/v1/theme` and `/api/v2/theme` semantics.
- No full design-system layer beyond mapping Palette Crafter themes to Volt's current semantic tokens.

## Design

Touches:

- `src/shared/types.ts`: add ThemeFamily and ThemeFamily API/Volt contract types.
- `src/shared/theme-generator.ts`: extract identity resolution and add `generateThemeFamily(options)`.
- `src/shared/volt.ts`: translate Theme/ThemeFamily to Volt semantic tokens and CSS.
- `src/shared/export.ts`: add `format=volt` for a single theme and family export helpers.
- `src/server/handlers/theme.ts`: reuse validation/CORS/cache for a new family handler.
- `src/server/routes/api/v2/theme-family.ts`: thin Analog/Nitro route.
- Tests and docs.

`generateThemeFamily(options)` returns:

```ts
{
  light: Theme;
  dark: Theme;
  meta: {
    baseHue: number;
    secondaryHue: number;
    harmony: HarmonyType;
    seeded: boolean;
    algorithm: ThemeAlgorithm;
    seed?: string | number;
    baseColor?: string;
  };
}
```

`/api/v2/theme-family` returns JSON by default:

```ts
{
  ok: true;
  contractVersion: 1;
  algorithm: ThemeAlgorithm;
  themes: { light: Theme; dark: Theme };
  meta: ThemeFamilyMeta;
}
```

`format=volt` returns CSS with `:root` and `.dark` blocks.

## Impact on existing contracts

- Does the `/api/v1/theme` response shape change? No.
- Does the result change for a `seed` that already existed? No; v1 snapshots remain frozen and `generateTheme()` keeps the same random-consumption order.
- Does it add/rename a CSS custom property? It adds only exported Volt CSS variables, not runtime variables. Existing runtime variables stay as-is.

## Acceptance criteria

- [x] ThemeFamily deterministic for seeded input.
- [x] Light and dark share identity metadata while themes differ.
- [x] `baseColor`, `harmony`, and `algorithm` are preserved in family metadata.
- [x] `generateTheme()` and v1 snapshots remain unchanged.
- [x] `/api/v2/theme-family` supports GET/POST, validation, CORS and deterministic caching.
- [x] Family response includes `contractVersion` separate from `algorithm`.
- [x] Volt adapter emits all current Volt semantic color tokens with no undefined values.
- [x] Volt family CSS includes both `:root` and `.dark`.
- [x] Existing exports still work.

## Out of scope / follow-ups

Package extraction, creator integration, API contract negotiation, and richer Volt style presets are left for future specs.
