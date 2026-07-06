---
status: draft # draft | approved | in-progress | done
---

# <Nombre de la feature/cambio>

## Problema

<Qué no se puede hacer hoy, o qué está mal, descrito desde la perspectiva de quien usa el playground o la API. Nada de detalles de implementación acá.>

## Objetivo

<Qué se busca lograr con este cambio. 1-3 bullets.>

## No-objetivo (fuera de alcance)

<Qué queda explícitamente fuera, aunque esté relacionado. Esto evita que el scope crezca a mitad de implementación.>

## Diseño

<Qué archivos/módulos toca. Si agrega un endpoint, tipo, o prop nueva, escribe la forma exacta (firma de función, forma del JSON, props del componente). Si cambia un archivo en `src/shared/`, dilo explícitamente — afecta a la API y al cliente a la vez (ver CONVENTIONS.md #1).>

## Impacto en contratos existentes

- ¿Cambia la forma de la respuesta de `/api/v1/theme`? <sí/no + detalle>
- ¿Cambia el resultado para un `seed` que ya existía (determinismo)? <sí/no + detalle — ver CONVENTIONS.md #2>
- ¿Agrega/renombra una CSS custom property? <sí/no + detalle — debe seguir el patrón de CONVENTIONS.md #3>

## Criterios de aceptación

- [ ] <criterio verificable 1>
- [ ] <criterio verificable 2>

## Fuera de alcance / follow-ups

<Qué se deja para un spec futuro.>
