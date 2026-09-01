import { describe, expect, it } from "vitest";

import { generateThemeFamily } from "./theme-generator";
import {
  VOLT_SEMANTIC_TOKENS,
  adaptThemeFamilyToVolt,
  adaptThemeToVolt,
  exportVoltThemeFamilyCss,
} from "./volt";
import { calculateContrast } from "./utils";

const expectPassingPair = (foreground: string, background: string): void => {
  expect(calculateContrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
};

describe("Volt theme adapter", () => {
  it("returns every semantic token Volt currently exposes", () => {
    const family = generateThemeFamily({
      seed: "volt-fixture",
      baseColor: "#ff6b35",
      algorithm: "v2",
    });
    const volt = adaptThemeToVolt(family.light, { mode: "light" });

    expect(Object.keys(volt).sort()).toEqual([...VOLT_SEMANTIC_TOKENS].sort());

    for (const token of VOLT_SEMANTIC_TOKENS) {
      expect(volt[token]).toMatch(/^#[0-9a-f]{6}$/);
      expect(volt[token]).not.toContain("undefined");
    }
  });

  it("maps Palette Crafter danger to Volt destructive and error", () => {
    const family = generateThemeFamily({ seed: "volt-fixture" });
    const volt = adaptThemeToVolt(family.light, { mode: "light" });

    expect(volt.destructive).toBe(family.light.status!.danger.DEFAULT);
    expect(volt.error).toBe(family.light.status!.danger.DEFAULT);
    expect(volt["destructive-foreground"]).toBe(
      family.light.status!.danger.foreground,
    );
    expect(volt["error-foreground"]).toBe(family.light.status!.danger.foreground);
  });

  it("creates different light and dark Volt themes", () => {
    const family = generateThemeFamily({ seed: "volt-fixture" });
    const volt = adaptThemeFamilyToVolt(family);

    expect(volt.light).not.toEqual(volt.dark);
    expect(volt.light.background).not.toBe(volt.dark.background);
    expect(volt.light.surface).not.toBe(volt.dark.surface);
  });

  it("keeps critical foreground/background pairs above AA contrast", () => {
    for (const seed of ["volt-a", "volt-b", "volt-c"]) {
      const family = generateThemeFamily({ seed, algorithm: "v2" });
      const volt = adaptThemeFamilyToVolt(family);

      for (const theme of [volt.light, volt.dark]) {
        expectPassingPair(theme.foreground, theme.background);
        expectPassingPair(theme["surface-foreground"], theme.surface);
        expectPassingPair(theme["primary-foreground"], theme.primary);
        expectPassingPair(theme["secondary-foreground"], theme.secondary);
        expectPassingPair(theme["destructive-foreground"], theme.destructive);
        expectPassingPair(theme["success-foreground"], theme.success);
        expectPassingPair(theme["warning-foreground"], theme.warning);
        expectPassingPair(theme["info-foreground"], theme.info);
      }
    }
  });

  it("exports a complete light and dark CSS contract", () => {
    const family = generateThemeFamily({ seed: "volt-fixture" });
    const css = exportVoltThemeFamilyCss(family);

    expect(css).toContain(":root {");
    expect(css).toContain(".dark {");
    expect(css).toContain("--surface:");
    expect(css).toContain("--destructive:");
    expect(css).not.toContain("undefined");
  });
});
