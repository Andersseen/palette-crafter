# Contexto del proyecto — Palette Crafter

> Lee esto primero si es tu primera vez en el repo. Explica el **por qué** existe el proyecto, no el cómo (eso está en [CONVENTIONS.md](./CONVENTIONS.md) y en el código).

## Qué es

Palette Crafter (carpeta local: `palette-forge`, nombre npm: `palette-crafter`) es una app Angular + AnalogJS que hace dos cosas con el mismo motor de generación de color:

1. **Playground visual** (`/`): una página donde el usuario genera temas de color (paleta primaria/secundaria + colores de estado + fondo/texto) y ve el resultado aplicado en vivo a componentes reales de UI (`@voltui/components`).
2. **API HTTP** (`/api/v1/theme`): el mismo generador expuesto como endpoint `GET`/`POST` para que otras apps pidan un tema ya calculado (colores en hex, escalas 50–950, contraste accesible) y lo usen en su propio Tailwind config.

La regla de oro del proyecto: **el playground y la API nunca pueden divergir**, porque comparten literalmente la misma función (`generateTheme` en `src/shared/theme-generator.ts`). Si algo cambia el resultado del generador, cambia para los dos consumidores a la vez.

## Para quién existe

- Diseñadores/equipos frontend que quieren un punto de partida de paleta coherente (contraste WCAG, escalas 50–950) sin abrir Figma.
- Otras apps/servicios (incluido el propio `volt-ui`, el design system hermano del mismo autor) que quieren pedir un tema por HTTP en vez de reimplementar lógica de color.

## Qué NO es (non-goals)

- No es un editor de color pixel-a-pixel ni un picker HSL manual arbitrario — la entrada es "intención" (modo, hue base, tipo de armonía, seed), la salida es siempre una paleta completa y accesible.
- No es un backend multi-tenant con usuarios/auth — no hay base de datos, no hay login. El "estado" del usuario es local (localStorage) y efímero.
- No pretende ser un design system en sí — los componentes de UI (botones, diálogos, checkboxes) vienen de `@voltui/components`, un paquete externo. Este repo consume ese sistema, no lo define.

## Objetivo del proyecto (qué se busca lograr)

- Que cualquier app externa pueda pedir `GET /api/v1/theme?mode=dark&seed=brand-a&harmony=triadic&baseHue=220` y recibir siempre el mismo resultado si el `seed` es el mismo (generación determinista).
- Que el resultado sea automáticamente accesible: el color de texto sobre fondo siempre cumple contraste ≥ 4.5:1 (ver `ensureAccessibleForeground` en `theme-generator.ts`).
- Que el usuario del playground pueda copiar un bloque `@theme { ... }` de Tailwind v4 listo para pegar en su propio proyecto (botón "Copy Tailwind @theme" en `export-panel.ts`).
- Deploy simple y barato: Cloudflare Pages vía Wrangler, sin infraestructura de servidor propia que mantener.

## Relación con `volt-ui`

`@voltui/components` es una librería de componentes Angular (botón, diálogo, checkbox, separador, etc.) publicada por el mismo autor (Andersseen), y su código fuente vive en un repo hermano (`volt-ui/projects/volt/src/lib/components`). Palette Crafter es, en parte, un **consumidor real / demo** de esa librería — úsala como referencia de API de componentes si necesitas ver cómo se usan (`VoltButton`, `VoltDialog`, `VoltCheckbox`, `VoltCard`, `VoltSeparator`, etc.), pero **no la modifiques desde aquí**: los cambios a los componentes van en el repo `volt-ui`, no en `palette-forge`.

## Documentos relacionados

- [STATE.md](./STATE.md) — foto del estado actual (qué existe, qué falta, qué está roto). Pégalo al iniciar una sesión nueva si necesitas contexto rápido.
- [CONVENTIONS.md](./CONVENTIONS.md) — reglas concretas de este repo (qué no romper y por qué).
- [specs/README.md](./specs/README.md) — cómo especificar una feature antes de tocar código (spec-driven development).
