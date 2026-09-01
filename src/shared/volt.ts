import type {
  Theme,
  ThemeApiMeta,
  ThemeFamily,
  ThemeFamilyMeta,
  ThemeMode,
  VoltSemanticTokenName,
  VoltTheme,
  VoltThemeFamily,
} from "./types";
import { bestForeground, hexToOklch, oklchToHex } from "./utils";

export const VOLT_SEMANTIC_TOKENS: VoltSemanticTokenName[] = [
  "background",
  "foreground",
  "surface",
  "surface-foreground",
  "muted",
  "muted-foreground",
  "border",
  "ring",
  "input",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "destructive",
  "destructive-foreground",
  "success",
  "success-foreground",
  "warning",
  "warning-foreground",
  "error",
  "error-foreground",
  "info",
  "info-foreground",
];

const NEUTRAL_RECIPE = {
  light: {
    surfaceL: -0.015,
    mutedL: -0.055,
    borderL: -0.105,
    inputL: -0.16,
    chroma: 0.006,
  },
  dark: {
    surfaceL: 0.055,
    mutedL: 0.105,
    borderL: 0.14,
    inputL: 0.22,
    chroma: 0.012,
  },
} as const;

const clamp01 = (value: number): number => Math.min(Math.max(value, 0), 1);

const neutralFromBackground = (
  theme: Theme,
  mode: ThemeMode,
  lightnessDelta: number,
): string => {
  const bg = hexToOklch(theme.bg);
  const recipe = NEUTRAL_RECIPE[mode];

  return oklchToHex({
    l: clamp01(bg.l + lightnessDelta),
    c: Math.min(bg.c + recipe.chroma, 0.03),
    h: bg.h,
  });
};

/**
 * Maps Palette Crafter's generic Theme domain to Volt UI's semantic color
 * contract. Brand/status colors come from the generator; neutral UI layers are
 * mode-aware OKLCH derivations from the generated background.
 */
export const adaptThemeToVolt = (
  theme: Theme,
  meta: Pick<ThemeApiMeta, "mode">,
): VoltTheme => {
  const recipe = NEUTRAL_RECIPE[meta.mode];
  const surface = neutralFromBackground(theme, meta.mode, recipe.surfaceL);
  const muted = neutralFromBackground(theme, meta.mode, recipe.mutedL);
  const border = neutralFromBackground(theme, meta.mode, recipe.borderL);
  const input = neutralFromBackground(theme, meta.mode, recipe.inputL);
  const danger = theme.status?.danger ?? theme.primary;

  return {
    background: theme.bg,
    foreground: theme.fg,
    surface,
    "surface-foreground": theme.fg,
    muted,
    "muted-foreground": theme.fg,
    border,
    ring: theme.primary.DEFAULT,
    input,
    primary: theme.primary.DEFAULT,
    "primary-foreground": theme.primary.foreground,
    secondary: theme.secondary.DEFAULT,
    "secondary-foreground": theme.secondary.foreground,
    destructive: danger.DEFAULT,
    "destructive-foreground": danger.foreground,
    success: theme.status?.success.DEFAULT ?? theme.secondary.DEFAULT,
    "success-foreground":
      theme.status?.success.foreground ?? theme.secondary.foreground,
    warning: theme.status?.warning.DEFAULT ?? theme.secondary.DEFAULT,
    "warning-foreground":
      theme.status?.warning.foreground ??
      bestForeground(theme.status?.warning.DEFAULT ?? theme.secondary.DEFAULT),
    error: danger.DEFAULT,
    "error-foreground": danger.foreground,
    info: theme.status?.info.DEFAULT ?? theme.primary.DEFAULT,
    "info-foreground": theme.status?.info.foreground ?? theme.primary.foreground,
  };
};

export const adaptThemeFamilyToVolt = (
  family: ThemeFamily,
): VoltThemeFamily => ({
  light: adaptThemeToVolt(family.light, { mode: "light" }),
  dark: adaptThemeToVolt(family.dark, { mode: "dark" }),
});

const cssBlock = (selector: string, theme: VoltTheme): string => {
  const lines = VOLT_SEMANTIC_TOKENS.map(
    (token) => `  --${token}: ${theme[token]};`,
  );

  return `${selector} {
${lines.join("\n")}
}`;
};

const cssHeader = (
  meta: ThemeFamilyMeta | ThemeApiMeta,
  family: boolean,
): string => {
  const mode = "mode" in meta ? ` · mode: ${meta.mode}` : " · light + dark";
  const seed =
    meta.seed !== undefined
      ? `seed: ${meta.seed}`
      : "no seed - this palette is not reproducible";

  return `/* Generated with Palette Crafter for Volt UI
   harmony: ${meta.harmony} · algorithm: ${meta.algorithm}${mode}
   ${seed}${family ? "\n   selectors: :root for light, .dark for dark" : ""}
*/`;
};

export const exportVoltThemeCss = (theme: Theme, meta: ThemeApiMeta): string =>
  `${cssHeader(meta, false)}
${cssBlock(meta.mode === "dark" ? ".dark" : ":root", adaptThemeToVolt(theme, meta))}`;

export const exportVoltThemeFamilyCss = (family: ThemeFamily): string =>
  `${cssHeader(family.meta, true)}
${cssBlock(":root", adaptThemeToVolt(family.light, { mode: "light" }))}

${cssBlock(".dark", adaptThemeToVolt(family.dark, { mode: "dark" }))}`;
