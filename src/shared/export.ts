import type {
  ColorScale,
  ExportFormat,
  ExportOptions,
  StatusColorName,
  Theme,
  ThemeApiMeta,
  ThemeFamily,
} from "./types";
import { hexToRgb } from "./utils";
import { exportVoltThemeCss, exportVoltThemeFamilyCss } from "./volt";

export interface ExportContext {
  theme: Theme;
  meta: ThemeApiMeta;
  options?: ExportOptions;
}

export interface ThemeFamilyExportContext {
  family: ThemeFamily;
}

export interface ExportFormatInfo {
  id: ExportFormat;
  label: string;
  /** File extension used when the export is downloaded. */
  extension: string;
  contentType: string;
  description: string;
}

export const EXPORT_FORMATS: ExportFormatInfo[] = [
  {
    id: "tailwind",
    label: "Tailwind v4",
    extension: "css",
    contentType: "text/css; charset=utf-8",
    description: "@theme block to paste into your Tailwind v4 entry stylesheet.",
  },
  {
    id: "css",
    label: "CSS variables",
    extension: "css",
    contentType: "text/css; charset=utf-8",
    description: "Plain custom properties on :root, framework independent.",
  },
  {
    id: "scss",
    label: "SCSS",
    extension: "scss",
    contentType: "text/x-scss; charset=utf-8",
    description: "SCSS variables and a $palette map.",
  },
  {
    id: "json",
    label: "JSON",
    extension: "json",
    contentType: "application/json; charset=utf-8",
    description: "Raw theme payload for programmatic consumption.",
  },
  {
    id: "shadcn",
    label: "shadcn/ui",
    extension: "css",
    contentType: "text/css; charset=utf-8",
    description: "Semantic tokens in the shape shadcn/ui expects.",
  },
  {
    id: "volt",
    label: "Volt UI",
    extension: "css",
    contentType: "text/css; charset=utf-8",
    description: "Semantic tokens matching Volt UI's current theme contract.",
  },
  {
    id: "design-tokens",
    label: "Design Tokens",
    extension: "json",
    contentType: "application/json; charset=utf-8",
    description: "W3C Design Tokens format for Figma and Style Dictionary.",
  },
];

const SHADES = [
  50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950,
] as const;

const STATUS_NAMES: StatusColorName[] = [
  "info",
  "success",
  "warning",
  "danger",
];

interface ResolvedToken {
  name: string;
  scale: ColorScale;
  /** When false, only DEFAULT and foreground are emitted. */
  includeShades: boolean;
}

/**
 * Works out which tokens the export should contain, honouring the playground's
 * single/scale switches and status-color checkboxes.
 */
const resolveTokens = ({
  theme,
  options,
}: ExportContext): ResolvedToken[] => {
  const colorModes = options?.colorModes;
  const enabledStatus = options?.enabledStatusColors;

  const tokens: ResolvedToken[] = [
    {
      name: "primary",
      scale: theme.primary,
      includeShades: (colorModes?.primary ?? "scale") === "scale",
    },
    {
      name: "secondary",
      scale: theme.secondary,
      includeShades: (colorModes?.secondary ?? "scale") === "scale",
    },
  ];

  if (theme.status) {
    for (const name of STATUS_NAMES) {
      // Default to off, matching the playground's initial state.
      if (enabledStatus?.[name]) {
        tokens.push({
          name,
          scale: theme.status[name],
          includeShades: false,
        });
      }
    }
  }

  return tokens;
};

/**
 * Query string is assembled by hand rather than with `URLSearchParams` to keep
 * this module free of environment assumptions — `src/shared/` runs in the
 * browser, during SSR, and inside the Cloudflare Worker that serves the API.
 */
export const permalinkFor = (meta: ThemeApiMeta, origin = ""): string => {
  const params: Array<[string, string]> = [];

  if (meta.seed !== undefined) {
    params.push(["seed", String(meta.seed)]);
  }
  if (meta.baseColor) {
    params.push(["baseColor", meta.baseColor]);
  }

  params.push(["mode", meta.mode], ["harmony", meta.harmony]);

  // A brand color already pins the hue, so echoing both would let them drift.
  if (!meta.baseColor) {
    params.push(["baseHue", String(meta.baseHue)]);
  }

  params.push(["algorithm", meta.algorithm]);

  const query = params
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
    )
    .join("&");

  return `${origin}/?${query}`;
};

const header = (meta: ThemeApiMeta, comment: "css" | "scss"): string => {
  const open = comment === "css" ? "/*" : "//";
  const close = comment === "css" ? " */" : "";
  const lines = [
    "Generated with Palette Crafter",
    `mode: ${meta.mode} · harmony: ${meta.harmony} · algorithm: ${meta.algorithm}`,
    meta.seed !== undefined
      ? `reproduce: ${permalinkFor(meta)}`
      : "no seed — this palette is not reproducible",
  ];

  return comment === "css"
    ? `${open}\n  ${lines.join("\n  ")}\n${close.trim()}`
    : lines.map((line) => `${open} ${line}`).join("\n");
};

/**
 * Tailwind v4 `@theme` block.
 *
 * Emits literal color values rather than `rgb(var(--token))`: the exported
 * snippet has to work on its own once pasted into someone else's project,
 * where this app's runtime custom properties do not exist.
 */
const toTailwind = (context: ExportContext): string => {
  const { theme, meta } = context;
  const blocks = resolveTokens(context).map(
    ({ name, scale, includeShades }) => {
      const lines = [
        `  --color-${name}: ${scale.DEFAULT};`,
        `  --color-${name}-foreground: ${scale.foreground};`,
      ];

      if (includeShades) {
        for (const shade of SHADES) {
          lines.push(`  --color-${name}-${shade}: ${scale[shade]};`);
        }
      }

      return lines.join("\n");
    },
  );

  return `${header(meta, "css")}
@theme {
  --color-background: ${theme.bg};
  --color-foreground: ${theme.fg};

${blocks.join("\n\n")}
}`;
};

/**
 * Plain custom properties.
 *
 * Values are bare RGB triplets to match this repo's convention (see
 * docs/CONVENTIONS.md #3), so they compose with `/ <alpha>` in modern CSS.
 */
const toCss = (context: ExportContext): string => {
  const { theme, meta } = context;
  const lines: string[] = [
    `  --bg: ${hexToRgb(theme.bg)};`,
    `  --fg: ${hexToRgb(theme.fg)};`,
  ];

  for (const { name, scale, includeShades } of resolveTokens(context)) {
    lines.push("");
    lines.push(`  --${name}: ${hexToRgb(scale.DEFAULT)};`);
    lines.push(`  --${name}-foreground: ${hexToRgb(scale.foreground)};`);

    if (includeShades) {
      for (const shade of SHADES) {
        lines.push(`  --${name}-${shade}: ${hexToRgb(scale[shade])};`);
      }
    }
  }

  return `${header(meta, "css")}
/* Values are bare RGB triplets: use as rgb(var(--primary)) or rgb(var(--primary) / 0.5) */
:root {
${lines.join("\n")}
}`;
};

const toScss = (context: ExportContext): string => {
  const { theme, meta } = context;
  const lines: string[] = [
    `$background: ${theme.bg};`,
    `$foreground: ${theme.fg};`,
  ];
  const mapEntries: string[] = [];

  for (const { name, scale, includeShades } of resolveTokens(context)) {
    lines.push("");
    lines.push(`$${name}: ${scale.DEFAULT};`);
    lines.push(`$${name}-foreground: ${scale.foreground};`);
    mapEntries.push(`  "${name}": ${scale.DEFAULT}`);

    if (includeShades) {
      for (const shade of SHADES) {
        lines.push(`$${name}-${shade}: ${scale[shade]};`);
        mapEntries.push(`  "${name}-${shade}": ${scale[shade]}`);
      }
    }
  }

  return `${header(meta, "scss")}
${lines.join("\n")}

$palette: (
${mapEntries.join(",\n")}
);`;
};

const toJson = ({ theme, meta }: ExportContext): string =>
  JSON.stringify({ theme, meta }, null, 2);

/**
 * shadcn/ui semantic tokens. Volt UI has its own first-class adapter/export in
 * `volt.ts`; keep this exporter scoped to the shadcn shape.
 */
const toShadcn = (context: ExportContext): string => {
  const { theme, meta } = context;
  const selector = meta.mode === "dark" ? ".dark" : ":root";
  const fg = hexToRgb(theme.fg);

  const lines = [
    `  --background: ${hexToRgb(theme.bg)};`,
    `  --foreground: ${fg};`,
    `  --card: ${hexToRgb(theme.bg)};`,
    `  --card-foreground: ${fg};`,
    `  --popover: ${hexToRgb(theme.bg)};`,
    `  --popover-foreground: ${fg};`,
    `  --primary: ${hexToRgb(theme.primary.DEFAULT)};`,
    `  --primary-foreground: ${hexToRgb(theme.primary.foreground)};`,
    `  --secondary: ${hexToRgb(theme.secondary.DEFAULT)};`,
    `  --secondary-foreground: ${hexToRgb(theme.secondary.foreground)};`,
    `  --muted: ${fg} / 0.08;`,
    `  --muted-foreground: ${fg} / 0.65;`,
    `  --accent: ${fg} / 0.1;`,
    `  --accent-foreground: ${fg};`,
    `  --border: ${fg} / 0.2;`,
    `  --input: ${fg} / 0.2;`,
    `  --ring: ${hexToRgb(theme.primary.DEFAULT)};`,
  ];

  if (theme.status) {
    lines.push(
      `  --destructive: ${hexToRgb(theme.status.danger.DEFAULT)};`,
      `  --destructive-foreground: ${hexToRgb(theme.status.danger.foreground)};`,
    );
  }

  return `${header(meta, "css")}
${selector} {
${lines.join("\n")}
}`;
};

/**
 * W3C Design Tokens Community Group format — the interchange format Style
 * Dictionary and the Figma token plugins read.
 */
const toDesignTokens = (context: ExportContext): string => {
  const { theme, meta } = context;

  const tokenValue = (value: string) => ({ $value: value, $type: "color" });

  const color: Record<string, unknown> = {
    background: tokenValue(theme.bg),
    foreground: tokenValue(theme.fg),
  };

  for (const { name, scale, includeShades } of resolveTokens(context)) {
    const group: Record<string, unknown> = {
      DEFAULT: tokenValue(scale.DEFAULT),
      foreground: tokenValue(scale.foreground),
    };

    if (includeShades) {
      for (const shade of SHADES) {
        group[String(shade)] = tokenValue(scale[shade]);
      }
    }

    color[name] = group;
  }

  return JSON.stringify(
    {
      $schema: "https://tr.designtokens.org/format/",
      $description: `Palette Crafter — ${meta.mode} · ${meta.harmony} · ${meta.algorithm}`,
      color,
    },
    null,
    2,
  );
};

const EXPORTERS: Record<ExportFormat, (context: ExportContext) => string> = {
  tailwind: toTailwind,
  css: toCss,
  scss: toScss,
  json: toJson,
  shadcn: toShadcn,
  volt: ({ theme, meta }) => exportVoltThemeCss(theme, meta),
  "design-tokens": toDesignTokens,
};

export const isExportFormat = (value: unknown): value is ExportFormat =>
  typeof value === "string" && value in EXPORTERS;

export const exportTheme = (
  format: ExportFormat,
  context: ExportContext,
): string => EXPORTERS[format](context);

export const exportThemeFamily = (
  format: ExportFormat,
  context: ThemeFamilyExportContext,
): string => {
  if (format === "json") {
    return JSON.stringify(context.family, null, 2);
  }

  if (format === "volt") {
    return exportVoltThemeFamilyCss(context.family);
  }

  throw new Error(`ThemeFamily export does not support "${format}".`);
};
