import { describe, expect, it } from "vitest";

import { blend, buildContrastReport, wcagLevel } from "./contrast.js";
import { generateTheme } from "./theme-generator.js";
import { calculateContrast } from "./utils.js";

describe("blend", () => {
  it("returns the endpoints at alpha 0 and 1", () => {
    expect(blend("#ffffff", "#000000", 1)).toBe("#ffffff");
    expect(blend("#ffffff", "#000000", 0)).toBe("#000000");
  });

  it("composites midway", () => {
    expect(blend("#ffffff", "#000000", 0.5)).toBe("#808080");
  });
});

describe("wcagLevel", () => {
  it("grades body text against 7 / 4.5 / 3", () => {
    expect(wcagLevel(8, true)).toBe("AAA");
    expect(wcagLevel(7, true)).toBe("AAA");
    expect(wcagLevel(5, true)).toBe("AA");
    expect(wcagLevel(3.2, true)).toBe("AA Large");
    expect(wcagLevel(2.1, true)).toBe("Fail");
  });

  it("grades non-text UI against 3", () => {
    expect(wcagLevel(3, false)).toBe("AA");
    expect(wcagLevel(2.9, false)).toBe("Fail");
  });
});

describe("buildContrastReport", () => {
  it("measures muted text at its real opacity, not full strength", () => {
    const { theme } = generateTheme({ seed: "a", algorithm: "v2" });
    const report = buildContrastReport(theme);

    const muted = report.checks.find((entry) => entry.label === "Muted text");
    const body = report.checks.find((entry) => entry.label === "Body text");

    expect(muted).toBeDefined();
    expect(muted!.ratio).toBeLessThan(body!.ratio);
  });

  it("counts passing and failing checks consistently", () => {
    const { theme } = generateTheme({ seed: "b", algorithm: "v2" });
    const report = buildContrastReport(theme);

    expect(report.passing + report.failing).toBe(report.checks.length);
    expect(report.checks.every((entry) => entry.ratio >= 1)).toBe(true);
  });

  it("reports the ratio it actually computed", () => {
    const { theme } = generateTheme({ seed: "c", algorithm: "v2" });
    const report = buildContrastReport(theme);

    for (const entry of report.checks) {
      const expected = calculateContrast(entry.foreground, entry.background);
      expect(entry.ratio).toBeCloseTo(Math.round(expected * 100) / 100, 5);
    }
  });

  it("skips status colors that are switched off", () => {
    const { theme } = generateTheme({ seed: "d", algorithm: "v2" });
    const report = buildContrastReport(theme, {
      info: false,
      success: true,
      warning: false,
      danger: false,
    });

    const labels = report.checks.map((entry) => entry.label);
    expect(labels).toContain("Success button");
    expect(labels).not.toContain("Danger button");
  });

  it("passes every text pair the theme itself renders, for v2", () => {
    // Excludes "Primary as link text": a brand color chosen as a button fill is
    // not expected to double as body text, which is what the suggestion below
    // is for. Excludes "Border": decorative, non-text, deliberately subtle.
    const informational = new Set(["Primary as link text", "Border"]);

    for (const seed of ["a", "b", "c", "d", "e"]) {
      for (const mode of ["light", "dark"] as const) {
        const { theme } = generateTheme({ seed, mode, algorithm: "v2" });
        const failures = buildContrastReport(theme)
          .checks.filter((entry) => !entry.passes)
          .filter((entry) => !informational.has(entry.label));

        expect(failures.map((entry) => entry.label)).toEqual([]);
      }
    }
  });

  it("suggests a shade that genuinely passes when a check fails", () => {
    for (const seed of ["a", "b", "c", "d", "e"]) {
      for (const mode of ["light", "dark"] as const) {
        const { theme } = generateTheme({ seed, mode, algorithm: "v2" });
        const link = buildContrastReport(theme).checks.find(
          (entry) => entry.label === "Primary as link text",
        )!;

        if (link.passes) {
          expect(link.suggestion).toBeUndefined();
          continue;
        }

        expect(link.suggestion).toBeDefined();
        expect(link.suggestion!.ratio).toBeGreaterThanOrEqual(4.5);
        // The suggestion must be a real shade from the palette, not invented.
        expect(Object.values(theme.primary)).toContain(link.suggestion!.hex);
        expect(
          calculateContrast(link.suggestion!.hex, theme.bg),
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});
