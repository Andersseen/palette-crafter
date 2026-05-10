import { DOCUMENT, isPlatformBrowser } from "@angular/common";
import {
  Injectable,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from "@angular/core";
import type {
  Theme,
  HSLColor,
  ColorSwatchType,
  ThemeMode,
  OklabColor,
  ThemeApiMeta,
  ThemeApiRequest,
  ThemeApiResponse,
  ColorScale,
  ColorTokenMode,
  EnabledStatusColors,
  StatusColorName,
  ThemeColorModes,
} from "@shared/types";
import {
  calculateContrast,
  hexToHsl,
  hexToOklab,
  hexToRgb,
  generateColorScale,
} from "@shared/utils";
import ThemeApiClient from "./theme-api-client";

type CachedTheme = Pick<ThemeApiResponse, "theme" | "meta">;
const COLOR_SCALE_SHADES = [
  50,
  100,
  200,
  300,
  400,
  500,
  600,
  700,
  800,
  900,
  950,
] as const;

@Injectable({ providedIn: "root" })
export default class ColorPalette {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);
  private readonly themeApi = inject(ThemeApiClient);
  private readonly storageKey = "palette-crafter:last-theme";

  private currentTheme = signal<Theme>({
    bg: "#ffffff",
    fg: "#1a1a1a",
    primary: generateColorScale("#3b82f6"),
    secondary: generateColorScale("#10b981"),
    status: {
      info: generateColorScale("#2563eb"),
      success: generateColorScale("#16a34a"),
      warning: generateColorScale("#f59e0b"),
      danger: generateColorScale("#dc2626"),
    },
  });

  private themeMode = signal<ThemeMode>("light");
  private currentMeta = signal<ThemeApiMeta | null>(null);
  private loadingState = signal(false);
  private errorState = signal<string | null>(null);
  private colorModes = signal<ThemeColorModes>({
    primary: "scale",
    secondary: "scale",
  });
  private statusColors = signal<EnabledStatusColors>({
    info: false,
    success: false,
    warning: false,
    danger: false,
  });

  // Public computed signals
  theme = computed(() => this.currentTheme());
  mode = computed(() => this.themeMode());
  meta = computed(() => this.currentMeta());
  isLoading = computed(() => this.loadingState());
  error = computed(() => this.errorState());
  selectedColorModes = computed(() => this.colorModes());
  enabledStatusColors = computed(() => this.statusColors());

  constructor() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const hasCachedTheme = this.restoreCachedTheme();

    // Auto-detect system preference
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;

    if (!hasCachedTheme) {
      this.setThemeMode(prefersDark ? "dark" : "light");
    }

    // Listen for system preference changes
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", (e) => {
        this.setThemeMode(e.matches ? "dark" : "light");
        void this.generatePalette({ mode: this.themeMode() });
      });
  }

  /**
   * Requests a theme from the API and keeps the last valid theme as fallback.
   */
  async generatePalette(params: ThemeApiRequest = {}): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }

    this.loadingState.set(true);
    this.errorState.set(null);

    try {
      const response = await this.themeApi.createTheme({
        mode: this.themeMode(),
        ...params,
      });

      this.currentTheme.set(response.theme);
      this.currentMeta.set(response.meta);
      this.setThemeMode(response.meta.mode);
      this.persistTheme(response);
      this.updateCSSVariables();

      return true;
    } catch (error) {
      this.errorState.set(this.toFriendlyError(error));
      return false;
    } finally {
      this.loadingState.set(false);
    }
  }

  /**
   * Toggles between light and dark theme modes
   */
  async toggleThemeMode(): Promise<boolean> {
    const newMode = this.themeMode() === "light" ? "dark" : "light";
    this.setThemeMode(newMode);
    return this.generatePalette({ mode: newMode });
  }

  /**
   * Sets the theme mode and regenerates the palette
   */
  setThemeMode(mode: ThemeMode): void {
    this.themeMode.set(mode);

    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.document.documentElement.classList.toggle("dark", mode === "dark");
  }

  /**
   * Updates CSS custom properties with current theme
   */
  updateCSSVariables(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const theme = this.currentTheme();
    const root = this.document.documentElement;

    root.style.setProperty("--bg", hexToRgb(theme.bg));
    root.style.setProperty("--fg", hexToRgb(theme.fg));

    // Helper to set color and contrast
    const setScaleVars = (name: string, scale: ColorScale) => {
      // Set DEFAULT and its contrast
      root.style.setProperty(`--${name}`, hexToRgb(scale.DEFAULT));
      const defaultContrast = scale.foreground;
      root.style.setProperty(
        `--${name}-foreground`,
        hexToRgb(defaultContrast),
      );
      root.style.setProperty(`--${name}-contrast`, hexToRgb(defaultContrast));

      COLOR_SCALE_SHADES.forEach((key) => {
        const hex = scale[key];
        root.style.setProperty(`--${name}-${key}`, hexToRgb(hex));

        const contrast =
          calculateContrast(hex, "#ffffff") >= 4.5 ? "#ffffff" : "#000000";
        root.style.setProperty(
          `--${name}-${key}-contrast`,
          hexToRgb(contrast),
        );
      });
    };

    setScaleVars("primary", theme.primary);
    setScaleVars("secondary", theme.secondary);

    if (theme.status) {
      (Object.keys(theme.status) as StatusColorName[]).forEach((name) => {
        setScaleVars(name, theme.status![name]);
      });
    }
  }

  /**
   * Updates the active shade (DEFAULT) for a specific color scale
   */
  updateActiveShade(type: "primary" | "secondary", shadeValue: string): void {
    const currentTheme = this.currentTheme();
    const targetScale =
      type === "primary" ? currentTheme.primary : currentTheme.secondary;

    // Create new scale object with updated DEFAULT
    const newScale = { ...targetScale, DEFAULT: shadeValue };

    this.currentTheme.set({
      ...currentTheme,
      [type]: newScale,
    });

    this.updateCSSVariables();
  }

  setColorTokenMode(
    token: "primary" | "secondary",
    mode: ColorTokenMode,
  ): void {
    this.colorModes.update((current) => ({
      ...current,
      [token]: mode,
    }));
  }

  setStatusColorEnabled(name: StatusColorName, enabled: boolean): void {
    this.statusColors.update((current) => ({
      ...current,
      [name]: enabled,
    }));
  }

  /**
   * Gets color swatches for display
   */
  getColorSwatches(): ColorSwatchType[] {
    const theme = this.currentTheme();
    return [
      {
        name: "Background",
        hex: theme.bg,
        hsl: this.formatHSL(hexToHsl(theme.bg)),
        oklab: this.formatOklab(hexToOklab(theme.bg)),
        cssVar: "--bg",
      },
      {
        name: "Foreground",
        hex: theme.fg,
        hsl: this.formatHSL(hexToHsl(theme.fg)),
        oklab: this.formatOklab(hexToOklab(theme.fg)),
        cssVar: "--fg",
      },
      {
        name: "Primary",
        hex: theme.primary.DEFAULT,
        hsl: this.formatHSL(hexToHsl(theme.primary.DEFAULT)),
        oklab: this.formatOklab(hexToOklab(theme.primary.DEFAULT)),
        cssVar: "--primary",
      },
      {
        name: "Secondary",
        hex: theme.secondary.DEFAULT,
        hsl: this.formatHSL(hexToHsl(theme.secondary.DEFAULT)),
        oklab: this.formatOklab(hexToOklab(theme.secondary.DEFAULT)),
        cssVar: "--secondary",
      },
    ];
  }

  getBrandColorSwatches(): ColorSwatchType[] {
    const theme = this.currentTheme();
    return [
      this.toColorSwatch("Primary", theme.primary.DEFAULT, "--primary"),
      this.toColorSwatch("Secondary", theme.secondary.DEFAULT, "--secondary"),
    ];
  }

  getStatusColorSwatches(): ColorSwatchType[] {
    const theme = this.currentTheme();
    const status = theme.status;

    if (!status) {
      return [];
    }

    return (Object.keys(this.statusColors()) as StatusColorName[])
      .filter((name) => this.statusColors()[name])
      .map((name) =>
        this.toColorSwatch(
          this.labelForStatusColor(name),
          status[name].DEFAULT,
          `--${name}`,
        ),
      );
  }

  /**
   * Formats HSL values for display
   */
  private formatHSL(hsl: HSLColor): string {
    return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
  }

  /**
   * Formats Oklab values for display
   */
  private formatOklab(oklab: OklabColor): string {
    return `oklab(${oklab.l.toFixed(3)} ${oklab.a.toFixed(3)} ${oklab.b.toFixed(
      3,
    )})`;
  }

  private toColorSwatch(
    name: string,
    hex: string,
    cssVar: string,
  ): ColorSwatchType {
    return {
      name,
      hex,
      hsl: this.formatHSL(hexToHsl(hex)),
      oklab: this.formatOklab(hexToOklab(hex)),
      cssVar,
    };
  }

  private labelForStatusColor(name: StatusColorName): string {
    switch (name) {
      case "info":
        return "Info";
      case "success":
        return "Success";
      case "warning":
        return "Warning";
      case "danger":
        return "Danger";
    }
  }

  private restoreCachedTheme(): boolean {
    try {
      const raw = window.localStorage.getItem(this.storageKey);

      if (!raw) {
        return false;
      }

      const cached = JSON.parse(raw) as Partial<CachedTheme>;

      if (!cached.theme || !cached.meta) {
        return false;
      }

      this.currentTheme.set(cached.theme);
      this.currentMeta.set(cached.meta);
      this.setThemeMode(cached.meta.mode);
      this.updateCSSVariables();
      return true;
    } catch {
      window.localStorage.removeItem(this.storageKey);
      return false;
    }
  }

  private persistTheme(response: CachedTheme): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    window.localStorage.setItem(
      this.storageKey,
      JSON.stringify({
        theme: response.theme,
        meta: response.meta,
      }),
    );
  }

  private toFriendlyError(error: unknown): string {
    const reason = error instanceof Error ? error.message : "Unknown error.";
    return `Could not load a fresh theme from the API. Keeping the last valid palette. ${reason}`;
  }

  /**
   * Gets Tailwind config extension object
   */
  getTailwindConfig(): string {
    const theme = this.currentTheme();
    const colorModes = this.colorModes();
    const enabledStatusColors = this.statusColors();
    const statusEntries = theme.status
      ? (Object.keys(enabledStatusColors) as StatusColorName[])
          .filter((name) => enabledStatusColors[name])
          .map((name) => {
            return `  --color-${name}: rgb(var(--${name}));
  --color-${name}-foreground: rgb(var(--${name}-foreground));`;
          })
          .join("\n\n")
      : "";
    const scaleEntries = (["primary", "secondary"] as const)
      .map((name) => {
        if (colorModes[name] === "single") {
          return `  --color-${name}: rgb(var(--${name}));
  --color-${name}-foreground: rgb(var(--${name}-foreground));`;
        }

        return `  --color-${name}: rgb(var(--${name}));
  --color-${name}-foreground: rgb(var(--${name}-foreground));
  --color-${name}-50: rgb(var(--${name}-50));
  --color-${name}-100: rgb(var(--${name}-100));
  --color-${name}-200: rgb(var(--${name}-200));
  --color-${name}-300: rgb(var(--${name}-300));
  --color-${name}-400: rgb(var(--${name}-400));
  --color-${name}-500: rgb(var(--${name}-500));
  --color-${name}-600: rgb(var(--${name}-600));
  --color-${name}-700: rgb(var(--${name}-700));
  --color-${name}-800: rgb(var(--${name}-800));
  --color-${name}-900: rgb(var(--${name}-900));
  --color-${name}-950: rgb(var(--${name}-950));`;
      })
      .join("\n\n");

    return `
@theme {
  --color-background: rgb(var(--bg));
  --color-foreground: rgb(var(--fg));

${scaleEntries}${statusEntries ? `\n\n${statusEntries}` : ""}
}
`.trim();
  }
}
