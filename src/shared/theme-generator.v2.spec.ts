import { describe, expect, it } from "vitest";

import { generateTheme } from "./theme-generator.js";
import { calculateContrast, hexToOklch } from "./utils.js";
import type { HarmonyType, ThemeMode } from "./types.js";

const MODES: ThemeMode[] = ["light", "dark"];

describe("v2 algorithm", () => {
  it("is deterministic for a given seed", () => {
    for (const seed of ["brand-a", "acme", 7]) {
      for (const mode of MODES) {
        expect(generateTheme({ seed, mode, algorithm: "v2" })).toEqual(
          generateTheme({ seed, mode, algorithm: "v2" }),
        );
      }
    }
  });

  it("draws the same hue and harmony as v1 for the same seed", () => {
    // Only the colors change between algorithms, not the random stream.
    for (const seed of ["brand-a", "landing-v1", 42]) {
      const v1 = generateTheme({ seed, algorithm: "v1" }).meta;
      const v2 = generateTheme({ seed, algorithm: "v2" }).meta;

      expect(v2.baseHue).toBe(v1.baseHue);
      expect(v2.harmony).toBe(v1.harmony);
    }
  });

  it("produces a genuinely lighter primary in dark mode", () => {
    // The v1 bug: `generateColorScale` forced every DEFAULT to HSL L=50, so the
    // dark-mode primary came out no lighter than the light-mode one.
    for (const seed of ["brand-a", "acme", "palette-forge"]) {
      const light = generateTheme({ seed, mode: "light", algorithm: "v2" });
      const dark = generateTheme({ seed, mode: "dark", algorithm: "v2" });

      expect(hexToOklch(dark.theme.primary.DEFAULT).l).toBeGreaterThan(
        hexToOklch(light.theme.primary.DEFAULT).l,
      );
    }
  });

  it("still collapses light/dark primaries in v1, as a regression guard", () => {
    const light = generateTheme({ seed: "brand-a", mode: "light" });
    const dark = generateTheme({ seed: "brand-a", mode: "dark" });

    // Documents the v1 defect rather than hiding it: the difference is tiny.
    const delta = Math.abs(
      hexToOklch(dark.theme.primary.DEFAULT).l -
        hexToOklch(light.theme.primary.DEFAULT).l,
    );
    expect(delta).toBeLessThan(0.05);
  });

  it("uses a supplied brand color verbatim as the primary DEFAULT", () => {
    for (const baseColor of ["#ff6b35", "#3b82f6", "#0f766e"]) {
      for (const mode of MODES) {
        const result = generateTheme({ baseColor, mode, algorithm: "v2" });

        expect(result.theme.primary.DEFAULT).toBe(baseColor);
        expect(result.meta.baseColor).toBe(baseColor);
      }
    }
  });

  it("normalizes shorthand brand colors", () => {
    const result = generateTheme({ baseColor: "#f63", algorithm: "v2" });
    expect(result.theme.primary.DEFAULT).toBe("#ff6633");
  });

  it("derives the base hue from the brand color", () => {
    const baseColor = "#ff6b35";
    const result = generateTheme({ baseColor, algorithm: "v2" });

    expect(result.meta.baseHue).toBe(Math.round(hexToOklch(baseColor).h));
  });

  it("ignores baseColor on v1, which has no such parameter", () => {
    const withColor = generateTheme({
      seed: "brand-a",
      baseColor: "#ff6b35",
      algorithm: "v1",
    });
    const without = generateTheme({ seed: "brand-a", algorithm: "v1" });

    expect(withColor.theme).toEqual(without.theme);
    expect(withColor.meta.baseColor).toBeUndefined();
  });

  it("meets WCAG AAA on the body text pair", () => {
    for (const seed of ["a", "b", "c", "d", "e", "f"]) {
      for (const mode of MODES) {
        const { theme } = generateTheme({ seed, mode, algorithm: "v2" });
        expect(calculateContrast(theme.bg, theme.fg)).toBeGreaterThanOrEqual(7);
      }
    }
  });

  it("keeps every scale foreground above 4.5:1", () => {
    for (const seed of ["a", "b", "c", "d"]) {
      for (const mode of MODES) {
        const { theme } = generateTheme({ seed, mode, algorithm: "v2" });
        const scales = [
          theme.primary,
          theme.secondary,
          ...Object.values(theme.status ?? {}),
        ];

        for (const scale of scales) {
          expect(
            calculateContrast(scale.DEFAULT, scale.foreground),
          ).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });

  it("picks the same button label color for every hue", () => {
    // Guards the lightness choice in V2_BASE. If the primary drifts into the
    // band where white and black trade places, palettes from the same tool
    // start disagreeing on whether primary buttons have light or dark labels.
    for (const mode of MODES) {
      const foregrounds = new Set<string>();

      for (let baseHue = 0; baseHue < 360; baseHue += 15) {
        const { theme } = generateTheme({ baseHue, mode, algorithm: "v2" });
        foregrounds.add(theme.primary.foreground);
      }

      expect([...foregrounds]).toEqual([
        mode === "light" ? "#ffffff" : "#000000",
      ]);
    }
  });

  it("keeps the primary button label comfortably above the threshold", () => {
    for (const mode of MODES) {
      for (let baseHue = 0; baseHue < 360; baseHue += 15) {
        const { theme } = generateTheme({ baseHue, mode, algorithm: "v2" });

        expect(
          calculateContrast(theme.primary.DEFAULT, theme.primary.foreground),
        ).toBeGreaterThan(5);
      }
    }
  });

  it("applies the requested harmony to the secondary hue", () => {
    const cases: Array<[HarmonyType, number]> = [
      ["analogous", 30],
      ["complementary", 180],
      ["split-complementary", 150],
      ["triadic", 120],
    ];

    for (const [harmony, offset] of cases) {
      const { meta } = generateTheme({
        baseHue: 200,
        harmony,
        algorithm: "v2",
      });
      expect(meta.secondaryHue).toBe((200 + offset) % 360);
    }
  });

  it("echoes the seed back so a palette can be reproduced", () => {
    expect(generateTheme({ seed: "brand-a", algorithm: "v2" }).meta.seed).toBe(
      "brand-a",
    );
    expect(generateTheme({ algorithm: "v2" }).meta.seed).toBeUndefined();
  });
});
