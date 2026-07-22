import {
  Component,
  ElementRef,
  computed,
  inject,
  viewChild,
} from "@angular/core";
import { VoltButton } from "@voltui/components";
import { MOVEMENT_DIRECTIVES, MoveTriggerDirective } from "angular-movement";
import ColorPalette from "@services/color-palette";
import ThemeReveal from "@services/theme-reveal";

import BrandColorInput from "@components/brand-color-input";
import ColorSwatch from "@components/color-swatch";
import ColorScaleComponent from "@components/color-scale";
import ContrastReport from "@components/contrast-report";
import ExportPanel from "@components/export-panel";
import Footer from "@components/footer";
import Header from "@components/header";
import HeroSection from "@components/hero-section";
import ThemePreview from "@components/theme-preview";
import ThemeOptions from "@components/theme-options";
import type { BrandToken } from "@shared/types";

@Component({
  selector: "app-home",
  imports: [
    ...MOVEMENT_DIRECTIVES,
    VoltButton,
    ThemePreview,
    BrandColorInput,
    ColorSwatch,
    ColorScaleComponent,
    ContrastReport,
    ExportPanel,
    Header,
    HeroSection,
    ThemeOptions,
    Footer,
  ],
  template: `
    <section
      class="relative isolate min-h-screen overflow-x-hidden bg-background text-foreground"
    >
      <div
        #overlay
        id="theme-overlay"
        aria-hidden="true"
        [moveTrigger]="false"
        [moveFrames]="{}"
        [moveDuration]="520"
        moveEasing="cubic-bezier(0.22, 1, 0.36, 1)"
      ></div>

      <div class="blend-contrast flex min-h-screen flex-col">
        <app-header
          [isDarkMode]="isDarkMode()"
          [isLoading]="isLoading()"
          (toggleThemeMode)="toggleThemeMode($event)"
        />

        <!-- pb leaves room for the floating Theme Options button, which
             otherwise sits on top of the last section on small screens. -->
        <main
          class="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8 pb-24 sm:pb-28"
        >
          <app-hero-section
            [isDarkMode]="isDarkMode()"
            [isLoading]="isLoading()"
            (generatePalette)="generatePalette($event)"
          />

          <section class="mb-8 sm:mb-12 max-w-3xl mx-auto">
            <app-brand-color-input />
          </section>

          @if (themeError(); as message) {
            <div
              class="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-foreground/20 bg-background px-4 py-3 text-sm shadow-sm"
              role="alert"
              moveEnter="fade-down"
            >
              <p class="opacity-80">{{ message }}</p>
              <volt-button
                variant="outline"
                size="sm"
                class="shrink-0"
                [disabled]="isLoading()"
                (click)="retryTheme()"
              >
                Retry
              </volt-button>
            </div>
          }

          <!-- Base Colors (Bg/Fg) -->
          <section class="mb-8 sm:mb-12" moveInView="fade-up" [moveStagger]="60">
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
          <section class="mb-8 sm:mb-12 space-y-8" moveInView="fade-up">
            <h2 class="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6">
              Brand Colors
            </h2>

            @if (allBrandColorsAreSingle()) {
              <div
                class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 max-w-5xl"
              >
                @for (swatch of brandSwatches(); track swatch.cssVar) {
                  <app-color-swatch [swatch]="swatch" layout="row" />
                }
              </div>
            } @else {
              @if (colorModes().primary === "scale") {
                <app-color-scale
                  name="Primary"
                  type="primary"
                  [scale]="primaryScale()"
                  [locked]="locked().primary"
                  (updateActive)="updateActiveColor('primary', $event)"
                  (toggleLock)="toggleLock($event)"
                />
              } @else {
                <div>
                  <h3 class="text-lg font-semibold mb-3">Primary</h3>
                  <div class="max-w-2xl">
                    <app-color-swatch
                      [swatch]="brandSwatches()[0]"
                      layout="row"
                    />
                  </div>
                </div>
              }

              @if (colorModes().secondary === "scale") {
                <app-color-scale
                  name="Secondary"
                  type="secondary"
                  [scale]="secondaryScale()"
                  [locked]="locked().secondary"
                  (updateActive)="updateActiveColor('secondary', $event)"
                  (toggleLock)="toggleLock($event)"
                />
              } @else {
                <div>
                  <h3 class="text-lg font-semibold mb-3">Secondary</h3>
                  <div class="max-w-2xl">
                    <app-color-swatch
                      [swatch]="brandSwatches()[1]"
                      layout="row"
                    />
                  </div>
                </div>
              }
            }
          </section>

          @if (statusSwatches().length > 0) {
            <section class="mb-8 sm:mb-12" moveInView="fade-up">
              <h2 class="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6">
                Status Colors
              </h2>
              <div
                class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 max-w-5xl"
              >
                @for (swatch of statusSwatches(); track swatch.cssVar) {
                  <app-color-swatch [swatch]="swatch" layout="row" />
                }
              </div>
            </section>
          }

          <section class="mb-8 sm:mb-12" moveInView="fade-up">
            <app-contrast-report />
          </section>

          <section class="mb-8 sm:mb-12" moveInView="fade-up">
            <app-theme-preview />
          </section>

          <section moveInView="fade-up">
            <app-export-panel />
          </section>
        </main>

        <app-footer />
      </div>

      <app-theme-options />
    </section>
  `,
})
export default class Home {
  private readonly colorService = inject(ColorPalette);
  private readonly reveal = inject(ThemeReveal);

  overlay = viewChild.required<ElementRef<HTMLElement>>("overlay");
  private overlayMotion = viewChild.required(MoveTriggerDirective);

  isDarkMode = computed(() => this.colorService.mode() === "dark");
  isLoading = computed(() => this.colorService.isLoading());
  themeError = computed(() => this.colorService.error());

  baseSwatches = computed(() =>
    this.colorService
      .getColorSwatches()
      .filter((s) => s.name === "Background" || s.name === "Foreground"),
  );

  primaryScale = computed(() => this.colorService.theme().primary);
  secondaryScale = computed(() => this.colorService.theme().secondary);
  colorModes = computed(() => this.colorService.selectedColorModes());
  locked = computed(() => this.colorService.locked());
  allBrandColorsAreSingle = computed(() => {
    const modes = this.colorModes();
    return modes.primary === "single" && modes.secondary === "single";
  });
  brandSwatches = computed(() => this.colorService.getBrandColorSwatches());
  statusSwatches = computed(() => this.colorService.getStatusColorSwatches());

  // No generation call here: the service seeds itself synchronously, so the
  // prerendered HTML already carries the real palette. Kicking off a request
  // from this constructor is what used to overwrite a restored palette and
  // make the cache pointless.

  /**
   * Generating sweeps the new primary across the page, then dissolves to show
   * the palette it produced — the brand color announces itself first.
   */
  async generatePalette(ev?: MouseEvent): Promise<void> {
    if (this.isLoading()) {
      return;
    }

    const pending = await this.colorService.prepare({
      seed: this.colorService.mintSeed(),
    });

    if (!pending) {
      return;
    }

    await this.reveal.run(this.overlayMotion(), this.overlay(), {
      color: pending.theme.primary.DEFAULT,
      origin: this.reveal.originOf(ev),
      commit: () => this.colorService.commit(pending),
      fadeOut: true,
    });
  }

  /**
   * Switching mode wipes straight to the incoming background, so the old and
   * new themes never appear on screen at the same time.
   */
  async toggleThemeMode(ev?: MouseEvent): Promise<void> {
    if (this.isLoading()) {
      return;
    }

    const meta = this.colorService.meta();
    const pending = await this.colorService.prepare({
      mode: this.isDarkMode() ? "light" : "dark",
      seed: meta?.seed,
      harmony: meta?.harmony,
      ...(meta?.baseColor
        ? { baseColor: meta.baseColor }
        : { baseHue: meta?.baseHue }),
    });

    if (!pending) {
      return;
    }

    await this.reveal.run(this.overlayMotion(), this.overlay(), {
      color: pending.theme.bg,
      origin: this.reveal.originOf(ev),
      commit: () => this.colorService.commit(pending),
    });
  }

  updateActiveColor(type: BrandToken, shade: string): void {
    this.colorService.updateActiveShade(type, shade);
  }

  toggleLock(token: BrandToken): void {
    this.colorService.toggleLocked(token);
  }

  retryTheme(): void {
    void this.generatePalette();
  }
}
