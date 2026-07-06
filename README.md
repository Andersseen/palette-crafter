# Palette Crafter

Palette Crafter is an Angular + AnalogJS app for generating harmonious UI themes.

It has two core goals:

- Visual theme playground for designers and frontend teams.
- HTTP API so other apps can request generated themes directly.

## Stack

- Angular 21 (standalone components, zoneless)
- AnalogJS (SSR + file-based routing + API routes)
- Vite + Nitro
- Tailwind CSS v4
- Cloudflare Pages deployment via Wrangler

## What You Get

- Theme generator with accessible foreground/background contrast.
- Generated primary and secondary color scales (`50`..`950`, `DEFAULT`, `foreground`).
- SSR-ready app runtime.
- API endpoint to generate themes on demand.
- Cloudflare Pages build/deploy workflow.

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 10+

### Install

```bash
pnpm install
```

### Run Local Dev

```bash
pnpm dev
```

App URL:

- `http://localhost:4200`

## Scripts

- `pnpm dev`: start local development server.
- `pnpm clean`: remove build artifacts and Angular cache.
- `pnpm build`: production build.
- `pnpm build:cf`: production build targeting Cloudflare Pages preset.
- `pnpm dev:cf`: local Cloudflare Pages preview.
- `pnpm deploy:cf`: deploy to Cloudflare Pages.

## Theme API

Base path:

- `/api/v1/theme`

### How to Use the API Quickly

1. Start the app:

```bash
pnpm dev
```

2. Test a basic request:

```bash
curl -s "http://localhost:4200/api/v1/theme"
```

3. Test deterministic generation (same input => same output):

```bash
curl -s "http://localhost:4200/api/v1/theme?mode=dark&seed=brand-a&harmony=triadic&baseHue=220"
```

4. Test POST payload:

```bash
curl -sS -X POST "http://localhost:4200/api/v1/theme" \
  -H "Content-Type: application/json" \
  -d '{"mode":"light","seed":"landing-v1","harmony":"complementary","baseHue":210}'
```

5. Test validation errors (`400`):

```bash
curl -i "http://localhost:4200/api/v1/theme?mode=invalid"
curl -i "http://localhost:4200/api/v1/theme?baseHue=999"
```

Supported methods:

- `GET`
- `POST`

### Query/Body Params

- `mode`: `light` | `dark`
- `seed`: string | number (optional, for deterministic generation)
- `baseHue`: number `0..360` (optional)
- `harmony`: `analogous` | `complementary` | `split-complementary` | `triadic`

If a param is omitted, defaults are chosen automatically.

### Example: GET

```bash
curl "http://localhost:4200/api/v1/theme?mode=dark&seed=brand-a&harmony=triadic&baseHue=220"
```

### Example: POST

```bash
curl -X POST "http://localhost:4200/api/v1/theme" \
	-H "Content-Type: application/json" \
	-d '{
		"mode": "light",
		"seed": "landing-v1",
		"harmony": "complementary",
		"baseHue": 210
	}'
```

### Response Shape

```json
{
  "ok": true,
  "theme": {
    "bg": "#...",
    "fg": "#...",
    "primary": {
      "50": "#...",
      "100": "#...",
      "200": "#...",
      "300": "#...",
      "400": "#...",
      "500": "#...",
      "600": "#...",
      "700": "#...",
      "800": "#...",
      "900": "#...",
      "950": "#...",
      "DEFAULT": "#...",
      "foreground": "#..."
    },
    "secondary": {
      "50": "#...",
      "100": "#...",
      "200": "#...",
      "300": "#...",
      "400": "#...",
      "500": "#...",
      "600": "#...",
      "700": "#...",
      "800": "#...",
      "900": "#...",
      "950": "#...",
      "DEFAULT": "#...",
      "foreground": "#..."
    }
  },
  "meta": {
    "mode": "light",
    "baseHue": 210,
    "secondaryHue": 30,
    "harmony": "complementary",
    "seeded": true
  }
}
```

### Validation Errors

Returns `400` for invalid params, for example:

- invalid `mode`
- invalid `harmony`
- `baseHue` outside `0..360`

## Project Structure

- `src/app/pages`: Analog file-based routes.
- `src/server/routes/api`: API endpoints.
- `src/shared/theme-generator.ts`: shared theme generation logic used by UI and API.
- `src/services/color-palette.ts`: frontend state/service that consumes shared generator.

## For AI Agents

If you're an AI model/agent working in this repo, start at [AGENTS.md](./AGENTS.md) — it points to project context, current state, and repo-specific conventions in `docs/`.

## Cloudflare Pages Deployment

1. Login once locally:

```bash
pnpm wrangler login
```

2. Build and preview:

```bash
pnpm dev:cf
```

3. Deploy:

```bash
pnpm deploy:cf
```

For GitHub Actions deploys on `main`, configure:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

## Notes

- Theme generation is deterministic when `seed` is provided.
- UI and API share the same generation function to keep results consistent.
