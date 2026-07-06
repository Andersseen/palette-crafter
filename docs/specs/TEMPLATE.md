---
status: draft # draft | approved | in-progress | done
---

# <Name of the feature/change>

## Problem

<What can't be done today, or what's wrong, described from the perspective of whoever uses the playground or the API. No implementation details here.>

## Goal

<What this change aims to achieve. 1-3 bullets.>

## Non-goal (out of scope)

<What is explicitly left out, even if related. This prevents scope creep mid-implementation.>

## Design

<Which files/modules it touches. If it adds an endpoint, type, or new prop, write the exact shape (function signature, JSON shape, component props). If it changes a file in `src/shared/`, say so explicitly — it affects the API and the client at the same time (see CONVENTIONS.md #1).>

## Impact on existing contracts

- Does the `/api/v1/theme` response shape change? <yes/no + detail>
- Does the result change for a `seed` that already existed (determinism)? <yes/no + detail — see CONVENTIONS.md #2>
- Does it add/rename a CSS custom property? <yes/no + detail — must follow the pattern in CONVENTIONS.md #3>

## Acceptance criteria

- [ ] <verifiable criterion 1>
- [ ] <verifiable criterion 2>

## Out of scope / follow-ups

<What is left for a future spec.>
