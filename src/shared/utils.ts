import type { ColorScale, HSLColor, OklabColor, OklchColor } from "./types.js";

export const hexToRgb = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r} ${g} ${b}`;
};

/**
 * Normalizes any accepted hex form (`#abc`, `abc`, `#aabbcc`) to `#aabbcc`.
 * Returns `null` when the input is not a valid hex color.
 */
export const normalizeHex = (value: string): string | null => {
  const raw = value.trim().replace(/^#/, "").toLowerCase();

  if (/^[0-9a-f]{3}$/.test(raw)) {
    return `#${raw[0]}${raw[0]}${raw[1]}${raw[1]}${raw[2]}${raw[2]}`;
  }

  if (/^[0-9a-f]{6}$/.test(raw)) {
    return `#${raw}`;
  }

  return null;
};

export const isValidHex = (value: string): boolean => normalizeHex(value) !== null;

/**
 * Converts HEX to HSL color format
 */
export const hexToHsl = (hex: string): HSLColor => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
};

/**
 * Converts HSL to HEX color format
 */
export const hslToHex = (h: number, s: number, l: number): string => {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

const srgbToLinear = (c: number): number =>
  c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

const linearToSrgb = (c: number): number =>
  c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;

/**
 * Converts HEX to Oklab color format
 */
export const hexToOklab = (hex: string): OklabColor => {
  const r = srgbToLinear(parseInt(hex.slice(1, 3), 16) / 255);
  const g = srgbToLinear(parseInt(hex.slice(3, 5), 16) / 255);
  const b = srgbToLinear(parseInt(hex.slice(5, 7), 16) / 255);

  // Convert to LMS
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  return {
    l: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  };
};

/**
 * Converts Oklab to linear sRGB. Channels may fall outside [0, 1] when the
 * color is outside the sRGB gamut — callers are expected to gamut-map first.
 */
const oklabToLinearRgb = (lab: OklabColor) => {
  const l_ = lab.l + 0.3963377774 * lab.a + 0.2158037573 * lab.b;
  const m_ = lab.l - 0.1055613458 * lab.a - 0.0638541728 * lab.b;
  const s_ = lab.l - 0.0894841775 * lab.a - 1.291485548 * lab.b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  return {
    r: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  };
};

const GAMUT_EPSILON = 1e-4;

const isInSrgbGamut = (lab: OklabColor): boolean => {
  const { r, g, b } = oklabToLinearRgb(lab);
  return [r, g, b].every(
    (c) => c >= -GAMUT_EPSILON && c <= 1 + GAMUT_EPSILON,
  );
};

export const oklabToHex = (lab: OklabColor): string => {
  const { r, g, b } = oklabToLinearRgb(lab);

  const toChannel = (c: number) => {
    const v = Math.round(Math.min(Math.max(linearToSrgb(c), 0), 1) * 255);
    return v.toString(16).padStart(2, "0");
  };

  return `#${toChannel(r)}${toChannel(g)}${toChannel(b)}`;
};

export const oklchToOklab = ({ l, c, h }: OklchColor): OklabColor => {
  const rad = (h * Math.PI) / 180;
  return { l, a: c * Math.cos(rad), b: c * Math.sin(rad) };
};

export const hexToOklch = (hex: string): OklchColor => {
  const lab = hexToOklab(hex);
  const c = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
  const h = c < 1e-6 ? 0 : ((Math.atan2(lab.b, lab.a) * 180) / Math.PI + 360) % 360;
  return { l: lab.l, c, h };
};

/**
 * Converts OKLCH to HEX, reducing chroma until the color fits in the sRGB
 * gamut. Clamping RGB channels directly would shift the hue; lowering chroma
 * keeps hue and lightness intact, which is what the scales depend on.
 */
export const oklchToHex = (color: OklchColor): string => {
  const l = Math.min(Math.max(color.l, 0), 1);
  const h = ((color.h % 360) + 360) % 360;
  const maxChroma = Math.max(color.c, 0);

  if (isInSrgbGamut(oklchToOklab({ l, c: maxChroma, h }))) {
    return oklabToHex(oklchToOklab({ l, c: maxChroma, h }));
  }

  let low = 0;
  let high = maxChroma;

  for (let i = 0; i < 24; i += 1) {
    const mid = (low + high) / 2;
    if (isInSrgbGamut(oklchToOklab({ l, c: mid, h }))) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return oklabToHex(oklchToOklab({ l, c: low, h }));
};

/**
 * Calculates contrast ratio between two colors
 */
export const calculateContrast = (color1: string, color2: string): number => {
  const getLuminance = (hex: string) => {
    const rgb = [
      parseInt(hex.slice(1, 3), 16),
      parseInt(hex.slice(3, 5), 16),
      parseInt(hex.slice(5, 7), 16),
    ].map((c) => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  };

  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
};

/**
 * Picks whichever of white/black contrasts best against `background`.
 *
 * Always returns the better of the two, so it degrades gracefully for
 * mid-lightness colors where neither option reaches 4.5:1 — unlike a
 * "white if it passes, otherwise black" rule, which can return the worse one.
 */
export const bestForeground = (background: string): string =>
  calculateContrast(background, "#ffffff") >=
  calculateContrast(background, "#000000")
    ? "#ffffff"
    : "#000000";

const SHADE_KEYS = [
  50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950,
] as const;

/**
 * v1 scale: HSL with a fixed lightness ramp.
 *
 * FROZEN — the v1 API contract depends on this exact output (CONVENTIONS.md #2).
 * Note it deliberately discards the input color's lightness: every scale is
 * rebuilt from the input hue/saturation and `DEFAULT` is always L=50. That is a
 * known limitation, fixed in `generateColorScaleV2`, not here.
 */
export const generateColorScale = (hex: string): ColorScale => {
  const hsl = hexToHsl(hex);

  // We keep hue and saturation (mostly) constant, varying lightness
  const shades: Record<string, string> = {
    50: hslToHex(hsl.h, hsl.s, 95),
    100: hslToHex(hsl.h, hsl.s, 90),
    200: hslToHex(hsl.h, hsl.s, 80),
    300: hslToHex(hsl.h, hsl.s, 70),
    400: hslToHex(hsl.h, hsl.s, 60),
    500: hslToHex(hsl.h, hsl.s, 50),
    600: hslToHex(hsl.h, hsl.s, 40),
    700: hslToHex(hsl.h, hsl.s, 30),
    800: hslToHex(hsl.h, hsl.s, 20),
    900: hslToHex(hsl.h, hsl.s, 10),
    950: hslToHex(hsl.h, hsl.s, 5),
  };

  const defaultShade = shades[500];
  const fgForDefault =
    calculateContrast(defaultShade, "#ffffff") >= 4.5 ? "#ffffff" : "#000000";

  return {
    50: shades[50],
    100: shades[100],
    200: shades[200],
    300: shades[300],
    400: shades[400],
    500: shades[500],
    600: shades[600],
    700: shades[700],
    800: shades[800],
    900: shades[900],
    950: shades[950],
    DEFAULT: defaultShade,
    foreground: fgForDefault,
  };
};

/**
 * Perceptual lightness ramp in OKLCH, modelled on Tailwind v4's own palette.
 * Equal steps here look like equal steps to the eye, which fixed-lightness HSL
 * does not deliver: in v1, yellow-500 and blue-500 differ by ~3.5x in contrast
 * against white despite sharing a shade number.
 */
const V2_LIGHTNESS: Record<(typeof SHADE_KEYS)[number], number> = {
  50: 0.971,
  100: 0.936,
  200: 0.885,
  300: 0.808,
  400: 0.723,
  500: 0.646,
  600: 0.577,
  700: 0.505,
  800: 0.444,
  900: 0.396,
  950: 0.269,
};

/**
 * Chroma envelope: saturation has to taper at both ends or the light shades
 * look neon and the dark ones turn muddy.
 */
const V2_CHROMA_MULTIPLIER: Record<(typeof SHADE_KEYS)[number], number> = {
  50: 0.19,
  100: 0.34,
  200: 0.56,
  300: 0.78,
  400: 0.93,
  500: 1,
  600: 0.98,
  700: 0.89,
  800: 0.78,
  900: 0.68,
  950: 0.52,
};

/**
 * Finds the shade whose target lightness is closest to `l`.
 */
const nearestShade = (l: number): (typeof SHADE_KEYS)[number] =>
  SHADE_KEYS.reduce((best, key) =>
    Math.abs(V2_LIGHTNESS[key] - l) < Math.abs(V2_LIGHTNESS[best] - l)
      ? key
      : best,
  );

/**
 * v2 scale: perceptually even steps in OKLCH, and the input color is preserved
 * exactly at the shade its own lightness belongs to.
 *
 * That anchoring is what makes "generate a palette from my brand hex" honest —
 * the brand color appears untouched in the output — and it is why a light input
 * yields a light `DEFAULT` instead of v1's hardcoded L=50.
 */
export const generateColorScaleV2 = (hex: string): ColorScale => {
  const base = hexToOklch(hex);
  const anchor = nearestShade(base.l);
  const chromaScale = base.c / V2_CHROMA_MULTIPLIER[anchor];

  const shades = {} as Record<(typeof SHADE_KEYS)[number], string>;

  for (const key of SHADE_KEYS) {
    shades[key] =
      key === anchor
        ? hex
        : oklchToHex({
            l: V2_LIGHTNESS[key],
            c: chromaScale * V2_CHROMA_MULTIPLIER[key],
            h: base.h,
          });
  }

  return {
    ...shades,
    DEFAULT: hex,
    foreground: bestForeground(hex),
  };
};
