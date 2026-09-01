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

export interface OklchColor {
  l: number;
  c: number;
  h: number;
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

/**
 * Generation algorithm.
 *
 * - `v1` — frozen. HSL scales with a fixed lightness ramp. Every seed in the
 *   wild depends on its exact output (see docs/CONVENTIONS.md #2).
 * - `v2` — OKLCH perceptual scales, input lightness preserved, `baseColor`
 *   support, AAA-targeted body text.
 */
export type ThemeAlgorithm = "v1" | "v2";

/** Which brand tokens to keep untouched when regenerating. */
export type BrandToken = "primary" | "secondary";
export type LockedTokens = Record<BrandToken, boolean>;

export interface ThemeApiRequest {
  mode?: ThemeMode;
  seed?: number | string;
  baseHue?: number;
  harmony?: HarmonyType;
  /** v2 only: exact brand color to build the primary scale from. */
  baseColor?: string;
  algorithm?: ThemeAlgorithm;
}

export interface ThemeApiMeta {
  mode: ThemeMode;
  baseHue: number;
  secondaryHue: number;
  harmony: HarmonyType;
  seeded: boolean;
  algorithm: ThemeAlgorithm;
  /** Echoed back so a generated palette can be reproduced via permalink. */
  seed?: string | number;
  baseColor?: string;
}

export type ThemeFamilyMeta = Omit<ThemeApiMeta, "mode">;

export interface ThemeFamily {
  light: Theme;
  dark: Theme;
  meta: ThemeFamilyMeta;
}

export interface ThemeApiResponse {
  ok: true;
  theme: Theme;
  meta: ThemeApiMeta;
}

export type ThemeFamilyApiRequest = Omit<ThemeApiRequest, "mode">;

export interface ThemeFamilyApiResponse {
  ok: true;
  contractVersion: 1;
  algorithm: ThemeAlgorithm;
  themes: {
    light: Theme;
    dark: Theme;
  };
  meta: ThemeFamilyMeta;
}

/** Machine-readable formats the palette can be exported to. */
export type ExportFormat =
  | "tailwind"
  | "css"
  | "scss"
  | "json"
  | "shadcn"
  | "volt"
  | "design-tokens";

export interface ExportOptions {
  colorModes?: ThemeColorModes;
  enabledStatusColors?: EnabledStatusColors;
}

export type VoltSemanticTokenName =
  | "background"
  | "foreground"
  | "surface"
  | "surface-foreground"
  | "muted"
  | "muted-foreground"
  | "border"
  | "ring"
  | "input"
  | "primary"
  | "primary-foreground"
  | "secondary"
  | "secondary-foreground"
  | "destructive"
  | "destructive-foreground"
  | "success"
  | "success-foreground"
  | "warning"
  | "warning-foreground"
  | "error"
  | "error-foreground"
  | "info"
  | "info-foreground";

export type VoltTheme = Record<VoltSemanticTokenName, string>;

export interface VoltThemeFamily {
  light: VoltTheme;
  dark: VoltTheme;
}

export type WcagLevel = "AAA" | "AA" | "AA Large" | "Fail";

/** The shade to reach for when the checked pair does not clear the threshold. */
export interface ContrastSuggestion {
  shade: string;
  hex: string;
  ratio: number;
}

export interface ContrastCheck {
  label: string;
  foreground: string;
  background: string;
  ratio: number;
  level: WcagLevel;
  /** Whether this pair is expected to carry body-sized text. */
  bodyText: boolean;
  passes: boolean;
  suggestion?: ContrastSuggestion;
}

export interface ContrastReport {
  checks: ContrastCheck[];
  failing: number;
  passing: number;
}
