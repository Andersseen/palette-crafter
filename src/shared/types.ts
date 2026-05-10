export interface ColorScale {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  950: string;
  DEFAULT: string;
  foreground: string;
}

export interface Theme {
  bg: string;
  fg: string;
  primary: ColorScale;
  secondary: ColorScale;
  status?: StatusColorScales;
}

export interface HSLColor {
  h: number;
  s: number;
  l: number;
}

export interface OklabColor {
  l: number;
  a: number;
  b: number;
}

export interface ColorSwatchType {
  name: string;
  hex: string;
  hsl: string;
  oklab: string;
  cssVar: string;
}

export type ThemeMode = "light" | "dark";
export type ColorTokenMode = "single" | "scale";
export type StatusColorName = "info" | "success" | "warning" | "danger";

export type StatusColorScales = Record<StatusColorName, ColorScale>;

export type ThemeColorModes = Record<"primary" | "secondary", ColorTokenMode>;
export type EnabledStatusColors = Record<StatusColorName, boolean>;

export type HarmonyType =
  | "analogous"
  | "complementary"
  | "split-complementary"
  | "triadic";

export interface ThemeApiRequest {
  mode?: ThemeMode;
  seed?: number | string;
  baseHue?: number;
  harmony?: HarmonyType;
}

export interface ThemeApiMeta {
  mode: ThemeMode;
  baseHue: number;
  secondaryHue: number;
  harmony: HarmonyType;
  seeded: boolean;
}

export interface ThemeApiResponse {
  ok: true;
  theme: Theme;
  meta: ThemeApiMeta;
}
