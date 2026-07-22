import {
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from "@angular/core";
import {
  VoltSeparator,
  VoltTabs,
  VoltTabsList,
  VoltTabsTrigger,
} from "@voltui/components";
import { MOVEMENT_DIRECTIVES, MoveTriggerDirective } from "angular-movement";
import ColorPalette from "@services/color-palette";
import ThemeReveal from "@services/theme-reveal";

import ColorSwatch from "@components/color-swatch";
import ColorScaleComponent from "@components/color-scale";
import CommandBar from "@components/command-bar";
import ContrastReport from "@components/contrast-report";
import ExportPanel from "@components/export-panel";
import Footer from "@components/footer";
import ThemePreview from "@components/theme-preview";
import type { BrandToken } from "@shared/types";

/** Sections the workspace can show, in the order they appear in the rail. */
const PANELS = ["scales", "preview", "export", "a11y"] as const;
type Panel = (typeof PANELS)[number];

@Component({
  selector: "app-home",
  imports: [
    ...MOVEMENT_DIRECTIVES,
    VoltSeparator,
    VoltTabs,
    VoltTabsList,
    VoltTabsTrigger,
    CommandBar,
    ThemePreview,
    ColorSwatch,
    ColorScaleComponent,
    ContrastReport,
    ExportPanel,
    Footer,
  ],
  host: {
    "(document:keydown)": "onKeydown($event)",
  },
  template: `
    <div class="flex min-h-screen flex-col bg-background text-foreground">
      <div
        #overlay
        id="theme-overlay"
        aria-hidden="true"
        [moveTrigger]="false"
        [moveFrames]="{}"
        [moveDuration]="520"
        moveEasing="cubic-bezier(0.22, 1, 0.36, 1)"
      ></div>

      <app-command-bar
        [isDarkMode]="isDarkMode()"
        [isLoading]="isLoading()"
        (generate)="generatePalette($event)"
        (toggleMode)="toggleThemeMode($event)"
      />

      @if (themeError(); as message) {
        <div
          class="border-b border-danger/40 bg-danger/10 px-4 py-2 text-sm"
          role="alert"
          moveEnter="fade-down"
        >
          {{ message }}
        </div>
      }

      <!-- Grows to fill the column so the footer stays at the bottom of the
           viewport on short panels instead of floating mid-page. -->
      <main
        class="mx-auto grid w-full max-w-[1600px] flex-1 content-start gap-6 px-3 py-5 sm:px-5 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-8"
      >
        <!-- Left rail: the palette's identity, always visible while you work
             through the panels on the right. -->
        <aside class="lg:sticky lg:top-[7.5rem] lg:self-start">
          <div class="space-y-4">
            <section>
              <h2 class="mb-2 text-[11px] font-semibold uppercase tracking-wider opacity-50">
                Base
              </h2>
              <div class="grid grid-cols-2 gap-2 lg:grid-cols-1" [moveStagger]="50">
                @for (swatch of baseSwatches(); track swatch.cssVar) {
                  <app-color-swatch [swatch]="swatch" layout="row" />
                }
              </div>
            </section>

            <volt-separator class="hidden lg:block" />

            <section>
              <h2 class="mb-2 text-[11px] font-semibold uppercase tracking-wider opacity-50">
                Brand
              </h2>
              <div class="grid grid-cols-2 gap-2 lg:grid-cols-1" [moveStagger]="50">
                @for (swatch of brandSwatches(); track swatch.cssVar) {
                  <app-color-swatch [swatch]="swatch" layout="row" />
                }
              </div>
            </section>

            @if (statusSwatches().length > 0) {
              <section>
                <h2 class="mb-2 text-[11px] font-semibold uppercase tracking-wider opacity-50">
                  Status
                </h2>
                <div class="grid grid-cols-2 gap-2 lg:grid-cols-1" [moveStagger]="50">
                  @for (swatch of statusSwatches(); track swatch.cssVar) {
                    <app-color-swatch [swatch]="swatch" layout="row" />
                  }
                </div>
              </section>
            }
          </div>
        </aside>

        <div class="relative min-w-0">
          <!-- Fallback overlay for browsers without the View Transitions API.
               Scoped to the panel column so it never blanks the whole UI. -->
          <div
            #paletteOverlay
            class="palette-overlay"
            aria-hidden="true"
            [moveTrigger]="false"
            [moveFrames]="{}"
            [moveDuration]="460"
            moveEasing="cubic-bezier(0.22, 1, 0.36, 1)"
          ></div>

          <!-- Panel switcher keeps the workspace to one screen instead of a
               long marketing-style scroll. -->
          <div class="mb-5 flex flex-wrap items-center justify-between gap-2">
            <volt-tabs
              [value]="activePanel()"
              (valueChange)="onPanelChange($event)"
            >
              <volt-tabs-list aria-label="Workspace panels">
                @for (panel of panels; track panel) {
                  <volt-tabs-trigger [value]="panel">
                    {{ panelLabels[panel] }}
                  </volt-tabs-trigger>
                }
              </volt-tabs-list>
            </volt-tabs>

            <span class="hidden items-center gap-2 text-[11px] opacity-45 lg:flex">
              @for (hint of shortcutHints; track hint.keys) {
                <span class="flex items-center gap-1">
                  <kbd class="rounded border border-foreground/25 px-1 font-mono leading-4">
                    {{ hint.keys }}
                  </kbd>
                  {{ hint.label }}
                </span>
              }
            </span>
          </div>

          @switch (activePanel()) {
            @case ("scales") {
              <div class="space-y-7" moveEnter="fade-up" [moveDuration]="220">
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
                  <div class="max-w-xl">
                    <h3 class="mb-2 text-sm font-semibold">Primary</h3>
                    <app-color-swatch [swatch]="brandSwatches()[0]" layout="row" />
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
                  <div class="max-w-xl">
                    <h3 class="mb-2 text-sm font-semibold">Secondary</h3>
                    <app-color-swatch [swatch]="brandSwatches()[1]" layout="row" />
                  </div>
                }
              </div>
            }
            @case ("preview") {
              <div moveEnter="fade-up" [moveDuration]="220">
                <app-theme-preview />
              </div>
            }
            @case ("export") {
              <div moveEnter="fade-up" [moveDuration]="220">
                <app-export-panel />
              </div>
            }
            @case ("a11y") {
              <div moveEnter="fade-up" [moveDuration]="220">
                <app-contrast-report />
              </div>
            }
          }
        </div>
      </main>

      <app-footer />
    </div>
  `,
})
export default class Home {
  private readonly colorService = inject(ColorPalette);
  private readonly reveal = inject(ThemeReveal);

  // Two overlays: full-viewport for the mode switch, scoped to the workspace
  // for generate. Read by name so each gets its own MoveTrigger.
  overlay = viewChild.required<ElementRef<HTMLElement>>("overlay");
  private overlayMotion = viewChild.required("overlay", {
    read: MoveTriggerDirective,
  });

  paletteOverlay = viewChild.required<ElementRef<HTMLElement>>("paletteOverlay");
  private paletteMotion = viewChild.required("paletteOverlay", {
    read: MoveTriggerDirective,
  });

  readonly panels = PANELS;
  readonly panelLabels: Record<Panel, string> = {
    scales: "Scales",
    preview: "Preview",
    export: "Export",
    a11y: "Accessibility",
  };

  readonly shortcutHints = [
    { keys: "G", label: "generate" },
    { keys: "D", label: "mode" },
    { keys: "1 2", label: "lock" },
  ];

  activePanel = signal<Panel>("scales");

  /** `volt-tabs` emits the raw trigger value. */
  onPanelChange(value: string | undefined): void {
    if (value) {
      this.activePanel.set(value as Panel);
    }
  }

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
  brandSwatches = computed(() => this.colorService.getBrandColorSwatches());
  statusSwatches = computed(() => this.colorService.getStatusColorSwatches());

  /**
   * Keyboard shortcuts, skipped while typing so the hex field stays usable.
   */
  onKeydown(event: KeyboardEvent): void {
    if (event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (
      target?.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName ?? "")
    ) {
      return;
    }

    switch (event.key.toLowerCase()) {
      case "g":
        event.preventDefault();
        void this.generatePalette();
        break;
      case "d":
        event.preventDefault();
        void this.toggleThemeMode();
        break;
      case "1":
        event.preventDefault();
        this.toggleLock("primary");
        break;
      case "2":
        event.preventDefault();
        this.toggleLock("secondary");
        break;
    }
  }

  /**
   * Generating reveals the new palette over the old one.
   *
   * Uses the same View Transition as the mode switch. The previous version
   * painted a solid slab over the workspace, committed behind it and then faded
   * it out: measured frame by frame the palette only changed at ~500ms, the
   * overlay was still at 0.03 opacity past 800ms, and the card cascade ran
   * hidden underneath it. Revealing needs both palettes on screen at once,
   * which only the snapshot mechanism provides.
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

    const origin = this.reveal.originOf(ev);
    const commit = () => this.colorService.commit(pending);

    // Shorter than the mode switch: generating is a repeat action (hold G).
    const revealed = await this.reveal.revealWithViewTransition(
      commit,
      origin,
      380,
    );

    if (!revealed) {
      await this.reveal.run(this.paletteMotion(), this.paletteOverlay(), {
        color: pending.theme.primary.DEFAULT,
        origin,
        commit,
        fadeOut: true,
        scope: "element",
      });
    }
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

    const origin = this.reveal.originOf(ev);
    const commit = () => this.colorService.commit(pending);

    // Preferred path: the new theme is clipped in over the old one, so the UI
    // is never blanked. Falls back to the colour overlay where the View
    // Transitions API is missing.
    const revealed = await this.reveal.revealWithViewTransition(commit, origin);

    if (!revealed) {
      await this.reveal.run(this.overlayMotion(), this.overlay(), {
        color: pending.theme.bg,
        origin,
        commit,
      });
    }
  }

  updateActiveColor(type: BrandToken, shade: string): void {
    this.colorService.updateActiveShade(type, shade);
  }

  toggleLock(token: BrandToken): void {
    this.colorService.toggleLocked(token);
  }
}
