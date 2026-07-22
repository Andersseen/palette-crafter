import type {
  ColorScale,
  ContrastCheck,
  ContrastReport,
  ContrastSuggestion,
  StatusColorName,
  Theme,
  WcagLevel,
} from "./types";
import { calculateContrast } from "./utils";

const SHADES = [
  50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950,
] as const;

/** WCAG 2.1 thresholds. */
const AAA_BODY = 7;
const AA_BODY = 4.5;
/** Also the minimum for non-text UI elements (1.4.11). */
const AA_LARGE = 3;

const parseHex = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

/**
 * Composites `foreground` over `background` at `alpha`.
 *
 * The theme ships several semi-transparent tokens (`--muted-foreground` at
 * 0.65, `--border` at 0.2). Measuring them at full opacity would report a
 * contrast the user never actually sees.
 */
export const blend = (
  foreground: string,
  background: string,
  alpha: number,
): string => {
  const fg = parseHex(foreground);
  const bg = parseHex(background);

  const channel = (i: number) =>
    Math.round(fg[i] * alpha + bg[i] * (1 - alpha))
      .toString(16)
      .padStart(2, "0");

  return `#${channel(0)}${channel(1)}${channel(2)}`;
};

export const wcagLevel = (ratio: number, bodyText: boolean): WcagLevel => {
  if (!bodyText) {
    return ratio >= AA_LARGE ? "AA" : "Fail";
  }
  if (ratio >= AAA_BODY) {
    return "AAA";
  }
  if (ratio >= AA_BODY) {
    return "AA";
  }
  if (ratio >= AA_LARGE) {
    return "AA Large";
  }
  return "Fail";
};

const round = (value: number) => Math.round(value * 100) / 100;

/**
 * Finds the shade in `scale` closest to `DEFAULT` that clears `target` against
 * `background`.
 *
 * A brand color picked for use as a button fill usually will not double as body
 * text on the page background — that is normal, not a defect in the palette.
 * The useful answer is not "fail" but "use this shade instead", which is what
 * the 50–950 ramp exists for.
 */
export const accessibleShadeFor = (
  scale: ColorScale,
  background: string,
  target = AA_BODY,
): ContrastSuggestion | undefined => {
  const candidates = SHADES.map((shade) => ({
    shade: String(shade),
    hex: scale[shade],
    ratio: calculateContrast(scale[shade], background),
  })).filter((candidate) => candidate.ratio >= target);

  if (candidates.length === 0) {
    return undefined;
  }

  // The passing shade closest to the threshold stays nearest the brand color.
  const best = candidates.reduce((a, b) => (a.ratio <= b.ratio ? a : b));
  return { ...best, ratio: round(best.ratio) };
};

const check = (
  label: string,
  foreground: string,
  background: string,
  bodyText: boolean,
  scale?: ColorScale,
): ContrastCheck => {
  const ratio = calculateContrast(foreground, background);
  const level = wcagLevel(ratio, bodyText);
  const passes = bodyText ? ratio >= AA_BODY : ratio >= AA_LARGE;

  const suggestion =
    !passes && scale
      ? accessibleShadeFor(scale, background, bodyText ? AA_BODY : AA_LARGE)
      : undefined;

  return {
    label,
    foreground,
    background,
    ratio: round(ratio),
    level,
    bodyText,
    passes,
    ...(suggestion ? { suggestion } : {}),
  };
};

const STATUS_LABELS: Record<StatusColorName, string> = {
  info: "Info",
  success: "Success",
  warning: "Warning",
  danger: "Danger",
};

/**
 * Audits the pairs the theme actually renders, so the accessibility claim on
 * the tin is something the user can verify rather than take on trust.
 */
export const buildContrastReport = (
  theme: Theme,
  enabledStatus?: Partial<Record<StatusColorName, boolean>>,
): ContrastReport => {
  const checks: ContrastCheck[] = [
    check("Body text", theme.fg, theme.bg, true),
    check("Muted text", blend(theme.fg, theme.bg, 0.65), theme.bg, true),
    check(
      "Primary button",
      theme.primary.foreground,
      theme.primary.DEFAULT,
      true,
    ),
    check(
      "Secondary button",
      theme.secondary.foreground,
      theme.secondary.DEFAULT,
      true,
    ),
    check(
      "Primary as link text",
      theme.primary.DEFAULT,
      theme.bg,
      true,
      theme.primary,
    ),
    check("Border", blend(theme.fg, theme.bg, 0.2), theme.bg, false),
  ];

  if (theme.status) {
    for (const name of Object.keys(STATUS_LABELS) as StatusColorName[]) {
      if (enabledStatus && !enabledStatus[name]) {
        continue;
      }

      const scale = theme.status[name];
      checks.push(
        check(
          `${STATUS_LABELS[name]} button`,
          scale.foreground,
          scale.DEFAULT,
          true,
        ),
      );
    }
  }

  return {
    checks,
    passing: checks.filter((entry) => entry.passes).length,
    failing: checks.filter((entry) => !entry.passes).length,
  };
};
