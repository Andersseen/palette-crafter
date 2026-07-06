# Guía para agentes / modelos de IA

Este archivo es el punto de entrada para cualquier modelo o herramienta de IA que trabaje en este repo (Claude Code, Cursor, Codex, etc.). Es intencionalmente corto — la profundidad vive en `docs/`.

## Lee en este orden

1. [docs/CONTEXT.md](./docs/CONTEXT.md) — qué es este proyecto, para quién existe, qué busca lograr. Léelo si es tu primera vez aquí.
2. [docs/STATE.md](./docs/STATE.md) — foto del estado actual: qué funciona, qué falta, qué está roto. Pégalo al inicio de una sesión nueva si necesitas contexto rápido sin re-explorar todo el repo.
3. [docs/CONVENTIONS.md](./docs/CONVENTIONS.md) — reglas duras de este repo y por qué existen (romperlas rompe SSR, la API pública, o la paridad entre playground y API).
4. [docs/specs/README.md](./docs/specs/README.md) — antes de implementar una feature no trivial, escribe un spec con la plantilla de `docs/specs/TEMPLATE.md`. Un fix de una línea no lo necesita; una feature nueva o un cambio de contrato de la API sí.

## Lo mínimo indispensable si no vas a leer nada más

- `src/shared/` (generador de color) lo usan **a la vez** el cliente Angular y el endpoint de la API — no le metas nada de Angular/DOM ahí, y cualquier cambio de algoritmo afecta a los dos consumidores.
- Mismo `seed` en `/api/v1/theme` debe devolver siempre el mismo resultado — es un contrato público, no lo cambies en silencio.
- No hay tests corriendo de verdad ni linter configurado todavía (ver STATE.md) — no asumas comandos estándar como `pnpm test` o `pnpm lint`, verifica primero.
- `@voltui/components` es una librería externa (repo hermano `volt-ui`, versión 0.1.0) — no la modifiques desde aquí.

## Actualiza estos documentos cuando corresponda

Si tu cambio altera algo descrito en `docs/STATE.md` (una feature nueva, un test que ahora sí existe, un fix de las inconsistencias listadas), actualiza ese archivo como parte del mismo cambio. Un documento de estado desactualizado es peor que no tener ninguno.
