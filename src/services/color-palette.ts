import { Injectable, signal, computed } from "@angular/core";
import type {
  Theme,
  HSLColor,
  ColorSwatchType,
  ThemeMode,
  OklabColor,
} from "@shared/types";
import {
  calculateContrast,
  hexToHsl,
  hexToOklab,
  hexToRgb,
  hslToHex,
  generateColorScale,
} from "@shared/utils";

@Injectable()
export default class ColorPalette {
  private currentTheme = signal<Theme>({
    bg: "#ffffff",
    fg: "#1a1a1a",
    primary: generateColorScale("#3b82f6"),
    secondary: generateColorScale("#10b981"),
  });

  private themeMode = signal<ThemeMode>("light");

  // Public computed signals
  theme = computed(() => this.currentTheme());
  mode = computed(() => this.themeMode());

  constructor() {
    // Auto-detect system preference
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    this.setThemeMode(prefersDark ? "dark" : "light");

    // Listen for system preference changes
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", (e) => {
        this.setThemeMode(e.matches ? "dark" : "light");
      });
  }

  /**
   * Generates a harmonious color palette using HSL color theory
   */
  generatePalette(): void {
    const baseHue = Math.floor(Math.random() * 360);
    const harmonyType = Math.random();

    let secondaryHue: number;

    if (harmonyType < 0.25) {
      // Analogous
      secondaryHue = (baseHue + 30) % 360;
    } else if (harmonyType < 0.5) {
      // Complementary
      secondaryHue = (baseHue + 180) % 360;
    } else if (harmonyType < 0.75) {
      // Split Complementary
      secondaryHue = (baseHue + 150) % 360;
    } else {
      // Triadic
      secondaryHue = (baseHue + 120) % 360;
    }

    let bgColor: string;
    let fgColor: string;
    let primaryBase: string;
    let secondaryBase: string;

    if (this.themeMode() === "light") {
      bgColor = hslToHex(baseHue, 10, 98);
      fgColor = hslToHex(baseHue, 20, 10);
      primaryBase = hslToHex(baseHue, 70, 50);
      secondaryBase = hslToHex(secondaryHue, 65, 45);

      while (calculateContrast(bgColor, fgColor) < 4.5) {
        const fgHsl = hexToHsl(fgColor);
        fgColor = hslToHex(fgHsl.h, fgHsl.s, Math.max(fgHsl.l - 5, 0));
      }
    } else {
      bgColor = hslToHex(baseHue, 20, 8);
      fgColor = hslToHex(baseHue, 15, 95);
      primaryBase = hslToHex(baseHue, 60, 60);
      secondaryBase = hslToHex(secondaryHue, 55, 60);

      while (calculateContrast(bgColor, fgColor) < 4.5) {
        const fgHsl = hexToHsl(fgColor);
        fgColor = hslToHex(fgHsl.h, fgHsl.s, Math.min(fgHsl.l + 5, 100));
      }
    }

    this.currentTheme.set({
      bg: bgColor,
      fg: fgColor,
      primary: generateColorScale(primaryBase),
      secondary: generateColorScale(secondaryBase),
    });
  }

  /**
   * Toggles between light and dark theme modes
   */
  toggleThemeMode(): void {
    const newMode = this.themeMode() === "light" ? "dark" : "light";
    this.setThemeMode(newMode);
  }

  /**
   * Sets the theme mode and regenerates the palette
   */
  setThemeMode(mode: ThemeMode): void {
    this.themeMode.set(mode);
    document.documentElement.classList.toggle("dark", mode === "dark");
  }

  /**
   * Updates CSS custom properties with current theme
   */
  updateCSSVariables(): void {
    const theme = this.currentTheme();
    const root = document.documentElement;

    root.style.setProperty("--bg", hexToRgb(theme.bg));
    root.style.setProperty("--fg", hexToRgb(theme.fg));

    // Update Primary Scale
    Object.entries(theme.primary).forEach(([key, value]) => {
      if (key === "DEFAULT") {
        root.style.setProperty("--primary", hexToRgb(value));
      } else if (key === "foreground") {
        root.style.setProperty("--primary-foreground", hexToRgb(value));
      } else {
        root.style.setProperty(`--primary-${key}`, hexToRgb(value));
      }
    });

    // Update Secondary Scale
    Object.entries(theme.secondary).forEach(([key, value]) => {
      if (key === "DEFAULT") {
        root.style.setProperty("--secondary", hexToRgb(value));
      } else if (key === "foreground") {
        root.style.setProperty("--secondary-foreground", hexToRgb(value));
      } else {
        root.style.setProperty(`--secondary-${key}`, hexToRgb(value));
      }
    });
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
      3
    )})`;
  }

  /**
   * Gets Tailwind config extension object
   */
  getTailwindConfig(): string {
    return `
 @theme {
  --color-background: rgb(var(--bg));
  --color-foreground: rgb(var(--fg));
  
  --color-primary: rgb(var(--primary));
  --color-primary-foreground: rgb(var(--primary-foreground));
  --color-primary-50: rgb(var(--primary-50));
  --color-primary-100: rgb(var(--primary-100));
  --color-primary-200: rgb(var(--primary-200));
  --color-primary-300: rgb(var(--primary-300));
  --color-primary-400: rgb(var(--primary-400));
  --color-primary-500: rgb(var(--primary-500));
  --color-primary-600: rgb(var(--primary-600));
  --color-primary-700: rgb(var(--primary-700));
  --color-primary-800: rgb(var(--primary-800));
  --color-primary-900: rgb(var(--primary-900));
  --color-primary-950: rgb(var(--primary-950));

  --color-secondary: rgb(var(--secondary));
  --color-secondary-foreground: rgb(var(--secondary-foreground));
  --color-secondary-50: rgb(var(--secondary-50));
  --color-secondary-100: rgb(var(--secondary-100));
  --color-secondary-200: rgb(var(--secondary-200));
  --color-secondary-300: rgb(var(--secondary-300));
  --color-secondary-400: rgb(var(--secondary-400));
  --color-secondary-500: rgb(var(--secondary-500));
  --color-secondary-600: rgb(var(--secondary-600));
  --color-secondary-700: rgb(var(--secondary-700));
  --color-secondary-800: rgb(var(--secondary-800));
  --color-secondary-900: rgb(var(--secondary-900));
  --color-secondary-950: rgb(var(--secondary-950));
}
  }`;
  }
}
