/// <reference types="vitest" />

import { defineConfig } from "vite";
import analog from "@analogjs/platform";
import viteTsConfigPaths from "vite-tsconfig-paths";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  return {
    root: __dirname,
    cacheDir: "./node_modules/.vite",
    build: {
      outDir: "./dist/client",
      reportCompressedSize: true,
      target: ["es2020"],
    },
    plugins: [
      analog({
        ssr: true,
        prerender: {
          routes: ["/"],
        },
        nitro: {
          preset: process.env["BUILD_PRESET"],
        },
      }),
      viteTsConfigPaths(),
    ],
    optimizeDeps: {
      entries: ["index.html"],
    },
    resolve: {
      /*
       * `ng-primitives` (via @voltui/components) resolves elements with the
       * CDK's `coerceElement`, which is an `instanceof ElementRef` check. If the
       * dev SSR graph ends up with a second copy of @angular/core, that check
       * fails, the raw ElementRef is handed to `addEventListener`, and the whole
       * server render dies with "nativeElement.addEventListener is not a
       * function". Deduping keeps one instance so `instanceof` holds.
       * The production build already bundles a single copy, which is why only
       * `pnpm dev` was affected.
       */
      dedupe: ["@angular/core", "@angular/common", "@angular/cdk"],
    },
    server: {
      fs: {
        allow: ["."],
      },
    },
    envPrefix: ["VITE_", "THEME_"],
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: ["src/test-setup.ts"],
      include: ["**/*.spec.ts"],
      reporters: ["default"],
    },
    define: {
      "import.meta.vitest": mode !== "production",
    },
  };
});
