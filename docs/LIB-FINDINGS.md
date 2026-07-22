# Findings from consuming `@voltui/components` and `angular-movement`

> Palette Crafter is a real consumer of both libraries. This file records what
> integrating them actually surfaced, so the issues can be fixed in their own
> repos on the way to alpha. Written 2026-07-22 against
> `@voltui/components@0.6.0`, `angular-movement@0.5.0`, Angular 21.2.
>
> Fix these in `volt-ui` / `angular-movement`, **not** here (CONVENTIONS.md #6).

## `@voltui/components`

### 1. Dev-mode SSR crashed — duplicate Angular instances break `coerceElement`

**Status: fixed in this repo.** Kept because the fragility is worth knowing.

`pnpm dev` rendered an **empty body** and flooded the terminal with:

```
TypeError: nativeElement.addEventListener is not a function
  at listener (ng-primitives/fesm2022/ng-primitives-state.mjs:260)
  at ngpPress   (ng-primitives-interactions.mjs)
  at ngpButton  (ng-primitives-button.mjs)
```

**The obvious diagnosis was wrong.** Instrumenting the server render showed the
DOM is perfectly fine — `document.createElement("div").addEventListener` is a
function, and so is the host element's. The real cause is one line deeper:

```js
import { coerceElement } from '@angular/cdk/coercion';
const nativeElement = coerceElement(element);   // instanceof ElementRef
```

`coerceElement` is an `instanceof ElementRef` check. Vite's dev SSR graph was
loading a **second copy of `@angular/cdk`/`@angular/core`**, so `instanceof`
returned false, the raw `ElementRef` was passed straight through, and
`ElementRef.addEventListener` is of course undefined. The production build
bundles a single copy, which is why only dev was affected.

Fix applied here — declare `@angular/cdk` explicitly and dedupe:

```ts
// vite.config.ts
resolve: { dedupe: ["@angular/core", "@angular/common", "@angular/cdk"] }
```

`@angular/cdk` has to be a direct dependency for this to work: under pnpm's
strict layout, deduping a package that is only a transitive dependency makes it
unresolvable (`Cannot find module '@angular/cdk/coercion'`). Same trap applies
to `ng-primitives` itself — do **not** add it to `dedupe`.

Worth considering upstream anyway: `listener()` uses
`nativeElement.addEventListener` rather than `Renderer2.listen()`. The Renderer
route is SSR-safe by construction and would not depend on `instanceof` surviving
the module graph. Any consumer of volt with a duplicated Angular instance hits
this, and the error message points at the wrong layer entirely.

### 2. `volt-button` swallows ARIA set by the consumer

**Severity: high — it silently produces inaccessible controls.**

`<volt-button>` is a host element that renders its own `<button>` inside:

```html
<volt-button aria-label="Switch to dark mode">
  <button ngpbutton class="...">…</button>
</volt-button>
```

Anything a consumer puts on the host — `aria-label`, `aria-pressed`,
`aria-expanded` — lands on a non-interactive wrapper and never reaches the real
control. Verified in a browser via the accessibility tree: an icon-only toggle
written as

```html
<volt-button size="icon" [attr.aria-label]="…"><theme-switcher /></volt-button>
```

is announced as **`button` with no accessible name**. Nothing warns you; it
looks correct in the template.

The workaround here is to name the button from the inside with visually hidden
text (`<span class="sr-only">`), and to spell state out in the label rather than
using `aria-pressed`. That works but rules out any ARIA that must sit on the
element itself.

Worth fixing upstream one of two ways: forward known ARIA attributes from the
host to the inner button, or drop the wrapper and make `volt-button` an
attribute selector on a real `<button>` (`<button voltButton>`), which is the
usual approach for exactly this reason and also removes an element from the box
model.

### 3. `volt-toggle-group` emits an array even in `single` mode

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

### 4. `volt-badge` has no semantic status variants

Variants are `solid | secondary | outline | destructive`. Rendering a WCAG
grade (`AAA` / `AA` / `AA Large` / `Fail`) forced an arbitrary mapping, with
"AA Large" landing on `outline` because there is no warning variant. A
`warning` / `success` pair would cover the common status-badge case.

### 5. Good: the API held up

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
| `command-bar.ts` | `VoltButton` (+ icon) | hover lift/rotate, tap scale, `moveLoop` spinner |
| `brand-color-input.ts` | `VoltInput`, `VoltLabel`, `VoltButton` | tap scale |
| `export-panel.ts` | `VoltTabs*`, `VoltButton`, `VoltCard*` | tap scale |
| `contrast-report.ts` | `VoltBadge` | `moveInView` + `moveStagger` |
| `color-scale.ts` | `VoltButton` | `moveInView` zoom, hover lift, stagger |
| `color-swatch.ts` | `VoltCard*` | `moveInView`, hover/tap scale |
| `theme-preview.ts` | 16 components | `moveInView`, stagger, hover |
| `theme-options.ts` | dialog, switch, toggle group | — |
| `(home).page.ts` | — | panel enter transitions, `MoveTrigger` reveal |
