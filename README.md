# Palette Crafter

Palette Crafter is a colorful playground for exploring and tuning Tailwind CSS color palettes in an Angular application.

## Features

- Generate and preview Tailwind CSS color scales
- Live development server with hot reloading
- Production-ready builds via Angular CLI

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm or npm

### Installation

```bash
pnpm install
```

### Development

Start a local dev server:

```bash
pnpm dev
```

### Build

Create an optimized production build:

```bash
pnpm build
```

### Cloudflare Pages SSR

Run the Cloudflare Pages build locally after generating the Pages output:

```bash
pnpm dev:cf
```

Deploy the SSR app to Cloudflare Pages:

```bash
pnpm deploy:cf
```

Build the Cloudflare Pages-compatible output explicitly:

```bash
pnpm build:cf
```

For local use, authenticate once with Wrangler:

```bash
pnpm wrangler login
```

For GitHub Actions deployments on pushes to `main`, add these repository secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

## Project Structure

- `src/` - Angular application source code
- `angular.json` - Angular workspace configuration
- `styles.css` (if present) - Tailwind customization

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

This project is currently unlicensed; feel free to fork and explore.
