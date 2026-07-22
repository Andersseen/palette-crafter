import { DOCUMENT, isPlatformBrowser } from "@angular/common";
import {
  Injectable,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from "@angular/core";
import type {
  BrandToken,
  ColorScale,
  ColorSwatchType,
  ColorTokenMode,
  EnabledStatusColors,
  ExportFormat,
  HarmonyType,
  HSLColor,
  LockedTokens,
  OklabColor,
  StatusColorName,
  Theme,
  ThemeApiMeta,
  ThemeApiRequest,
  ThemeApiResponse,
  ThemeColorModes,
  ThemeMode,
} from "@shared/types";
import {
  bestForeground,
  calculateContrast,
  hexToHsl,
  hexToOklab,
  hexToRgb,
  normalizeHex,
} from "@shared/utils";
import { generateTheme } from "@shared/theme-generator";
import { buildContrastReport } from "@shared/contrast";
import { exportTheme, permalinkFor } from "@shared/export";
import ThemeApiClient from "./theme-api-client";

type CachedTheme = Pick<ThemeApiResponse, "theme" | "meta">;

const COLOR_SCALE_SHADES = [
  50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950,
] as const;

/** Seed behind the palette a first-time visitor lands on. */
const HOME_SEED = "palette-crafter-home";

const STORAGE_KEY = "palette-forge:last-theme";

@Injectable({ providedIn: "root" })
export default class ColorPalette {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);
  private readonly themeApi = inject(ThemeApiClient);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private currentTheme = signal<Theme>(
    generateTheme({ seed: HOME_SEED, mode: "light", algorithm: "v2" }).theme,
  );
  private currentMeta = signal<ThemeApiMeta | null>(null);
  private themeMode = signal<ThemeMode>("light");
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
  private lockedTokens = signal<LockedTokens>({
    primary: false,
    secondary: false,
  });
  private brandColor = signal<string | null>(null);
  private exportFormatState = signal<ExportFormat>("tailwind");

  // Public computed signals
  theme = computed(() => this.currentTheme());
  mode = computed(() => this.themeMode());
  meta = computed(() => this.currentMeta());
  isLoading = computed(() => this.loadingState());
  error = computed(() => this.errorState());
  selectedColorModes = computed(() => this.colorModes());
  enabledStatusColors = computed(() => this.statusColors());
  locked = computed(() => this.lockedTokens());
  activeBrandColor = computed(() => this.brandColor());
  exportFormat = computed(() => this.exportFormatState());

  /** Live WCAG audit of the pairs the theme actually renders. */
  contrastReport = computed(() =>
    buildContrastReport(this.currentTheme(), this.statusColors()),
  );

  permalink = computed(() => {
    const meta = this.currentMeta();
    if (!meta) {
      return null;
    }

    const origin = this.isBrowser ? window.location.origin : "";
    return permalinkFor(meta, origin);
  });

  exportedTheme = computed(() => {
    const meta = this.currentMeta();
    if (!meta) {
      return "";
    }

    return exportTheme(this.exportFormatState(), {
      theme: this.currentTheme(),
      meta,
      options: {
        colorModes: this.colorModes(),
        enabledStatusColors: this.statusColors(),
      },
    });
  });

  constructor() {
    // Seeding synchronously — on the server as well as the browser — is what
    // removes the flash of default colors: the first paint already carries the
    // real palette instead of waiting for a round-trip after hydration.
    this.applyResult(
      generateTheme({
        ...this.initialRequest(),
        algorithm: "v2",
      }),
    );

    // Also on the server: platform-server serializes the inline style it writes
    // on <html>, so the prerendered document ships the palette already applied.
    this.updateCSSVariables();

    if (this.isBrowser) {
      this.watchSystemPreference();
    }
  }

  /**
   * Decides which palette to open with: an explicit permalink wins, then the
   * palette cached from the last visit, then the default home seed.
   */
  private initialRequest(): ThemeApiRequest {
    if (!this.isBrowser) {
      return { seed: HOME_SEED, mode: "light" };
    }

    const fromUrl = this.readPermalink();
    if (fromUrl) {
      return fromUrl;
    }

    const cached = this.readCachedTheme();
    if (cached) {
      return {
        seed: cached.meta.seed,
        baseColor: cached.meta.baseColor,
        baseHue: cached.meta.baseColor ? undefined : cached.meta.baseHue,
        harmony: cached.meta.harmony,
        mode: cached.meta.mode,
      };
    }

    return {
      seed: HOME_SEED,
      mode: window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light",
    };
  }

  private readPermalink(): ThemeApiRequest | null {
    const params = new URLSearchParams(window.location.search);

    if (![...params.keys()].some((key) => key !== "")) {
      return null;
    }

    const mode = params.get("mode");
    const harmony = params.get("harmony");
    const baseHue = params.get("baseHue");
    const baseColor = params.get("baseColor");
    const seed = params.get("seed");

    const request: ThemeApiRequest = {};

    if (mode === "light" || mode === "dark") {
      request.mode = mode;
    }
    if (harmony) {
      request.harmony = harmony as HarmonyType;
    }
    if (baseColor && normalizeHex(baseColor)) {
      request.baseColor = normalizeHex(baseColor)!;
    }
    if (baseHue !== null && Number.isFinite(Number(baseHue))) {
      request.baseHue = Number(baseHue);
    }
    if (seed !== null) {
      request.seed = seed;
    }

    return Object.keys(request).length > 0 ? request : null;
  }

  /**
   * Generates a palette.
   *
   * Runs in-process against the shared generator, which is what keeps the
   * playground and the API in lockstep (docs/CONTEXT.md). It only goes over
   * HTTP when the build points at a remote API via `THEME_API_BASE_URL`.
   */
  async generatePalette(params: ThemeApiRequest = {}): Promise<boolean> {
    this.loadingState.set(true);
    this.errorState.set(null);

    const request: ThemeApiRequest = {
      mode: this.themeMode(),
      ...(this.brandColor() ? { baseColor: this.brandColor()! } : {}),
      ...params,
    };

    try {
      const result = this.themeApi.isRemoteConfigured
        ? await this.themeApi.getTheme({ ...request, algorithm: "v2" })
        : generateTheme({ ...request, algorithm: "v2" });

      this.applyResult(result, { preserveLocked: true });
      this.persistTheme({ theme: this.currentTheme(), meta: this.meta()! });
      this.updateCSSVariables();
      this.syncPermalinkToUrl();

      return true;
    } catch (error) {
      this.errorState.set(this.toFriendlyError(error));
      return false;
    } finally {
      this.loadingState.set(false);
    }
  }

  /**
   * Applies a generated result, optionally keeping locked brand scales.
   *
   * Locking is what makes the tool iterative rather than all-or-nothing: keep
   * the primary you like and reroll everything around it.
   */
  private applyResult(
    result: CachedTheme,
    { preserveLocked = false }: { preserveLocked?: boolean } = {},
  ): void {
    const previous = this.currentTheme();
    const locks = this.lockedTokens();

    const theme: Theme = { ...result.theme };

    if (preserveLocked) {
      for (const token of ["primary", "secondary"] as BrandToken[]) {
        if (locks[token]) {
          theme[token] = previous[token];
        }
      }
    }

    this.currentTheme.set(theme);
    this.currentMeta.set(result.meta);
    this.themeMode.set(result.meta.mode);
    this.brandColor.set(result.meta.baseColor ?? null);
    this.applyModeClass(result.meta.mode);
  }

  /**
   * Regenerates using the current settings, keeping locked tokens.
   * Without a seed the result is random, so a fresh one is minted and recorded
   * in the URL — otherwise a palette you like is unrecoverable on reload.
   */
  async reroll(): Promise<boolean> {
    return this.generatePalette({ seed: this.mintSeed() });
  }

  private mintSeed(): string {
    const random = this.isBrowser
      ? Array.from(crypto.getRandomValues(new Uint8Array(6)))
          .map((byte) => byte.toString(36).padStart(2, "0"))
          .join("")
      : Math.random().toString(36).slice(2, 10);

    return random.slice(0, 10);
  }

  async toggleThemeMode(): Promise<boolean> {
    const newMode = this.themeMode() === "light" ? "dark" : "light";
    const meta = this.currentMeta();

    // Keep the same palette identity and only swap the mode.
    return this.generatePalette({
      mode: newMode,
      seed: meta?.seed,
      harmony: meta?.harmony,
      ...(meta?.baseColor
        ? { baseColor: meta.baseColor }
        : { baseHue: meta?.baseHue }),
    });
  }

  setThemeMode(mode: ThemeMode): void {
    this.themeMode.set(mode);
    this.applyModeClass(mode);
  }

  private applyModeClass(mode: ThemeMode): void {
    this.document.documentElement.classList.toggle("dark", mode === "dark");
  }

  /**
   * Adopts a brand color: the primary scale is rebuilt so this exact hex
   * appears in the palette. Passing `null` returns to generated hues.
   */
  async setBrandColor(hex: string | null): Promise<boolean> {
    if (hex === null) {
      this.brandColor.set(null);
      return this.generatePalette({ seed: this.mintSeed() });
    }

    const normalized = normalizeHex(hex);
    if (!normalized) {
      this.errorState.set(`"${hex}" is not a valid hex color.`);
      return false;
    }

    this.brandColor.set(normalized);
    return this.generatePalette({ baseColor: normalized });
  }

  setLocked(token: BrandToken, isLocked: boolean): void {
    this.lockedTokens.update((current) => ({ ...current, [token]: isLocked }));
  }

  toggleLocked(token: BrandToken): void {
    this.setLocked(token, !this.lockedTokens()[token]);
  }

  setExportFormat(format: ExportFormat): void {
    this.exportFormatState.set(format);
  }

  /**
   * Writes the theme to CSS custom properties.
   *
   * Token variables carry a bare RGB triplet and are consumed as
   * `rgb(var(--token))`; the shadcn-style semantic variables carry a full
   * color value and are read by `@voltui/components`. See CONVENTIONS.md #3.
   */
  updateCSSVariables(): void {
    const theme = this.currentTheme();
    const root = this.document.documentElement;

    root.style.setProperty("--bg", hexToRgb(theme.bg));
    root.style.setProperty("--fg", hexToRgb(theme.fg));
    root.style.setProperty("--background", `rgb(${hexToRgb(theme.bg)})`);
    root.style.setProperty("--foreground", `rgb(${hexToRgb(theme.fg)})`);
    root.style.setProperty("--surface", `rgb(${hexToRgb(theme.bg)})`);
    root.style.setProperty("--surface-foreground", `rgb(${hexToRgb(theme.fg)})`);
    root.style.setProperty("--popover", `rgb(${hexToRgb(theme.bg)})`);
    root.style.setProperty("--popover-foreground", `rgb(${hexToRgb(theme.fg)})`);
    root.style.setProperty("--muted", `rgb(${hexToRgb(theme.fg)} / 0.08)`);
    root.style.setProperty(
      "--muted-foreground",
      `rgb(${hexToRgb(theme.fg)} / 0.65)`,
    );
    root.style.setProperty("--accent", `rgb(${hexToRgb(theme.fg)} / 0.1)`);
    root.style.setProperty("--accent-foreground", `rgb(${hexToRgb(theme.fg)})`);
    root.style.setProperty("--border", `rgb(${hexToRgb(theme.fg)} / 0.2)`);
    root.style.setProperty("--input", `rgb(${hexToRgb(theme.fg)} / 0.2)`);

    const setScaleVars = (name: string, scale: ColorScale) => {
      root.style.setProperty(`--${name}`, hexToRgb(scale.DEFAULT));
      if (name === "primary") {
        root.style.setProperty("--ring", `rgb(${hexToRgb(scale.DEFAULT)})`);
      }

      root.style.setProperty(`--${name}-foreground`, hexToRgb(scale.foreground));
      root.style.setProperty(`--${name}-contrast`, hexToRgb(scale.foreground));

      COLOR_SCALE_SHADES.forEach((key) => {
        const hex = scale[key];
        root.style.setProperty(`--${name}-${key}`, hexToRgb(hex));
        root.style.setProperty(
          `--${name}-${key}-contrast`,
          hexToRgb(bestForeground(hex)),
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
   * Promotes a shade to be the scale's DEFAULT.
   *
   * The foreground is recomputed for the new DEFAULT. Leaving it untouched used
   * to leave, say, white text pinned over shade 50 at 1.15:1.
   */
  updateActiveShade(type: BrandToken, shadeValue: string): void {
    const currentTheme = this.currentTheme();
    const targetScale = currentTheme[type];

    const newScale: ColorScale = {
      ...targetScale,
      DEFAULT: shadeValue,
      foreground: bestForeground(shadeValue),
    };

    this.currentTheme.set({ ...currentTheme, [type]: newScale });
    this.updateCSSVariables();
  }

  setColorTokenMode(token: BrandToken, mode: ColorTokenMode): void {
    this.colorModes.update((current) => ({ ...current, [token]: mode }));
  }

  setStatusColorEnabled(name: StatusColorName, enabled: boolean): void {
    this.statusColors.update((current) => ({ ...current, [name]: enabled }));
  }

  getColorSwatches(): ColorSwatchType[] {
    const theme = this.currentTheme();
    return [
      this.toColorSwatch("Background", theme.bg, "--bg"),
      this.toColorSwatch("Foreground", theme.fg, "--fg"),
      this.toColorSwatch("Primary", theme.primary.DEFAULT, "--primary"),
      this.toColorSwatch("Secondary", theme.secondary.DEFAULT, "--secondary"),
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
    const status = this.currentTheme().status;

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

  /** Contrast of a shade against the current background, for the scale UI. */
  contrastAgainstBackground(hex: string): number {
    return (
      Math.round(calculateContrast(hex, this.currentTheme().bg) * 100) / 100
    );
  }

  private formatHSL(hsl: HSLColor): string {
    return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
  }

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

  /**
   * Reflects the current palette in the address bar so it can be shared and
   * survives a reload — the point of deterministic seeds.
   */
  private syncPermalinkToUrl(): void {
    const link = this.permalink();

    if (!this.isBrowser || !link) {
      return;
    }

    window.history.replaceState({}, "", link);
  }

  private readCachedTheme(): CachedTheme | null {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);

      if (!raw) {
        return null;
      }

      const cached = JSON.parse(raw) as Partial<CachedTheme>;

      if (!cached.theme || !cached.meta) {
        return null;
      }

      return cached as CachedTheme;
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }

  private persistTheme(response: CachedTheme): void {
    if (!this.isBrowser) {
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(response));
    } catch {
      // Private browsing or a full quota — not worth surfacing to the user.
    }
  }

  /**
   * Follows the OS light/dark preference only while the user has not expressed
   * one of their own. Regenerating unconditionally used to throw away the
   * palette they were working on.
   */
  private watchSystemPreference(): void {
    const query = window.matchMedia("(prefers-color-scheme: dark)");

    query.addEventListener("change", (event) => {
      if (this.readCachedTheme() || this.readPermalink()) {
        return;
      }

      void this.generatePalette({ mode: event.matches ? "dark" : "light" });
    });
  }

  private toFriendlyError(error: unknown): string {
    const reason = error instanceof Error ? error.message : "Unknown error.";
    return `Could not load a fresh theme. Keeping the last valid palette. ${reason}`;
  }
}
