import { describe, expect, it } from "vitest";

import { generateTheme } from "./theme-generator";
import type { HarmonyType, ThemeMode } from "./types";

/**
 * FROZEN PUBLIC CONTRACT — see docs/CONVENTIONS.md #2.
 *
 * `GET/POST /api/v1/theme` promises that the same `seed` always returns the
 * same colors. Every seed already in use in production depends on it.
 *
 * These assertions are the executable record of that promise. If a change makes
 * this file fail, the algorithm changed and every existing v1 seed silently
 * changed color: that is a breaking change, not a fix. Do not run `vitest -u`
 * to make it pass — add a new algorithm version instead (see `algorithm: "v2"`).
 *
 * Only `theme` (the colors) is frozen. `meta` is descriptive and may grow new
 * fields additively without breaking consumers.
 */

const SEEDS = [
  "palette-crafter-home",
  "brand-a",
  "landing-v1",
  "acme-corp",
  0,
  1,
  42,
  2 ** 31,
] as const;

const MODES: ThemeMode[] = ["light", "dark"];

const HARMONIES: HarmonyType[] = [
  "analogous",
  "complementary",
  "split-complementary",
  "triadic",
];

describe("v1 determinism contract (frozen)", () => {
  it("returns identical output for repeated calls with the same seed", () => {
    for (const seed of SEEDS) {
      for (const mode of MODES) {
        const first = generateTheme({ seed, mode, algorithm: "v1" });
        const second = generateTheme({ seed, mode, algorithm: "v1" });
        expect(second).toEqual(first);
      }
    }
  });

  it("defaults to the v1 algorithm when none is requested", () => {
    expect(generateTheme({ seed: "brand-a" }).theme).toEqual(
      generateTheme({ seed: "brand-a", algorithm: "v1" }).theme,
    );
  });

  /**
   * Hardcoded on purpose: unlike `toMatchSnapshot`, these cannot be silently
   * rewritten by `vitest -u`. They are the tripwire on the contract.
   */
  it("produces the exact documented colors for known seeds", () => {
    const home = generateTheme({
      seed: "palette-crafter-home",
      mode: "light",
      algorithm: "v1",
    });
    expect(home.theme.bg).toBe("#faf9fa");
    expect(home.theme.fg).toBe("#1a141f");
    expect(home.theme.primary.DEFAULT).toBe("#8826d9");
    expect(home.theme.secondary.DEFAULT).toBe("#d22dca");
    expect(home.meta).toMatchObject({
      mode: "light",
      baseHue: 273,
      secondaryHue: 303,
      harmony: "analogous",
      seeded: true,
    });

    const readme = generateTheme({
      seed: "brand-a",
      mode: "dark",
      harmony: "triadic",
      baseHue: 220,
      algorithm: "v1",
    });
    expect(readme.theme.bg).toBe("#101318");
    expect(readme.theme.fg).toBe("#f0f2f4");
    expect(readme.theme.primary.DEFAULT).toBe("#3366cc");
    expect(readme.theme.secondary.DEFAULT).toBe("#c63968");
    expect(readme.meta).toMatchObject({ secondaryHue: 340 });
  });

  it("keeps the full v1 scale shape stable for a known seed", () => {
    const { theme } = generateTheme({
      seed: "landing-v1",
      mode: "light",
      harmony: "complementary",
      algorithm: "v1",
    });

    expect(theme.primary).toEqual({
      50: "#f6e9fb",
      100: "#edd4f7",
      200: "#daa8f0",
      300: "#c87de8",
      400: "#b652e0",
      500: "#a326d9",
      600: "#831fad",
      700: "#621782",
      800: "#410f57",
      900: "#21082b",
      950: "#100416",
      DEFAULT: "#a326d9",
      foreground: "#ffffff",
    });
  });

  it("matches the frozen snapshot across the seed/mode/harmony matrix", () => {
    for (const seed of SEEDS) {
      for (const mode of MODES) {
        for (const harmony of HARMONIES) {
          const { theme } = generateTheme({
            seed,
            mode,
            harmony,
            algorithm: "v1",
          });
          expect(theme).toMatchSnapshot(`${seed}|${mode}|${harmony}`);
        }
      }
    }
  });

  it("keeps baseHue-driven output stable", () => {
    for (let hue = 0; hue <= 360; hue += 45) {
      for (const mode of MODES) {
        const { theme } = generateTheme({
          baseHue: hue,
          mode,
          seed: "hue-probe",
          algorithm: "v1",
        });
        expect(theme).toMatchSnapshot(`hue-${hue}|${mode}`);
      }
    }
  });
});
