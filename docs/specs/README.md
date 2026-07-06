# Spec-driven development en este repo

> Objetivo: que un modelo (o persona) menos familiarizado con el proyecto no empiece a escribir código antes de que quede claro **qué** se va a construir, **por qué**, y **cómo se sabe que quedó bien**. Esto es deliberadamente ligero — no es un proceso corporativo, es una checklist de 10 minutos que evita retrabajo.

## Cuándo escribir un spec

Escribe un spec en `docs/specs/<slug>.md` **antes** de tocar código cuando el cambio sea:

- una feature nueva (endpoint nuevo, componente nuevo, opción nueva en el playground),
- un cambio de contrato de la API (`/api/v1/theme`: parámetros, forma de la respuesta, códigos de error),
- un cambio al algoritmo de generación de color (`src/shared/theme-generator.ts` / `utils.ts`) que altere resultados existentes,
- un cambio de arquitectura (mover carpetas, cambiar cómo se comunican cliente/servidor, añadir una dependencia grande).

**No** hace falta spec para: un fix de un bug puntual, un ajuste de estilos/Tailwind, una corrección de copy/texto, o un refactor interno que no cambia comportamiento observable.

Ante la duda, escribe el spec — es más barato que un cambio a medio camino que hay que deshacer.

## Cómo escribir uno

1. Copia [`TEMPLATE.md`](./TEMPLATE.md) a `docs/specs/<slug-descriptivo>.md` (ej. `docs/specs/api-batch-themes.md`).
2. Rellena todas las secciones. Si una sección no aplica, escribe "N/A" y por qué, no la borres — la ausencia deliberada es información.
3. Si estás implementando para otra persona/proceso (no para ti mismo en la misma sesión), **para y espera aprobación del spec** antes de escribir código. Si estás resolviendo un pedido directo en la misma conversación, puedes seguir directo a implementar una vez el spec está completo y es coherente con [CONTEXT.md](../CONTEXT.md) y [CONVENTIONS.md](../CONVENTIONS.md).
4. Implementa siguiendo el spec. Si durante la implementación el spec resulta estar mal o incompleto, **actualiza el spec primero**, no improvises en silencio.
5. Cuando la feature esté implementada y mergeada, mueve el archivo a `docs/specs/done/` (mismo nombre) como registro histórico. No lo borres — sirve para entender decisiones pasadas sin tener que arqueologizar el `git log`.

## Qué va en un spec (resumen — ver el template para el detalle)

- **Problema**: qué no se puede hacer hoy, o qué está mal, en términos del usuario/consumidor de la API — no en términos de código.
- **Objetivo / No-objetivo**: qué sí se busca resolver y qué explícitamente se deja fuera.
- **Diseño**: qué archivos toca, qué contratos cambian (tipos, forma de la respuesta de la API, props de un componente).
- **Impacto en el contrato de la API / determinismo**: si aplica, dilo explícitamente (ver regla 2 de [CONVENTIONS.md](../CONVENTIONS.md)).
- **Criterios de aceptación**: lista verificable, no ambigua ("el endpoint devuelve 400 si `harmony` no es uno de los 4 valores válidos", no "la validación funciona bien").
- **Fuera de alcance**: qué queda explícitamente para después.

## Specs existentes

- `done/` — specs de features ya implementadas (vacío por ahora; este sistema se creó retroactivamente sobre un proyecto ya en marcha, así que el trabajo previo a esta fecha no tiene spec escrito — ver [STATE.md](../STATE.md) para el resumen de lo ya construido).
