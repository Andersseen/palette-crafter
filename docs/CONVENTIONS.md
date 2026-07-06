# Convenciones y reglas duras — Palette Crafter

> Reglas específicas de este repo. No son gustos de estilo genéricos de Angular: cada una existe porque romperla rompe algo concreto (SSR, la API, o la paridad UI/API). Si vas a hacer algo que contradice una regla de aquí, para y pregunta antes de seguir.

## 1. `src/shared/` debe seguir siendo agnóstico de framework

`theme-generator.ts`, `utils.ts` y `types.ts` los importan **tanto** el cliente Angular (vía `@shared/*`) **como** el endpoint del servidor h3/Nitro (vía imports relativos `../../../../shared/...`). Esto significa:

- Nunca importes `@angular/*`, `window`, `document` ni nada del DOM dentro de `src/shared/`.
- Si necesitas cambiar el algoritmo de generación (PRNG, hues, escalas), recuerda que el cambio afecta **a la vez** al playground y a la API pública — no hay forma de cambiar uno sin el otro.
- El endpoint de la API (`src/server/routes/api/v1/theme.ts`) usa imports **relativos**, no el alias `@shared/*`, aunque el alias existe en `tsconfig.json`. Es el patrón actual — mantenlo así salvo que verifiques explícitamente que el build de Nitro/Cloudflare resuelve el alias correctamente (no asumas que sí solo porque funciona en el cliente Vite).

## 2. Contrato de determinismo de la API es público — no lo rompas en silencio

`GET/POST /api/v1/theme` con el mismo `seed` **debe** devolver siempre el mismo resultado (está documentado en el README como feature). Si cambias `normalizeSeed`, `mulberry32`, el orden en que se consume `random()`, o los valores de hue/lightness/saturation hardcodeados en `generateTheme`, **cualquier seed existente en producción cambia de resultado sin aviso**. Si necesitas cambiar el algoritmo:

- Trátalo como un cambio incompatible (breaking change), no como un fix silencioso.
- Menciónalo explícitamente en el mensaje de commit/PR.

## 3. Convención de nombres de CSS custom properties

`ColorPalette.updateCSSVariables()` (en `src/services/color-palette.ts`) escribe variables en `documentElement` siguiendo este patrón exacto, y `styles.css` + el bloque `@theme` generado dependen de él:

```
--{token}                  → color DEFAULT (ej. --primary)
--{token}-foreground       → foreground para el DEFAULT
--{token}-contrast         → contraste calculado del DEFAULT
--{token}-{shade}          → shade 50..950 (ej. --primary-500)
--{token}-{shade}-contrast → contraste calculado de ese shade
```

Si agregas un nuevo token de color (otro color de estado, por ejemplo), debe seguir exactamente este patrón o se rompe la generación del `@theme` de Tailwind (`getTailwindConfig()`) y el CSS en `styles.css`.

## 4. Alias de paths — úsalos, no imports relativos largos

`tsconfig.json` define `@app/*`, `@components/*`, `@types/*`, `@services/*`, `@shared/*`. Úsalos en `src/app`, `src/components`, `src/services`. La excepción es dentro de `src/shared/` mismo (que se referencia con `./` porque es su propia carpeta) y el endpoint del servidor (ver regla 1).

## 5. Angular zoneless + signals — no mezcles patrones viejos

El proyecto usa `provideZonelessChangeDetection()`. Eso significa:

- Estado reactivo va con `signal()`/`computed()`, no con detección de cambios basada en Zone.js ni patrones que asuman que un `setTimeout`/promise dispara detección automática.
- Cualquier acceso a `window`, `document`, `localStorage` o APIs solo-browser debe ir detrás de `isPlatformBrowser(inject(PLATFORM_ID))` — el árbol se renderiza también en SSR (`provideClientHydration(withEventReplay())`), y acceder a esas APIs en servidor rompe el build/render.

## 6. `@voltui/components` es una dependencia externa versionada (0.1.0, pre-1.0)

Es la librería de componentes del mismo autor, desarrollada en el repo hermano `volt-ui`. Está en una versión temprana (`0.1.0`) — su API puede cambiar entre versiones. Antes de usar un componente que no hayas visto ya usado en este repo:

- Revisa `node_modules/@voltui/components` (tipos + README) o el código fuente en `volt-ui/projects/volt/src/lib/components/<componente>` para ver la API real, no asumas por el nombre.
- No modifiques el código de `@voltui/components` desde este repo — los cambios al design system van en `volt-ui`.

## 7. Testing y linting: no asumas que existen mecanismos que no viste correr

No hay linter/formatter configurado y el pipeline de tests (Vitest) está declarado pero no funcional (ver [STATE.md](./STATE.md)). Si el usuario pide "corre los tests" o "corre el lint", verifica primero que el tooling exista de verdad (`pnpm test` no existe como script) en vez de asumir un comando estándar.

## 8. Estilo de commits

Historial reciente usa mensajes cortos tipo `feat(): update demo`, `fix: add missing commas in type definitions for H3 module`, sin cuerpo largo casi nunca. Sigue ese tono si te piden commitear — no generes mensajes multi-párrafo tipo changelog salvo que se pida explícitamente.

## 9. Antes de un cambio no trivial: escribe un spec primero

Ver [specs/README.md](./specs/README.md). Un bugfix de una línea no necesita spec. Una feature nueva, un cambio de contrato de la API, o un cambio de arquitectura sí.
