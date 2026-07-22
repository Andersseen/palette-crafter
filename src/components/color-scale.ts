import { Component, computed, input, output } from "@angular/core";
import type { BrandToken, ColorScale } from "@shared/types";
import {
  bestForeground,
  calculateContrast,
  hexToHsl,
  hexToOklab,
} from "@shared/utils";

@Component({
  selector: "app-color-scale",
  template: `
    <div class="w-full space-y-3">
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <h3 class="text-lg font-semibold capitalize">{{ name() }}</h3>
          <span class="text-xs opacity-60 font-mono">{{
            scale().DEFAULT
          }}</span>
        </div>

        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-md border border-foreground/20 px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-foreground/10"
          [class.bg-foreground\\/10]="locked()"
          [attr.aria-pressed]="locked()"
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
        </button>
      </div>

      <div
        class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-11 gap-4"
      >
        @for (item of scaleItems(); track item.key) {
          <div
            class="group relative flex flex-col justify-between p-3 rounded-xl transition-all hover:scale-105 hover:shadow-lg cursor-pointer border border-black/5 dark:border-white/5 aspect-[3/4]"
            [style.background-color]="item.value"
            [style.color]="item.foreground"
            (click)="handleCardClick(item.value)"
          >
            <div class="flex items-start justify-between gap-1">
              <span class="text-sm font-bold opacity-90">{{ item.key }}</span>
            </div>

            <div class="flex flex-col gap-1 mt-auto">
              <button
                class="text-left text-[10px] font-mono opacity-60 hover:opacity-100 hover:font-bold transition-all truncate w-full"
                (click)="copyToClipboard(item.value, $event)"
                title="Copy HEX"
              >
                {{ item.value.toUpperCase() }}
              </button>

              <button
                class="text-left text-[10px] font-mono opacity-60 hover:opacity-100 hover:font-bold transition-all truncate w-full"
                (click)="copyToClipboard(item.hsl, $event)"
                title="Copy HSL"
              >
                {{ item.hsl }}
              </button>

              <button
                class="text-left text-[10px] font-mono opacity-60 hover:opacity-100 hover:font-bold transition-all truncate w-full"
                (click)="copyToClipboard(item.oklab, $event)"
                title="Copy Oklab"
              >
                {{ item.oklab }}
              </button>
            </div>

            @if (item.value === scale().DEFAULT) {
              <div
                class="absolute inset-0 border-2 border-white/50 dark:border-black/50 rounded-xl pointer-events-none ring-2 ring-inset ring-black/20 dark:ring-white/20"
              ></div>
              <div class="absolute top-2 right-2">
                <svg
                  class="w-4 h-4 opacity-80"
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
              </div>
            }
          </div>
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
