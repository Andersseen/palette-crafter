import type { HSLColor, OklabColor } from "./types";

export const hexToRgb = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r} ${g} ${b}`;
};
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

/**
 * Converts HEX to Oklab color format
 */
export const hexToOklab = (hex: string): OklabColor => {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;

  // Convert to linear RGB
  const linear = (c: number) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  r = linear(r);
  g = linear(g);
  b = linear(b);

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

export const generateColorScale = (
  hex: string
): import("./types").ColorScale => {
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

  // Determine best contrasting foreground for the DEFAULT color (which we set to 500)
  // But actually, we should probably set DEFAULT to the input color if possible,
  // or maybe just stick to a consistent scale where 500 is "standard".
  // Let's make 500 the base, or closest to input.
  // For this "best practice" request, mapping input to 500 is standard for palette generators.

  // Let's refine: The input hex is the "base" color.
  // We should try to place the base color at 500 if it's vibrant, or elsewhere if dark/light.
  // But for "palette generation" from scratch (random), we generate a color for 500.
  // If we assume this function is used by the generator which creates a base color, we can assume hex is the 'primary' middle.

  // Recalculating 500 to Ensure it matches input exactly?
  // Or just trusting the lightness variation?
  // Let's stick to standard lightness curves for consistency.
  // But we want the "primary" color of the theme to be the one we generated.

  // Overwrite 500 with input? No, if input lightness is 90, it shouldn't be 500.
  // Since we are GENERATING the palette in the service, we will pass a generated base color (standard lightness).
  // So we can assume the input hex has reasonable lightness for a 'primary' color (approx 50%).

  // Let's assume input is roughly intended for the 500 slot or DEFAULT.

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
