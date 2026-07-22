import { Component, computed, inject, input, output } from "@angular/core";
import { VoltButton } from "@voltui/components";
import { MOVEMENT_DIRECTIVES } from "angular-movement";
import ColorPalette from "@services/color-palette";
import BrandColorInput from "./brand-color-input";
import ThemeOptions from "./theme-options";
import ThemeSwitcher from "./theme-switcher";

/**
 * Sticky command bar.
 *
 * Replaces the old centred hero: a marketing headline and an oversized
 * "Generate" button read as a landing page, and pushed the actual palette below
 * the fold. Controls now stay reachable while scrolling, and the meta chips
 * make the tool feel instrumented — you can always see which seed and harmony
 * produced what you are looking at.
 */
@Component({
  selector: "app-command-bar",
  imports: [
    VoltButton,
    BrandColorInput,
    ThemeOptions,
    ThemeSwitcher,
    ...MOVEMENT_DIRECTIVES,
  ],
  template: `
    <header
      class="sticky top-0 z-50 border-b border-foreground/10 bg-background/85 backdrop-blur-md"
    >
      <div class="mx-auto flex max-w-[1600px] flex-col gap-3 px-3 py-2.5 sm:px-5">
        <div class="flex items-center gap-2 sm:gap-3">
          <div class="flex min-w-0 items-center gap-2">
            <span
              class="h-6 w-6 shrink-0 rounded-md ring-1 ring-inset ring-foreground/15"
              [style.background]="primary()"
              aria-hidden="true"
            ></span>
            <h1 class="truncate text-sm font-semibold tracking-tight">
              Palette Crafter
            </h1>
          </div>

          <div class="ml-auto flex items-center gap-1.5 sm:gap-2">
            <volt-button
              size="sm"
              [disabled]="isLoading()"
              [moveWhileHover]="{ y: [0, -1] }"
              [moveWhileTap]="{ scale: [1, 0.96] }"
              [moveDuration]="160"
              (click)="generate.emit($event)"
            >
              <svg
                class="mr-1.5 h-3.5 w-3.5"
                [moveLoop]="isLoading() ? 'spin' : 'none'"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Generate
              <kbd
                class="ml-2 hidden rounded border border-current/30 px-1 text-[10px] leading-4 opacity-70 sm:inline"
                >G</kbd
              >
            </volt-button>

            <volt-button
              variant="outline"
              size="icon"
              [disabled]="isLoading()"
              [moveWhileHover]="{ rotate: [0, 12] }"
              [moveWhileTap]="{ scale: [1, 0.9] }"
              [moveDuration]="200"
              [title]="
                isDarkMode()
                  ? 'Switch to light mode (D)'
                  : 'Switch to dark mode (D)'
              "
              (click)="toggleMode.emit($event)"
            >
              <theme-switcher [isDarkMode]="isDarkMode()" />
              <!-- Named from the inside: volt-button renders its own inner
                   <button>, so an aria-label on this host never reaches it and
                   the control was announced as an unnamed button. -->
              <span class="sr-only">
                {{ isDarkMode() ? "Switch to light mode" : "Switch to dark mode" }}
              </span>
            </volt-button>

            <app-theme-options />
          </div>
        </div>

        <!-- Two independent rows on phones: the brand control and the chip
             strip each need the full width down there. -->
        <div
          class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3"
        >
          <app-brand-color-input class="min-w-0 shrink-0" />

          <!-- Provenance at a glance: the seed is what makes a palette
               reproducible, so it belongs on screen, not just in the URL. -->
          <ul
            class="-mx-1 flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto px-1 font-mono text-[11px] leading-none sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
          >
            @for (chip of chips(); track chip.label) {
              <li
                class="flex items-center gap-1 rounded-full border border-foreground/15 px-2 py-1"
                [title]="chip.title"
              >
                <span class="uppercase tracking-wide opacity-50">
                  {{ chip.label }}
                </span>
                <span class="max-w-[12ch] truncate">{{ chip.value }}</span>
              </li>
            }

            <li
              class="flex items-center gap-1 rounded-full border px-2 py-1"
              [class.border-foreground\\/15]="contrast().failing === 0"
              [class.border-danger]="contrast().failing > 0"
              [title]="
                contrast().failing === 0
                  ? 'Every text pair meets WCAG AA'
                  : contrast().failing + ' pair(s) below WCAG AA'
              "
            >
              <span class="uppercase tracking-wide opacity-50">wcag</span>
              <span>{{ contrast().passing }}/{{ contrast().checks.length }}</span>
            </li>
          </ul>
        </div>
      </div>
    </header>
  `,
})
export default class CommandBar {
  private readonly colorService = inject(ColorPalette);

  isDarkMode = input(false);
  isLoading = input(false);

  generate = output<MouseEvent>();
  toggleMode = output<MouseEvent>();

  primary = computed(() => this.colorService.theme().primary.DEFAULT);
  contrast = computed(() => this.colorService.contrastReport());

  chips = computed(() => {
    const meta = this.colorService.meta();

    if (!meta) {
      return [];
    }

    return [
      {
        label: "seed",
        value: meta.seed === undefined ? "random" : String(meta.seed),
        title:
          meta.seed === undefined
            ? "Unseeded — this palette cannot be reproduced"
            : `Reproduce with seed=${meta.seed}`,
      },
      {
        label: "harmony",
        value: meta.harmony,
        title: `Secondary hue is ${meta.secondaryHue}°`,
      },
      {
        label: "hue",
        value: `${meta.baseHue}°`,
        title: "Base hue",
      },
      {
        label: "algo",
        value: meta.algorithm,
        title: "Generation algorithm",
      },
    ];
  });
}
