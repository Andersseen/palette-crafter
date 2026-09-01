import { describe, expect, it } from "vitest";

import { generateTheme, generateThemeFamily } from "./theme-generator";

describe("generateThemeFamily", () => {
  it("is deterministic for a seeded identity", () => {
    const options = {
      seed: "family-fixture",
      baseColor: "#ff6b35",
      harmony: "triadic" as const,
      algorithm: "v2" as const,
    };

    expect(generateThemeFamily(options)).toEqual(generateThemeFamily(options));
  });

  it("generates light and dark from the same identity metadata", () => {
    const family = generateThemeFamily({
      seed: "family-fixture",
      baseHue: 220,
      harmony: "split-complementary",
      algorithm: "v2",
    });

    expect(family.meta).toMatchObject({
      seed: "family-fixture",
      baseHue: 220,
      secondaryHue: 10,
      harmony: "split-complementary",
      algorithm: "v2",
      seeded: true,
    });
  });

  it("preserves baseColor, harmony and algorithm for both generated modes", () => {
    const family = generateThemeFamily({
      seed: "brand-a",
      baseColor: "#ff6b35",
      harmony: "complementary",
      algorithm: "v2",
    });

    expect(family.meta.baseColor).toBe("#ff6b35");
    expect(family.meta.harmony).toBe("complementary");
    expect(family.meta.algorithm).toBe("v2");
    expect(family.light.primary.DEFAULT).toBe("#ff6b35");
    expect(family.dark.primary.DEFAULT).toBe("#ff6b35");
  });

  it("returns genuinely different light and dark themes", () => {
    const family = generateThemeFamily({ seed: "brand-a", algorithm: "v2" });

    expect(family.light).not.toEqual(family.dark);
    expect(family.light.bg).not.toBe(family.dark.bg);
    expect(family.light.fg).not.toBe(family.dark.fg);
  });

  it("does not change generateTheme output for a single mode", () => {
    const options = {
      seed: "brand-a",
      mode: "dark" as const,
      baseHue: 220,
      harmony: "triadic" as const,
      algorithm: "v2" as const,
    };

    expect(generateThemeFamily(options).dark).toEqual(
      generateTheme(options).theme,
    );
  });

  it("can generate a v1 family without changing v1 output", () => {
    const family = generateThemeFamily({
      seed: "brand-a",
      baseHue: 220,
      harmony: "triadic",
      algorithm: "v1",
    });

    expect(family.light).toEqual(
      generateTheme({
        seed: "brand-a",
        baseHue: 220,
        harmony: "triadic",
        mode: "light",
        algorithm: "v1",
      }).theme,
    );
    expect(family.dark).toEqual(
      generateTheme({
        seed: "brand-a",
        baseHue: 220,
        harmony: "triadic",
        mode: "dark",
        algorithm: "v1",
      }).theme,
    );
  });
});
