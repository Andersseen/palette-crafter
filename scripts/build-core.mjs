/**
 * Builds the publishable `@palette-crafter/core` package into dist/core.
 *
 * The package is generated rather than kept as a second source tree so there is
 * only ever one copy of the generator: the app, the HTTP API and the npm
 * package all compile from src/shared.
 *
 * Publishing is a separate, deliberate step:
 *   pnpm build:core && npm publish dist/core --access public
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "dist", "core");

const appPackage = JSON.parse(
  readFileSync(join(root, "package.json"), "utf8"),
);

execFileSync("npx", ["tsc", "-p", "tsconfig.core.json"], {
  cwd: root,
  stdio: "inherit",
});

const corePackage = {
  name: "@palette-crafter/core",
  version: appPackage.version ?? "0.1.0",
  description:
    "Deterministic, accessible color palette generation. Pure TypeScript, zero dependencies.",
  keywords: [
    "color",
    "palette",
    "theme",
    "oklch",
    "wcag",
    "accessibility",
    "tailwind",
    "design-tokens",
  ],
  author: appPackage.author,
  license: appPackage.license,
  repository: appPackage.repository,
  homepage: appPackage.homepage,
  type: "module",
  sideEffects: false,
  exports: {
    ".": {
      types: "./index.d.ts",
      import: "./index.js",
    },
  },
  types: "./index.d.ts",
  main: "./index.js",
  files: ["*.js", "*.d.ts", "*.d.ts.map", "README.md"],
  engines: { node: ">=18" },
};

writeFileSync(
  join(outDir, "package.json"),
  `${JSON.stringify(corePackage, null, 2)}\n`,
);

writeFileSync(
  join(outDir, "README.md"),
  `# @palette-crafter/core

Deterministic, accessible color palette generation. Pure TypeScript, zero
dependencies — runs in the browser, on a worker, and at build time.

This is the same engine behind [Palette Crafter](${appPackage.homepage}) and its
HTTP API, so a palette generated here is identical to one fetched from
\`/api/v2/theme\`.

## Install

\`\`\`sh
npm install @palette-crafter/core
\`\`\`

## Usage

\`\`\`ts
import { generateTheme, exportTheme, buildContrastReport } from "@palette-crafter/core";

// The same seed always returns the same colors.
const { theme, meta } = generateTheme({
  seed: "acme-brand",
  mode: "light",
  algorithm: "v2",
});

// Or start from a brand color — the exact hex is kept in the scale.
const branded = generateTheme({ baseColor: "#ff6b35", algorithm: "v2" });

// Emit a Tailwind v4 @theme block, CSS variables, SCSS, JSON, shadcn or
// W3C design tokens.
const css = exportTheme("tailwind", { theme, meta });

// Audit the pairs the theme actually renders.
const report = buildContrastReport(theme);
\`\`\`

## Algorithms

\`v1\` is frozen: seeds already in use keep returning the same colors forever.
\`v2\` is the current one — perceptual OKLCH scales, the input color preserved at
its matching shade, and AAA body text. Pass \`algorithm\` explicitly; it defaults
to \`v1\`.

## License

${appPackage.license}
`,
);

console.log(`\n@palette-crafter/core built into ${outDir}`);
console.log("Publish with: npm publish dist/core --access public");
