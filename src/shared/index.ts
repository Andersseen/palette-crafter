/**
 * Public entry point of the `@palette-crafter/core` package.
 *
 * Everything here is pure TypeScript with no dependencies and no Angular, DOM
 * or Node APIs, so it runs in a browser, on a worker and at build time. This is
 * the same module the playground and the HTTP API both call, which is what
 * keeps the three in lockstep (docs/CONTEXT.md).
 */

export type {
  BrandToken,
  ColorScale,
  ColorSwatchType,
  ColorTokenMode,
  ContrastCheck,
  ContrastReport,
  ContrastSuggestion,
  EnabledStatusColors,
  ExportFormat,
  ExportOptions,
  HarmonyType,
  HSLColor,
  LockedTokens,
  OklabColor,
  OklchColor,
  StatusColorName,
  StatusColorScales,
  Theme,
  ThemeAlgorithm,
  ThemeApiMeta,
  ThemeApiRequest,
  ThemeApiResponse,
  ThemeColorModes,
  ThemeMode,
  WcagLevel,
} from "./types.js";

export {
  generateTheme,
  type ThemeGenerationOptions,
  type ThemeGenerationResult,
} from "./theme-generator.js";

export {
  bestForeground,
  calculateContrast,
  generateColorScale,
  generateColorScaleV2,
  hexToHsl,
  hexToOklab,
  hexToOklch,
  hexToRgb,
  hslToHex,
  isValidHex,
  normalizeHex,
  oklabToHex,
  oklchToHex,
  oklchToOklab,
} from "./utils.js";

export {
  EXPORT_FORMATS,
  exportTheme,
  isExportFormat,
  permalinkFor,
  type ExportContext,
  type ExportFormatInfo,
} from "./export.js";

export {
  accessibleShadeFor,
  blend,
  buildContrastReport,
  wcagLevel,
} from "./contrast.js";
