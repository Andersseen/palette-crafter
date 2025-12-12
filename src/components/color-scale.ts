import { Component, input, computed, output } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ColorScale } from "@shared/types";
import { hexToHsl, hexToOklab, calculateContrast } from "@shared/utils";

@Component({
  selector: "app-color-scale",
  imports: [CommonModule],
  template: `
    <div class="w-full space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold capitalize">{{ name() }}</h3>
        <span class="text-xs opacity-60 font-mono">{{ scale().DEFAULT }}</span>
      </div>

      <div
        class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-11 gap-4"
      >
        @for (item of scaleItems(); track item.key) {
        <div
          class="group relative flex flex-col justify-between p-3 rounded-xl transition-all hover:scale-105 hover:shadow-lg cursor-pointer border border-black/5 dark:border-white/5 aspect-[3/4]"
          [style.background-color]="item.value"
          [style.color]="getContrastColor(item.value)"
          (click)="handleCardClick(item.value)"
        >
          <div class="flex flex-col items-start gap-1">
            <span class="text-sm font-bold opacity-90">{{ item.key }}</span>
          </div>

          <div class="flex flex-col gap-1 mt-auto">
            <!-- Values - Click to copy specific format -->
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
  type = input.required<"primary" | "secondary">(); // New input

  updateActive = output<string>(); // Emit new shade value

  scaleItems = computed(() => {
    const s = this.scale();
    const keys = [
      50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950,
    ] as const;
    return keys.map((key) => {
      const hex = s[key];
      const hsl = hexToHsl(hex);
      const oklab = hexToOklab(hex);
      return {
        key,
        value: hex,
        hsl: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
        oklab: `oklab(${oklab.l.toFixed(3)} ${oklab.a.toFixed(
          3
        )} ${oklab.b.toFixed(3)})`,
      };
    });
  });

  getContrastColor(hex: string): string {
    return calculateContrast(hex, "#ffffff") >= 4.5 ? "#ffffff" : "#000000";
  }

  handleCardClick(hex: string): void {
    this.updateActive.emit(hex);
  }

  async copyToClipboard(text: string, ev: MouseEvent): Promise<void> {
    ev.stopPropagation(); // Prevent card click
    try {
      await navigator.clipboard.writeText(text);
      // Optional: Toast or feedback
    } catch (err) {
      console.error("Failed to copy", err);
    }
  }
}
