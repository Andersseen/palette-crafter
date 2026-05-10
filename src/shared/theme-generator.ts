import {
  generateColorScale,
  hslToHex,
  calculateContrast,
  hexToHsl,
} from "./utils";
import type { HarmonyType, Theme, ThemeMode } from "./types";

export interface ThemeGenerationOptions {
  mode?: ThemeMode;
  seed?: number | string;
  baseHue?: number;
  harmony?: HarmonyType;
}

export interface ThemeGenerationResult {
  theme: Theme;
  meta: {
    mode: ThemeMode;
    baseHue: number;
    secondaryHue: number;
    harmony: HarmonyType;
    seeded: boolean;
  };
}

const HARMONIES: HarmonyType[] = [
  "analogous",
  "complementary",
  "split-complementary",
  "triadic",
];

const clampHue = (value: number): number => {
  const n = Number.isFinite(value) ? Math.round(value) : 0;
  return ((n % 360) + 360) % 360;
};

const normalizeSeed = (seed: number | string): number => {
  if (typeof seed === "number") {
    return seed >>> 0;
  }

  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const mulberry32 = (a: number) => {
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const pickHarmony = (random: () => number): HarmonyType => {
  const idx = Math.floor(random() * HARMONIES.length);
  return HARMONIES[Math.min(idx, HARMONIES.length - 1)];
};

const secondaryHueForHarmony = (
  baseHue: number,
  harmony: HarmonyType,
): number => {
  switch (harmony) {
    case "analogous":
      return (baseHue + 30) % 360;
    case "complementary":
      return (baseHue + 180) % 360;
    case "split-complementary":
      return (baseHue + 150) % 360;
    case "triadic":
    default:
      return (baseHue + 120) % 360;
  }
};

const ensureAccessibleForeground = (
  bgColor: string,
  fgColor: string,
): string => {
  let current = fgColor;
  while (calculateContrast(bgColor, current) < 4.5) {
    const hsl = hexToHsl(current);
    const nextL =
      bgColor === "#ffffff" ? Math.max(hsl.l - 5, 0) : Math.min(hsl.l + 5, 100);
    if (nextL === hsl.l) {
      break;
    }
    current = hslToHex(hsl.h, hsl.s, nextL);
  }
  return current;
};

export const generateTheme = (
  options: ThemeGenerationOptions = {},
): ThemeGenerationResult => {
  const mode: ThemeMode = options.mode ?? "light";
  const seeded = options.seed !== undefined;
  const random = seeded
    ? mulberry32(normalizeSeed(options.seed as number | string))
    : Math.random;

  const baseHue = clampHue(options.baseHue ?? Math.floor(random() * 360));
  const harmony = options.harmony ?? pickHarmony(random);
  const secondaryHue = secondaryHueForHarmony(baseHue, harmony);

  let bgColor: string;
  let fgColor: string;
  let primaryBase: string;
  let secondaryBase: string;

  if (mode === "light") {
    bgColor = hslToHex(baseHue, 10, 98);
    fgColor = hslToHex(baseHue, 20, 10);
    primaryBase = hslToHex(baseHue, 70, 50);
    secondaryBase = hslToHex(secondaryHue, 65, 45);
  } else {
    bgColor = hslToHex(baseHue, 20, 8);
    fgColor = hslToHex(baseHue, 15, 95);
    primaryBase = hslToHex(baseHue, 60, 60);
    secondaryBase = hslToHex(secondaryHue, 55, 60);
  }

  fgColor = ensureAccessibleForeground(bgColor, fgColor);
  const statusLightness = mode === "light" ? 52 : 62;

  return {
    theme: {
      bg: bgColor,
      fg: fgColor,
      primary: generateColorScale(primaryBase),
      secondary: generateColorScale(secondaryBase),
      status: {
        info: generateColorScale(
          hslToHex(210, mode === "light" ? 80 : 70, statusLightness),
        ),
        success: generateColorScale(
          hslToHex(145, mode === "light" ? 65 : 55, mode === "light" ? 42 : 52),
        ),
        warning: generateColorScale(
          hslToHex(42, mode === "light" ? 88 : 78, statusLightness),
        ),
        danger: generateColorScale(
          hslToHex(0, mode === "light" ? 72 : 62, statusLightness),
        ),
      },
    },
    meta: {
      mode,
      baseHue,
      secondaryHue,
      harmony,
      seeded,
    },
  };
};
