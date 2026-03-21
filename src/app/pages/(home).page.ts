import {
  Component,
  computed,
  DOCUMENT,
  ElementRef,
  inject,
  viewChild,
} from "@angular/core";
import ColorPalette from "@services/color-palette";

import ColorSwatch from "@components/color-swatch";
import ColorScaleComponent from "@components/color-scale";
import ExportPanel from "@components/export-panel";
import Footer from "@components/footer";
import Header from "@components/header";
import HeroSection from "@components/hero-section";
import ThemePreview from "@components/theme-preview";
import { hexToRgb } from "@shared/utils";

@Component({
  selector: "app-home",
  imports: [
    ThemePreview,
    ColorSwatch,
    ColorScaleComponent,
    ExportPanel,
    Header,
    HeroSection,
    Footer,
  ],
  template: `
    <section
      class="relative isolate min-h-screen overflow-x-hidden bg-background text-foreground"
    >
      <div #overlay id="theme-overlay" aria-hidden="true"></div>

      <div class="blend-contrast flex min-h-screen flex-col">
        <app-header
          [isDarkMode]="isDarkMode()"
          (toggleThemeMode)="toggleThemeMode($event)"
        />

        <main
          class="flex-1 max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8"
        >
          <app-hero-section
            [isDarkMode]="isDarkMode()"
            (generatePalette)="generatePalette($event)"
          />

          <!-- Base Colors (Bg/Fg) -->
          <section class="mb-8 sm:mb-12">
            <h2 class="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6">
              Base Colors
            </h2>
            <div
              class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-2xl"
            >
              @for (swatch of baseSwatches(); track swatch.cssVar) {
                <app-color-swatch [swatch]="swatch" />
              }
            </div>
          </section>

          <!-- Color Scales -->
          <section class="mb-8 sm:mb-12 space-y-8">
            <h2 class="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6">
              Color Scales
            </h2>

            <app-color-scale
              name="Primary"
              type="primary"
              [scale]="primaryScale()"
              (updateActive)="updateActiveColor('primary', $event)"
            />

            <app-color-scale
              name="Secondary"
              type="secondary"
              [scale]="secondaryScale()"
              (updateActive)="updateActiveColor('secondary', $event)"
            />
          </section>

          <section class="mb-8 sm:mb-12">
            <app-theme-preview />
          </section>

          <section>
            <app-export-panel />
          </section>
        </main>

        <app-footer />
      </div>
    </section>
  `,
})
export default class Home {
  private readonly colorService = inject(ColorPalette);
  private readonly document = inject(DOCUMENT);
  private readonly root = this.document.documentElement;

  overlay = viewChild<ElementRef<HTMLElement>>("overlay");

  isDarkMode = computed(() => this.colorService.mode() === "dark");

  // Split swatches
  baseSwatches = computed(() => {
    return this.colorService
      .getColorSwatches()
      .filter((s) => s.name === "Background" || s.name === "Foreground");
  });

  primaryScale = computed(() => this.colorService.theme().primary);
  secondaryScale = computed(() => this.colorService.theme().secondary);

  constructor() {
    this.colorService.generatePalette();
    this.colorService.updateCSSVariables();
  }

  generatePalette(ev?: MouseEvent): void {
    this.root.style.setProperty("--x", ev ? `${ev.clientX}px` : "50vw");
    this.root.style.setProperty("--y", ev ? `${ev.clientY}px` : "50vh");
    this.colorService.generatePalette();
    this.colorService.updateCSSVariables();
    this.overlay()!.nativeElement.style.background = `rgba(${hexToRgb(
      this.colorService.theme().primary.DEFAULT,
    )} / 0.2)`;

    this.root.classList.add("theme-generate-animating");
    setTimeout(() => {
      this.root.classList.remove("theme-generate-animating");
    }, 300);
  }
  toggleThemeMode(ev?: MouseEvent): void {
    this.colorService.toggleThemeMode();
    this.colorService.generatePalette();

    this.root.style.setProperty("--x", ev ? `${ev.clientX}px` : "50vw");
    this.root.style.setProperty("--y", ev ? `${ev.clientY}px` : "50vh");

    this.overlay()!.nativeElement.style.background = `rgb(${hexToRgb(
      this.colorService.theme().bg,
    )})`;

    this.root.classList.add("theme-animating");
    setTimeout(() => {
      this.root.classList.remove("theme-animating");

      this.colorService.updateCSSVariables();
    }, 150);
  }

  updateActiveColor(type: "primary" | "secondary", shade: string): void {
    this.colorService.updateActiveShade(type, shade);
  }
}
