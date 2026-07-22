import { describe, expect, it } from "vitest";

import {
  EXPORT_FORMATS,
  exportTheme,
  isExportFormat,
  permalinkFor,
  type ExportContext,
} from "./export";
import { generateTheme } from "./theme-generator";

const build = (overrides: Partial<ExportContext> = {}): ExportContext => {
  const { theme, meta } = generateTheme({
    seed: "export-fixture",
    mode: "light",
    algorithm: "v2",
  });

  return { theme, meta, ...overrides };
};

describe("exportTheme", () => {
  it("supports every advertised format", () => {
    const context = build();

    for (const format of EXPORT_FORMATS) {
      expect(isExportFormat(format.id)).toBe(true);
      expect(exportTheme(format.id, context).length).toBeGreaterThan(0);
    }
  });

  it("rejects unknown formats", () => {
    expect(isExportFormat("less")).toBe(false);
    expect(isExportFormat(undefined)).toBe(false);
  });

  it("emits literal colors, never references to runtime variables", () => {
    // The whole point of the export is that it works once pasted into someone
    // else's project, where this app's :root variables do not exist.
    const output = exportTheme("tailwind", build());

    expect(output).toContain("@theme {");
    expect(output).not.toContain("rgb(var(");
    expect(output).toMatch(/--color-primary: #[0-9a-f]{6};/);
  });

  it("honours single/scale mode", () => {
    const scale = exportTheme(
      "tailwind",
      build({
        options: { colorModes: { primary: "scale", secondary: "single" } },
      }),
    );

    expect(scale).toContain("--color-primary-500:");
    expect(scale).not.toContain("--color-secondary-500:");
  });

  it("only includes status colors that are switched on", () => {
    const context = build({
      options: {
        enabledStatusColors: {
          info: false,
          success: true,
          warning: false,
          danger: false,
        },
      },
    });
    const output = exportTheme("tailwind", context);

    expect(output).toContain("--color-success:");
    expect(output).not.toContain("--color-danger:");
  });

  it("emits bare RGB triplets in the CSS variables export", () => {
    // docs/CONVENTIONS.md #3 — consumed as rgb(var(--primary)).
    const output = exportTheme("css", build());
    expect(output).toMatch(/--primary: \d{1,3} \d{1,3} \d{1,3};/);
  });

  it("produces parseable JSON for the json and design-tokens formats", () => {
    const context = build();

    expect(() => JSON.parse(exportTheme("json", context))).not.toThrow();

    const tokens = JSON.parse(exportTheme("design-tokens", context));
    expect(tokens.color.primary.DEFAULT.$type).toBe("color");
    expect(tokens.color.primary.DEFAULT.$value).toBe(
      context.theme.primary.DEFAULT,
    );
  });

  it("targets .dark for a dark theme in the shadcn export", () => {
    const { theme, meta } = generateTheme({
      seed: "export-fixture",
      mode: "dark",
      algorithm: "v2",
    });

    expect(exportTheme("shadcn", { theme, meta })).toContain(".dark {");
    expect(exportTheme("shadcn", build())).toContain(":root {");
  });

  it("embeds a reproducible permalink when the theme was seeded", () => {
    expect(exportTheme("css", build())).toContain("seed=export-fixture");
  });

  it("says so when a palette cannot be reproduced", () => {
    const { theme, meta } = generateTheme({ algorithm: "v2" });
    expect(exportTheme("css", { theme, meta })).toContain("not reproducible");
  });
});

describe("permalinkFor", () => {
  it("round-trips the parameters needed to regenerate the palette", () => {
    const { meta } = generateTheme({
      seed: "brand-a",
      mode: "dark",
      harmony: "triadic",
      algorithm: "v2",
    });
    const url = new URL(permalinkFor(meta, "https://palette-crafter.pages.dev"));

    expect(url.searchParams.get("seed")).toBe("brand-a");
    expect(url.searchParams.get("mode")).toBe("dark");
    expect(url.searchParams.get("harmony")).toBe("triadic");
    expect(url.searchParams.get("algorithm")).toBe("v2");
  });

  it("prefers baseColor over baseHue when the palette came from a brand color", () => {
    const { meta } = generateTheme({
      baseColor: "#ff6b35",
      algorithm: "v2",
    });
    const url = new URL(permalinkFor(meta, "https://example.com"));

    expect(url.searchParams.get("baseColor")).toBe("#ff6b35");
    expect(url.searchParams.has("baseHue")).toBe(false);
  });
});
