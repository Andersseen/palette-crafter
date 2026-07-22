import { describe, expect, it } from "vitest";

import {
  bestForeground,
  calculateContrast,
  generateColorScale,
  generateColorScaleV2,
  hexToOklch,
  hexToRgb,
  isValidHex,
  normalizeHex,
  oklchToHex,
} from "./utils";

const SHADES = [
  50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950,
] as const;

describe("normalizeHex", () => {
  it("accepts shorthand, longhand, and a missing hash", () => {
    expect(normalizeHex("#abc")).toBe("#aabbcc");
    expect(normalizeHex("abc")).toBe("#aabbcc");
    expect(normalizeHex("#AABBCC")).toBe("#aabbcc");
    expect(normalizeHex("  #3b82f6  ")).toBe("#3b82f6");
  });

  it("rejects anything that is not a hex color", () => {
    for (const invalid of ["", "#", "#ab", "#abcd", "red", "#gggggg", "#12345"]) {
      expect(normalizeHex(invalid)).toBeNull();
      expect(isValidHex(invalid)).toBe(false);
    }
  });
});

describe("hexToRgb", () => {
  it("emits the bare triplet the CSS variables depend on", () => {
    // Not `rgb(...)` and not hex — see docs/CONVENTIONS.md #3.
    expect(hexToRgb("#3b82f6")).toBe("59 130 246");
    expect(hexToRgb("#000000")).toBe("0 0 0");
    expect(hexToRgb("#ffffff")).toBe("255 255 255");
  });
});

describe("OKLCH conversion", () => {
  it("round-trips in-gamut colors within one 8-bit step", () => {
    for (const hex of [
      "#3b82f6",
      "#10b981",
      "#dc2626",
      "#f59e0b",
      "#111827",
      "#f9fafb",
      "#7c3aed",
    ]) {
      expect(oklchToHex(hexToOklch(hex))).toBe(hex);
    }
  });

  it("maps out-of-gamut chroma by reducing chroma, preserving hue", () => {
    // Chroma 0.4 at this lightness is far outside sRGB.
    const clipped = oklchToHex({ l: 0.65, c: 0.4, h: 150 });
    const actual = hexToOklch(clipped);

    expect(actual.c).toBeLessThan(0.4);
    expect(Math.abs(actual.h - 150)).toBeLessThan(1.5);
    expect(Math.abs(actual.l - 0.65)).toBeLessThan(0.02);
  });

  it("produces valid 6-digit hex for extreme inputs", () => {
    for (const color of [
      { l: 0, c: 0, h: 0 },
      { l: 1, c: 0, h: 0 },
      { l: 0.5, c: 0.9, h: 300 },
      { l: 0.5, c: 0, h: 999 },
    ]) {
      expect(oklchToHex(color)).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe("bestForeground", () => {
  it("returns whichever of white/black actually contrasts more", () => {
    expect(bestForeground("#ffffff")).toBe("#000000");
    expect(bestForeground("#000000")).toBe("#ffffff");
    expect(bestForeground("#f59e0b")).toBe("#000000");
    expect(bestForeground("#1d4ed8")).toBe("#ffffff");
  });

  it("never returns the worse of the two options", () => {
    for (let l = 0; l <= 1.0001; l += 0.05) {
      for (let h = 0; h < 360; h += 30) {
        const bg = oklchToHex({ l, c: 0.12, h });
        const chosen = bestForeground(bg);
        const other = chosen === "#ffffff" ? "#000000" : "#ffffff";

        expect(calculateContrast(bg, chosen)).toBeGreaterThanOrEqual(
          calculateContrast(bg, other),
        );
      }
    }
  });
});

describe("generateColorScale (v1, frozen)", () => {
  it("still discards input lightness — documented v1 limitation", () => {
    // Two inputs differing only in lightness collapse to the same DEFAULT.
    const light = generateColorScale("#5c85d6");
    const dark = generateColorScale("#1a3a80");

    expect(light.DEFAULT).toBe(light[500]);
    expect(dark.DEFAULT).toBe(dark[500]);
  });
});

describe("generateColorScaleV2", () => {
  it("preserves the input color exactly, at the shade matching its lightness", () => {
    for (const hex of ["#3b82f6", "#f59e0b", "#7c3aed", "#0f766e", "#fca5a5"]) {
      const scale = generateColorScaleV2(hex);

      expect(scale.DEFAULT).toBe(hex);
      expect(SHADES.some((shade) => scale[shade] === hex)).toBe(true);
    }
  });

  it("anchors a light input high in the scale and a dark input low", () => {
    const light = generateColorScaleV2("#fca5a5");
    const dark = generateColorScaleV2("#7f1d1d");

    const anchorOf = (scale: ReturnType<typeof generateColorScaleV2>) =>
      SHADES.find((shade) => scale[shade] === scale.DEFAULT);

    expect(anchorOf(light)).toBeLessThan(400);
    expect(anchorOf(dark)).toBeGreaterThan(700);
  });

  it("produces a monotonically darkening ramp", () => {
    for (const hex of ["#3b82f6", "#f59e0b", "#10b981"]) {
      const scale = generateColorScaleV2(hex);

      for (let i = 1; i < SHADES.length; i += 1) {
        const previous = hexToOklch(scale[SHADES[i - 1]]).l;
        const current = hexToOklch(scale[SHADES[i]]).l;
        expect(current).toBeLessThan(previous);
      }
    }
  });

  it("keeps shade 500 perceptually consistent across hues", () => {
    // The v1 failure this fixes: yellow-500 scored 1.98:1 against white while
    // blue-500 scored 5.48:1 — a ~3.5x spread for the same shade number.
    const ratios = [0, 60, 120, 180, 240, 300].map((h) => {
      const base = oklchToHex({ l: 0.646, c: 0.15, h });
      return calculateContrast(generateColorScaleV2(base)[500], "#ffffff");
    });

    const spread = Math.max(...ratios) / Math.min(...ratios);
    expect(spread).toBeLessThan(1.35);
  });

  it("assigns a foreground that clears 4.5:1 against DEFAULT", () => {
    for (let h = 0; h < 360; h += 20) {
      const scale = generateColorScaleV2(oklchToHex({ l: 0.6, c: 0.15, h }));
      expect(
        calculateContrast(scale.DEFAULT, scale.foreground),
      ).toBeGreaterThanOrEqual(4.5);
    }
  });
});
