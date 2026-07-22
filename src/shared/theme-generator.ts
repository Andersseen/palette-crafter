import {
  bestForeground,
  calculateContrast,
  generateColorScale,
  generateColorScaleV2,
  hexToHsl,
  hexToOklch,
  hslToHex,
  normalizeHex,
  oklchToHex,
} from "./utils";
import type {
  ColorScale,
  HarmonyType,
  Theme,
  ThemeAlgorithm,
  ThemeMode,
} from "./types";

export interface ThemeGenerationOptions {
  mode?: ThemeMode;
  seed?: number | string;
  baseHue?: number;
  harmony?: HarmonyType;
  /**
   * Exact brand color to build the primary scale from (v2 only).
   * Takes precedence over `baseHue`, which is then derived from it.
   */
  baseColor?: string;
  /** Defaults to `v1` so existing API consumers are never moved silently. */
  algorithm?: ThemeAlgorithm;
}

export interface ThemeGenerationResult {
  theme: Theme;
  meta: {
    mode: ThemeMode;
    baseHue: number;
    secondaryHue: number;
    harmony: HarmonyType;
    seeded: boolean;
    algorithm: ThemeAlgorithm;
    seed?: string | number;
    baseColor?: string;
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

/** v1 foreground nudging: walks HSL lightness until it clears 4.5:1. */
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

/**
 * v2 foreground nudging: walks OKLCH lightness away from the background until
 * the pair clears `target`.
 *
 * Targets 7:1 (WCAG AAA) rather than v1's 4.5:1 — this is the body-text pair,
 * and the extra headroom matters once a user supplies an arbitrary brand color.
 * Unlike v1 it infers the direction from the background instead of only
 * special-casing pure white.
 */
const ensureAccessibleForegroundV2 = (
  bgColor: string,
  fgColor: string,
  target = 7,
): string => {
  const darken = bestForeground(bgColor) === "#000000";
  let current = fgColor;

  for (let i = 0; i < 60; i += 1) {
    if (calculateContrast(bgColor, current) >= target) {
      return current;
    }

    const oklch = hexToOklch(current);
    const nextL = darken
      ? Math.max(oklch.l - 0.02, 0)
      : Math.min(oklch.l + 0.02, 1);

    if (nextL === oklch.l) {
      break;
    }

    current = oklchToHex({ ...oklch, l: nextL });
  }

  return current;
};

const generateV1Theme = (
  mode: ThemeMode,
  baseHue: number,
  secondaryHue: number,
): Theme => {
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
  };
};

/**
 * v2 base colors, expressed directly in OKLCH so the intent survives.
 *
 * In v1 these lightness choices were silently discarded by the scale builder
 * (every `DEFAULT` collapsed to HSL L=50), which is why dark mode was barely
 * distinguishable from light mode. Here the dark primary really is lighter.
 */
const V2_BASE = {
  light: {
    bg: { l: 0.985, c: 0.004 },
    fg: { l: 0.21, c: 0.02 },
    // 0.52, not higher: it is the lightest value at which *every* hue still
    // takes white text (worst case 5.13:1). Around 0.58 the choice flips
    // hue by hue, so two palettes from the same tool would disagree on
    // whether primary buttons have black or white labels.
    primary: { l: 0.52, c: 0.17 },
    secondary: { l: 0.54, c: 0.15 },
    statusL: 0.52,
  },
  dark: {
    bg: { l: 0.175, c: 0.016 },
    fg: { l: 0.96, c: 0.01 },
    // Mirror image: light fills with dark labels, consistent for every hue
    // (worst case 7.87:1).
    primary: { l: 0.72, c: 0.15 },
    secondary: { l: 0.74, c: 0.13 },
    statusL: 0.72,
  },
} as const;

/** OKLCH hues, which do not line up with HSL hues (e.g. green is ~150, not 145). */
const V2_STATUS_HUES = {
  info: 254,
  success: 150,
  warning: 80,
  danger: 27,
} as const;

const generateV2Theme = (
  mode: ThemeMode,
  baseHue: number,
  secondaryHue: number,
  baseColor?: string,
): Theme => {
  const palette = V2_BASE[mode];

  const bgColor = oklchToHex({ ...palette.bg, h: baseHue });
  const fgColor = ensureAccessibleForegroundV2(
    bgColor,
    oklchToHex({ ...palette.fg, h: baseHue }),
  );

  const primaryBase =
    baseColor ?? oklchToHex({ ...palette.primary, h: baseHue });
  const secondaryBase = oklchToHex({ ...palette.secondary, h: secondaryHue });

  const statusScale = (hue: number, chroma: number): ColorScale =>
    generateColorScaleV2(oklchToHex({ l: palette.statusL, c: chroma, h: hue }));

  return {
    bg: bgColor,
    fg: fgColor,
    primary: generateColorScaleV2(primaryBase),
    secondary: generateColorScaleV2(secondaryBase),
    status: {
      info: statusScale(V2_STATUS_HUES.info, 0.16),
      success: statusScale(V2_STATUS_HUES.success, 0.15),
      warning: statusScale(V2_STATUS_HUES.warning, 0.16),
      danger: statusScale(V2_STATUS_HUES.danger, 0.19),
    },
  };
};

export const generateTheme = (
  options: ThemeGenerationOptions = {},
): ThemeGenerationResult => {
  const mode: ThemeMode = options.mode ?? "light";
  const algorithm: ThemeAlgorithm = options.algorithm ?? "v1";
  const seeded = options.seed !== undefined;
  const random = seeded
    ? mulberry32(normalizeSeed(options.seed as number | string))
    : Math.random;

  const baseColor =
    algorithm === "v2" && options.baseColor
      ? (normalizeHex(options.baseColor) ?? undefined)
      : undefined;

  // Order and laziness of `random()` consumption are part of the v1 contract:
  // the hue draw only happens when no explicit hue is supplied, so pulling it
  // eagerly would shift every subsequent draw and change existing seeds.
  const baseHue = baseColor
    ? clampHue(hexToOklch(baseColor).h)
    : clampHue(options.baseHue ?? Math.floor(random() * 360));
  const harmony = options.harmony ?? pickHarmony(random);
  const secondaryHue = secondaryHueForHarmony(baseHue, harmony);

  const theme =
    algorithm === "v2"
      ? generateV2Theme(mode, baseHue, secondaryHue, baseColor)
      : generateV1Theme(mode, baseHue, secondaryHue);

  return {
    theme,
    meta: {
      mode,
      baseHue,
      secondaryHue,
      harmony,
      seeded,
      algorithm,
      ...(seeded ? { seed: options.seed } : {}),
      ...(baseColor ? { baseColor } : {}),
    },
  };
};
