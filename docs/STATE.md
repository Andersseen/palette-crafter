# Estado actual — Palette Crafter

> Snapshot pensado para pegarse al principio de una sesión nueva (con cualquier modelo/herramienta) cuando no hay tiempo de que lea todo el repo. Actualízalo cuando termines un cambio relevante — si no, miente y confunde más que ayuda.
>
> Última actualización: 2026-07-06 (basado en el commit `d384fcf`, rama `main`, working tree limpio).

## Resumen en una frase

App Angular 21 + AnalogJS que genera paletas de color deterministas y accesibles, servidas tanto en un playground visual (`/`) como en una API HTTP (`/api/v1/theme`), deployada en Cloudflare Pages.

## Qué existe y funciona

- **Motor de generación** (`src/shared/theme-generator.ts` + `utils.ts` + `types.ts`): puro TypeScript, sin dependencias de Angular ni del DOM. Genera hue base + armonía (analogous/complementary/split-complementary/triadic), escalas 50–950 + `DEFAULT` + `foreground` para `primary`/`secondary`/`status.{info,success,warning,danger}`, y ajusta el foreground hasta cumplir contraste WCAG ≥ 4.5:1. Con `seed` es determinista (PRNG `mulberry32`); sin `seed`, usa `Math.random`.
- **API** (`src/server/routes/api/v1/theme.ts`, h3/Nitro vía AnalogJS): `GET` y `POST` en `/api/v1/theme`. Valida `mode` (`light`/`dark`), `harmony` (4 valores), `baseHue` (0–360) y responde `400` si algo es inválido, `405` si el método no es GET/POST. Documentado con ejemplos `curl` en el [README](../README.md).
- **Servicio de estado del cliente** (`src/services/color-palette.ts`, Angular signal-based, `providedIn: root`): pide el tema a la API vía `ThemeApiClient`, cachea el último tema válido en `localStorage` (`palette-crafter:last-theme`), detecta `prefers-color-scheme` del sistema, aplica todo como CSS custom properties en `documentElement` (`--primary`, `--primary-50`, `--primary-foreground`, `--primary-contrast`, etc.), y genera el bloque Tailwind v4 `@theme {...}` para exportar.
- **UI** (`src/components/*.ts` + `src/app/pages/(home).page.ts`): header, hero, preview de tema, swatches, escalas de color, panel de export (copia `@theme` al portapapeles), drawer de "Theme Options" (modo single/scale por token, toggle de colores de estado) construido con `@voltui/components`.
- **SSR + hidratación**: zoneless (`provideZonelessChangeDetection`), `provideClientHydration(withEventReplay())`, guardas `isPlatformBrowser` alrededor de todo acceso a `window`/`document`/`localStorage`.
- **Deploy**: Cloudflare Pages vía Wrangler. `pnpm build:cf` → `pnpm deploy:cf`. GitHub Action (`.github/workflows/deploy-cloudflare.yml`) despliega automáticamente en push a `main` (requiere secrets `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID`).

## Qué falta / está roto (no asumir que funciona)

- **No hay tests reales.** `vite.config.ts` configura Vitest (`jsdom`, `include: ["**/*.spec.ts"]`, `setupFiles: ["src/test-setup.ts"]`) pero **`src/test-setup.ts` no existe** y **no hay ningún archivo `*.spec.ts` en el repo**. Además `package.json` no tiene script `test`. Si vas a añadir tests, primero hay que crear ese setup file y decidir cómo correrlos (`vitest` directo, ya que no hay script wrapper).
- **No hay linter ni formatter configurado.** No hay `.eslintrc`/`eslint.config.*` ni `.prettierrc` en el repo. El estilo de código actual es el único "contrato" — imítalo por consistencia, no inventes reglas nuevas de formato.
- **Inconsistencias de nombres/branding** (no crítico, pero puede confundir): `package.json.name` = `palette-crafter`, `wrangler.jsonc.name` = `palette-crafter`, `homepage` en `package.json` apunta a una URL de **Vercel** (`palette-crafter-psi.vercel.app`) que probablemente ya no es el deploy real (el deploy activo es Cloudflare Pages según README + workflow), y la carpeta local del repo se llama `palette-forge`. Si tocas cualquiera de estos campos, confirma con el usuario cuál es el nombre/URL "canónico" actual antes de asumir uno.
- **Una sola página real**: `src/app/pages/(home).page.ts` es la única ruta de contenido (AnalogJS file-based routing). No hay rutas adicionales todavía.

## Arquitectura en 30 segundos

```
src/shared/           → lógica pura (color math, generador de tema). La usan API y potencialmente el cliente. Sin imports de Angular/DOM.
src/server/routes/    → endpoints h3/Nitro (AnalogJS API routes). Hoy: api/v1/theme.ts
src/services/         → estado Angular (signals) + cliente HTTP hacia la API
src/components/       → componentes Angular standalone de UI
src/app/pages/        → rutas file-based de AnalogJS
```

Flujo real: usuario interactúa con la UI → `ColorPalette` (servicio) llama a `ThemeApiClient` → petición HTTP a `/api/v1/theme` → handler h3 valida y llama a `generateTheme` (shared) → respuesta → `ColorPalette` actualiza signals + CSS vars + localStorage.

## Historial reciente (contexto, no para re-derivar con `git log` cada vez)

Ramas recientes mergeadas a `main`: `feature/home`, `feature/angular-ssr`, `feature/api`. En ese orden se construyó: UI base → SSR/hidratación → generación de temas vía API + integración de `@voltui/components`. El trabajo avanza en commits pequeños tipo `feat(): ...` sin cuerpo largo — sigue ese estilo si commiteas.

## Cómo correr el proyecto

```bash
pnpm install
pnpm dev            # http://localhost:4200
pnpm build:cf && pnpm dev:cf   # preview con preset Cloudflare Pages
```

## Documentos relacionados

- [CONTEXT.md](./CONTEXT.md) — por qué existe el proyecto, para quién, qué se busca lograr.
- [CONVENTIONS.md](./CONVENTIONS.md) — reglas concretas de este repo.
- [specs/README.md](./specs/README.md) — proceso para especificar features antes de codear.
