import { Component, computed, input, output } from "@angular/core";
import { VoltButton } from "@voltui/components";
import { MOVEMENT_DIRECTIVES } from "angular-movement";
import type { BrandToken, ColorScale } from "@shared/types";
import {
  bestForeground,
  calculateContrast,
  hexToHsl,
  hexToOklab,
} from "@shared/utils";

@Component({
  selector: "app-color-scale",
  imports: [VoltButton, ...MOVEMENT_DIRECTIVES],
  template: `
    <div class="w-full space-y-3">
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <h3 class="text-lg font-semibold capitalize">{{ name() }}</h3>
          <span class="text-xs opacity-60 font-mono">{{
            scale().DEFAULT
          }}</span>
        </div>

        <volt-button
          size="sm"
          [variant]="locked() ? 'solid' : 'outline'"
          [attr.aria-pressed]="locked()"
          [moveWhileTap]="{ scale: [1, 0.94] }"
          [title]="
            locked()
              ? name() + ' is locked and will survive the next generate'
              : 'Lock ' + name() + ' so generating keeps it'
          "
          (click)="toggleLock.emit(type())"
        >
          @if (locked()) {
            <svg
              class="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            Locked
          } @else {
            <svg
              class="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 11V7a4 4 0 118 0m-4 8v2M6 21h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
              />
            </svg>
            Lock
          }
        </volt-button>
      </div>

      <!-- Compact squares on phones: eleven 3:4 cards two-per-row turned one
           scale into six screens of scrolling. Detail appears as space allows. -->
      <div
        class="grid grid-cols-4 min-[420px]:grid-cols-6 sm:grid-cols-6 lg:grid-cols-11 gap-1.5 sm:gap-2 lg:gap-3"
        [moveStagger]="35"
      >
        @for (item of scaleItems(); track item.key) {
          <button
            type="button"
            moveInView="zoom-in"
            [moveWhileHover]="{ scale: [1, 1.08], y: [0, -4] }"
            [moveWhileTap]="{ scale: [1, 0.96] }"
            [moveDuration]="200"
            class="group relative flex aspect-square flex-col justify-between overflow-hidden rounded-lg p-1.5 text-left hover:z-10 hover:shadow-lg border border-black/5 dark:border-white/5 sm:rounded-xl sm:p-2 lg:aspect-[3/4] lg:p-3"
            [style.background-color]="item.value"
            [style.color]="item.foreground"
            [attr.aria-label]="
              'Set ' + name() + ' to shade ' + item.key + ', ' + item.value
            "
            [attr.aria-pressed]="item.value === scale().DEFAULT"
            (click)="handleCardClick(item.value)"
          >
            <span class="text-[11px] font-bold opacity-90 sm:text-sm">
              {{ item.key }}
            </span>

            <span class="mt-auto flex flex-col gap-0.5 lg:gap-1">
              <span
                class="hidden truncate font-mono text-[10px] opacity-70 sm:block"
                (click)="copyToClipboard(item.value, $event)"
                title="Copy HEX"
              >
                {{ item.value.toUpperCase() }}
              </span>

              <span
                class="hidden truncate font-mono text-[10px] opacity-60 hover:opacity-100 xl:block"
                (click)="copyToClipboard(item.hsl, $event)"
                title="Copy HSL"
              >
                {{ item.hsl }}
              </span>

              <span
                class="hidden truncate font-mono text-[10px] opacity-60 hover:opacity-100 xl:block"
                (click)="copyToClipboard(item.oklab, $event)"
                title="Copy Oklab"
              >
                {{ item.oklab }}
              </span>
            </span>

            @if (item.value === scale().DEFAULT) {
              <span
                class="pointer-events-none absolute inset-0 rounded-lg border-2 border-white/50 ring-2 ring-inset ring-black/20 dark:border-black/50 dark:ring-white/20 sm:rounded-xl"
              ></span>
              <svg
                class="absolute right-1 top-1 h-3 w-3 opacity-80 sm:right-2 sm:top-2 sm:h-4 sm:w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="3"
                  d="M5 13l4 4L19 7"
                ></path>
              </svg>
            }
          </button>
        }
      </div>
    </div>
  `,
})
export default class ColorScaleComponent {
  name = input.required<string>();
  scale = input.required<ColorScale>();
  type = input.required<BrandToken>();
  locked = input(false);

  updateActive = output<string>();
  toggleLock = output<BrandToken>();

  scaleItems = computed(() => {
    const scale = this.scale();
    const keys = [
      50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950,
    ] as const;

    return keys.map((key) => {
      const hex = scale[key];
      const hsl = hexToHsl(hex);
      const oklab = hexToOklab(hex);

      return {
        key,
        value: hex,
        // Picks the better of white/black. The previous rule fell back to black
        // whenever white missed 4.5:1, even when black was the worse of the two.
        foreground: bestForeground(hex),
        contrast: Math.round(calculateContrast(hex, bestForeground(hex)) * 10) / 10,
        hsl: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
        oklab: `oklab(${oklab.l.toFixed(3)} ${oklab.a.toFixed(
          3,
        )} ${oklab.b.toFixed(3)})`,
      };
    });
  });

  handleCardClick(hex: string): void {
    this.updateActive.emit(hex);
  }

  async copyToClipboard(text: string, ev: MouseEvent): Promise<void> {
    ev.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  }
}
