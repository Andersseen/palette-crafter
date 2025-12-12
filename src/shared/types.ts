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
