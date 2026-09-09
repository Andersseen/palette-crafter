import { describe, expect, it } from "vitest";

import { generateTheme, generateThemeFamily } from "./theme-generator";
import { calculateContrast, hexToOklch, oklabDistance } from "./utils";
import type { StatusColorName, Theme, ThemeMode } from "./types";

const MODES: ThemeMode[] = ["light", "dark"];
const STATUS_NAMES: StatusColorName[] = [
  "info",
  "success",
  "warning",
  "danger",
];

const SEMANTIC_RANGES: Record<
  StatusColorName,
  { min: number; max: number }
> = {
  info: { min: 210, max: 285 },
  success: { min: 135, max: 175 },
  warning: { min: 55, max: 98 },
  danger: { min: 350, max: 42 },
};

const BRAND_COLORS = [
  "#dc2626",
  "#ff6b35",
  "#facc15",
  "#16a34a",
  "#0f766e",
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#ff006e",
] as const;

const isHueInRange = (
  hue: number,
  range: { min: number; max: number },
): boolean => {
  const h = ((hue % 360) + 360) % 360;
  const min = (range.min + 356) % 360;
  const max = (range.max + 4) % 360;

  return min <= max ? h >= min && h <= max : h >= min || h <= max;
};

const averageStatusChroma = (theme: Theme): number => {
  const values = STATUS_NAMES.map(
    (name) => hexToOklch(theme.status![name].DEFAULT).c,
  );
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

describe("v3 algorithm", () => {
  it("is deterministic for the same complete identity", () => {
    const options = {
      seed: "adaptive-fixture",
      baseColor: "#7c3aed",
      harmony: "split-complementary" as const,
      mode: "dark" as const,
      algorithm: "v3" as const,
    };

    expect(generateTheme(options)).toEqual(generateTheme(options));
  });

  it("keeps the same hue stream as v1 and v2 for seeded palettes", () => {
    for (const seed of ["brand-a", "adaptive", 42]) {
      const v1 = generateTheme({ seed, algorithm: "v1" }).meta;
      const v2 = generateTheme({ seed, algorithm: "v2" }).meta;
      const v3 = generateTheme({ seed, algorithm: "v3" }).meta;

      expect(v3.baseHue).toBe(v1.baseHue);
      expect(v3.baseHue).toBe(v2.baseHue);
      expect(v3.harmony).toBe(v1.harmony);
      expect(v3.harmony).toBe(v2.harmony);
    }
  });

  it("preserves a supplied brand color as the primary DEFAULT", () => {
    for (const mode of MODES) {
      const result = generateTheme({
        baseColor: "#ff6b35",
        mode,
        algorithm: "v3",
      });

      expect(result.theme.primary.DEFAULT).toBe("#ff6b35");
      expect(result.meta.baseColor).toBe("#ff6b35");
    }
  });

  it("keeps semantic hues inside recognizable status families", () => {
    for (const mode of MODES) {
      for (let baseHue = 0; baseHue < 360; baseHue += 15) {
        const { theme } = generateTheme({ baseHue, mode, algorithm: "v3" });

        for (const name of STATUS_NAMES) {
          const hue = hexToOklch(theme.status![name].DEFAULT).h;
          expect(isHueInRange(hue, SEMANTIC_RANGES[name])).toBe(true);
        }
      }
    }
  });

  it("adapts status colors to different palette identities", () => {
    const violet = generateTheme({
      baseColor: "#7c3aed",
      harmony: "analogous",
      algorithm: "v3",
    }).theme.status;
    const terracotta = generateTheme({
      baseColor: "#ff6b35",
      harmony: "analogous",
      algorithm: "v3",
    }).theme.status;

    expect(violet).not.toEqual(terracotta);

    for (const name of STATUS_NAMES) {
      expect(violet![name].DEFAULT).not.toBe(terracotta![name].DEFAULT);
    }
  });

  it("adapts semantic chroma for muted and vivid brands", () => {
    const muted = generateTheme({
      baseColor: "#64748b",
      algorithm: "v3",
    }).theme;
    const vivid = generateTheme({
      baseColor: "#ff006e",
      algorithm: "v3",
    }).theme;

    expect(averageStatusChroma(vivid)).toBeGreaterThan(
      averageStatusChroma(muted) + 0.015,
    );
  });

  it("keeps every status foreground above WCAG AA contrast", () => {
    for (const mode of MODES) {
      for (const baseColor of BRAND_COLORS) {
        const { theme } = generateTheme({ baseColor, mode, algorithm: "v3" });

        for (const name of STATUS_NAMES) {
          const scale = theme.status![name];
          expect(
            calculateContrast(scale.DEFAULT, scale.foreground),
          ).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });

  it("keeps statuses perceptually separated from brand colors and each other", () => {
    // OKLab distances around 0.04 are already plainly visible for saturated UI
    // fills; these floors catch confusing near-collisions without forcing a
    // fragile optimization problem.
    for (const mode of MODES) {
      for (const baseColor of BRAND_COLORS) {
        const { theme } = generateTheme({
          baseColor,
          mode,
          harmony: "triadic",
          algorithm: "v3",
        });
        const statusColors = STATUS_NAMES.map(
          (name) => theme.status![name].DEFAULT,
        );

        for (const status of statusColors) {
          expect(oklabDistance(status, theme.primary.DEFAULT)).toBeGreaterThan(
            0.04,
          );
          expect(oklabDistance(status, theme.secondary.DEFAULT)).toBeGreaterThan(
            0.04,
          );
        }

        for (let i = 0; i < statusColors.length; i += 1) {
          for (let j = i + 1; j < statusColors.length; j += 1) {
            expect(
              oklabDistance(statusColors[i], statusColors[j]),
            ).toBeGreaterThan(0.055);
          }
        }
      }
    }
  });

  it("generates deterministic light/dark families from one v3 identity", () => {
    const options = {
      seed: "family-v3",
      baseColor: "#0f766e",
      harmony: "complementary" as const,
    };
    const family = generateThemeFamily(options);

    expect(family).toEqual(generateThemeFamily(options));
    expect(family.meta.algorithm).toBe("v3");
    expect(family.light.primary.DEFAULT).toBe("#0f766e");
    expect(family.dark.primary.DEFAULT).toBe("#0f766e");
    expect(family.light.status).not.toEqual(family.dark.status);
  });
});
