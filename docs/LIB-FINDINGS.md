# Findings from consuming `@voltui/components` and `angular-movement`

> Palette Crafter is a real consumer of both libraries. This file records what
> integrating them actually surfaced, so the issues can be fixed in their own
> repos on the way to alpha. Written 2026-07-22 against
> `@voltui/components@0.6.0`, `angular-movement@0.5.0`, Angular 21.2.
>
> Fix these in `volt-ui` / `angular-movement`, **not** here (CONVENTIONS.md #6).

## `@voltui/components`

### 1. Dev-mode SSR crashes — `ng-primitives` binds listeners on `nativeElement`

**Severity: high for DX, none for production.**

Running `pnpm dev` and requesting any page renders an **empty body**:

```
TypeError: nativeElement.addEventListener is not a function
  at listener (ng-primitives/fesm2022/ng-primitives-state.mjs:260)
  at ngpPress   (ng-primitives-interactions.mjs)
  at ngpButton  (ng-primitives-button.mjs)
```

Root cause is in `ng-primitives@0.110.2`, not in volt:

```js
function listener(element, event, handler, options) {
  return runInInjectionContext(options?.injector ?? inject(Injector), () => {
    const nativeElement = coerceElement(element);
    // no platform guard, and no Renderer2
    ngZone.runOutsideAngular(() =>
      nativeElement.addEventListener(event, handler, options?.config));
  });
}
```

Angular's server-side DOM does not implement `addEventListener`, so the whole
render aborts. It is **not** limited to buttons — `NgpLabel` (via `volt-label`)
fails the same way, so any primitive that binds a listener is affected. Still
present in the latest `ng-primitives@0.127.0`.

**The production build is unaffected**: `pnpm build` prerenders correctly (13
`volt-button`, 26 `volt-card`, full body). Only the Vite dev SSR path breaks,
which is why this went unnoticed — but it means `pnpm dev` gives you a
client-only app with no server render.

Suggested upstream fix: use `Renderer2.listen()`, which is SSR-safe by design,
or guard with `isPlatformBrowser`. Patching just this one call site is **not**
sufficient — doing so surfaces a second failure, `NG0203: NgZone token injection
failed`, so there is more than one SSR assumption in that code path.

Until it is fixed, the workaround in this repo's history was wrapping volt
interactive components in `@if (isBrowser)` — see `theme-options.ts`, which
still does exactly that.

### 2. `volt-toggle-group` emits an array even in `single` mode

`type="single"` still types `value` as `string[]` and emits `[]` when the active
item is deselected. Consumers must write:

```ts
onColorMode(token, value: string[]) {
  const mode = value[0];
  if (mode) { /* ... */ }   // guard, or the token loses its mode entirely
}
```

A `single` group returning `string | undefined` would remove that trap. Note
`allowDeselection` exists but defaults to allowing an empty selection, which is
rarely what a mode switch wants.

### 3. `volt-badge` has no semantic status variants

Variants are `solid | secondary | outline | destructive`. Rendering a WCAG
grade (`AAA` / `AA` / `AA Large` / `Fail`) forced an arbitrary mapping, with
"AA Large" landing on `outline` because there is no warning variant. A
`warning` / `success` pair would cover the common status-badge case.

### 4. Good: the API held up

`VoltButton`, `VoltCard*`, `VoltCheckbox`, `VoltDialog*` and `VoltSeparator`
all survived 0.1.0 → 0.6.0 unchanged in this app. `VoltCheckbox` moving
`checked` to a `ModelSignal` kept `(checkedChange)` working. That is a good
compatibility record for a pre-1.0 library.

The theme integration is also solid: every component picked up the generated
palette through the `--primary` / `--background` custom properties with no
per-component overrides.

## `angular-movement`

### 1. Arbitrary CSS properties pass through — this is the standout feature

`clip-path` is not in `MoveKeyframeProperties`, but the composer forwards
unknown keys straight to WAAPI:

```js
// Passthrough arbitrary properties for WAAPI (e.g. strokeDashoffset)
for (const key in frames) {
  if (KNOWN_KEYS.has(key)) continue;
  ...
}
```

That is what made the whole theme reveal possible through the library instead
of hand-rolled CSS. Worth documenting explicitly in the README — right now it is
only discoverable by reading `keyframe-composer.ts`.

### 2. `MoveTriggerDirective.play()` returning a promise is the right primitive

Being able to `await trigger.play(frames)` is what lets the palette swap happen
*while the overlay covers the screen*. Without it the sequence would need
`setTimeout` guesses again. See `src/services/theme-reveal.ts`.

Two rough edges:

- `moveTrigger` is `input.required`, so a purely imperative user must still bind
  a dummy `[moveTrigger]="false"` and `[moveFrames]="{}"`. An imperative-only
  mode, or making both optional, would be cleaner.
- `play()` resolves via `#currentPlayer?.finished ?? Promise.resolve()`, so if
  the animation is cancelled the promise **rejects**. Callers doing
  `await play(); commit();` will skip the commit. This repo wraps the sequence
  in `try/finally` for that reason; it deserves a documented contract, since
  "cancelled" is a normal outcome when a user clicks twice.

### 3. Duration cannot be varied per imperative `play()` call

`moveDuration` is a template input, so an imperative caller animating two
different phases (expand, then fade) is stuck with one duration for both. An
optional per-call options argument on `play()` would help.

### 4. `MoveInViewDirective` guards SSR properly

Unlike `ng-primitives`, the in-view directive checks `isPlatformBrowser` before
touching the DOM. The hover/tap directives use Angular `host` listeners rather
than manual `addEventListener`, which is also SSR-safe. No SSR problems from
this library at all — a good contrast with the finding above.

## Where each library is used here

| Surface | volt | movement |
| --- | --- | --- |
| `hero-section.ts` | `VoltButton` | hover/tap scale, `moveLoop` spinner |
| `header.ts` | `VoltButton` (icon) | hover rotate, tap scale |
| `brand-color-input.ts` | `VoltInput`, `VoltLabel`, `VoltButton` | tap scale |
| `export-panel.ts` | `VoltTabs*`, `VoltButton`, `VoltCard*` | tap scale |
| `contrast-report.ts` | `VoltBadge` | `moveInView` + `moveStagger` |
| `color-scale.ts` | `VoltButton` | `moveInView` zoom, hover lift, stagger |
| `color-swatch.ts` | `VoltCard*` | `moveInView`, hover/tap scale |
| `theme-preview.ts` | 16 components | `moveInView`, stagger, hover |
| `theme-options.ts` | dialog, switch, toggle group | — |
| `(home).page.ts` | `VoltButton` | `moveInView` per section, `MoveTrigger` reveal |
