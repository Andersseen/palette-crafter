# Palette Crafter

Palette Crafter generates deterministic, accessible color palettes — as a visual
playground and as an HTTP API. Both run the same generator, so a palette is
identical whichever way you ask for it.

- **Playground** — start from a brand hex or a random seed, lock what you like,
  reroll the rest, see the WCAG audit, export in six formats, share the link.
- **HTTP API** — `/api/v2/theme`, CORS-enabled and edge-cacheable.

## Stack

- Angular 21 (standalone components, zoneless)
- AnalogJS (SSR + file-based routing + API routes)
- Vite + Nitro
- Tailwind CSS v4
- Cloudflare Pages deployment via Wrangler

## Quick Start

Requires Node.js 20+ and pnpm 10+.

```bash
pnpm install
pnpm dev            # http://localhost:4200
```

## Scripts

- `pnpm dev` — local development server.
- `pnpm test` — run the test suite (`pnpm test:watch` for the watcher).
- `pnpm build` — production build.
- `pnpm build:cf` — production build targeting the Cloudflare Pages preset.
- `pnpm dev:cf` — local Cloudflare Pages preview.
- `pnpm deploy:cf` — deploy to Cloudflare Pages.
- `pnpm clean` — remove build artifacts and the Angular cache.

## Theme API

Two versions, both accepting `GET` and `POST`:

| Route            | Algorithm | Use it for                                  |
| ---------------- | --------- | ------------------------------------------- |
| `/api/v1/theme`  | `v1`      | Existing integrations. **Frozen forever.**  |
| `/api/v2/theme`  | `v2`      | Everything new.                             |

`v1` is frozen: a seed that worked a year ago returns exactly the same colors
today, and always will. `v2` is the current algorithm — perceptual OKLCH scales,
your brand hex preserved exactly, and AAA-level body text.

### Params

Accepted in the query string or in a JSON body.

| Param       | Values                                                            | Notes                                                       |
| ----------- | ----------------------------------------------------------------- | ----------------------------------------------------------- |
| `mode`      | `light` \| `dark`                                                 | Defaults to `light`.                                        |
| `seed`      | string (≤256 chars) \| number                                     | Same seed ⇒ same colors. Omit it and you get a random one.   |
| `baseHue`   | `0..360`                                                          | Ignored when `baseColor` is given.                          |
| `baseColor` | hex, e.g. `#ff6b35` or `#f63`                                     | **v2 only.** Appears verbatim in the generated scale.        |
| `harmony`   | `analogous` \| `complementary` \| `split-complementary` \| `triadic` | Picks the secondary hue.                                  |
| `algorithm` | `v1` \| `v2`                                                      | Overrides the route default.                                |
| `format`    | see [Export formats](#export-formats)                             | Returns a rendered file instead of JSON.                    |
| `contrast`  | `true`                                                            | Adds the WCAG audit to the response.                        |

Every invalid value returns `400` with a message saying what was wrong —
including an unparseable `baseHue`, which is not silently ignored.

### Examples

```bash
# Deterministic: this returns the same colors every time.
curl -s "http://localhost:4200/api/v2/theme?seed=brand-a&mode=dark&harmony=triadic"

# Build a palette around your actual brand color.
curl -s "http://localhost:4200/api/v2/theme?baseColor=%23ff6b35"

# Get a ready-to-paste Tailwind v4 @theme block.
curl -s "http://localhost:4200/api/v2/theme?seed=acme&format=tailwind" > theme.css

# Include the accessibility audit.
curl -s "http://localhost:4200/api/v2/theme?seed=acme&contrast=true"

# POST works too.
curl -sS -X POST "http://localhost:4200/api/v2/theme" \
  -H "Content-Type: application/json" \
  -d '{"mode":"light","seed":"landing-v1","harmony":"complementary"}'
```

### CORS and caching

- `Access-Control-Allow-Origin: *`, with `OPTIONS` preflight answered `204`.
  The API is public and read-only, and carries no credentials.
- Seeded requests are deterministic and therefore cacheable:
  `public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800`.
- Unseeded requests are random and served `no-store`.

### Response shape

```json
{
  "ok": true,
  "theme": {
    "bg": "#faf9fc",
    "fg": "#1a1620",
    "primary": {
      "50": "#...", "100": "#...", "200": "#...", "300": "#...",
      "400": "#...", "500": "#...", "600": "#...", "700": "#...",
      "800": "#...", "900": "#...", "950": "#...",
      "DEFAULT": "#...",
      "foreground": "#..."
    },
    "secondary": { "…": "same shape" },
    "status": {
      "info": { "…": "same shape" },
      "success": { "…": "same shape" },
      "warning": { "…": "same shape" },
      "danger": { "…": "same shape" }
    }
  },
  "meta": {
    "mode": "light",
    "baseHue": 210,
    "secondaryHue": 30,
    "harmony": "complementary",
    "seeded": true,
    "algorithm": "v2",
    "seed": "landing-v1"
  }
}
```

`meta` may gain fields over time; `theme` is stable per algorithm version.

## Export formats

Available in the playground and through `?format=` on the API. All of them emit
**literal color values**, so a pasted snippet works without anything else from
this project.

| `format`         | Output                                                |
| ---------------- | ----------------------------------------------------- |
| `tailwind`       | Tailwind v4 `@theme` block                            |
| `css`            | Plain custom properties on `:root`                    |
| `scss`           | SCSS variables plus a `$palette` map                  |
| `json`           | The raw theme payload                                 |
| `shadcn`         | Semantic tokens in the shape shadcn/ui expects        |
| `design-tokens`  | W3C Design Tokens, for Figma and Style Dictionary     |

## Accessibility

Contrast is measured, not assumed. `buildContrastReport` audits the pairs the
theme actually renders — including semi-transparent tokens composited at their
real opacity — and grades each against WCAG AA/AAA. When a pair falls short it
names the scale shade that would pass, rather than just reporting a failure.

In `v2` the body text pair targets 7:1 (AAA), and the primary button label
resolves to the same color for every hue, so palettes from the same tool don't
disagree with each other.

## Project structure

- `src/shared/` — the generator, exports and contrast logic. Framework-agnostic
  and free of environment-specific globals, since it runs in the browser, under
  SSR, and inside the Cloudflare Worker.
- `src/server/handlers/` — shared API logic (validation, CORS, caching).
- `src/server/routes/api/` — thin route files for `v1` and `v2`.
- `src/services/color-palette.ts` — Angular signal state; generates in-process.
- `src/components/`, `src/app/pages/` — the playground UI.

## Cloudflare Pages deployment

```bash
pnpm wrangler login   # once
pnpm dev:cf           # build and preview locally
pnpm deploy:cf        # deploy
```

For GitHub Actions deploys on `main`, configure `CLOUDFLARE_API_TOKEN` and
`CLOUDFLARE_ACCOUNT_ID`.

## For AI agents

Start at [AGENTS.md](./AGENTS.md) — it points to project context, current state,
and repo-specific conventions in `docs/`. Before changing the generator, read
[docs/CONVENTIONS.md](./docs/CONVENTIONS.md) rule 2: `v1` output is frozen and
there is a test that will catch you.
