import { Component, input, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ColorScale } from "@shared/types";
import { hexToHsl, hslToHex, calculateContrast } from "@shared/utils";

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
        class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-11 gap-2"
      >
        @for (item of scaleItems(); track item.key) {
        <div
          class="group relative flex flex-col justify-between p-2 rounded-lg aspect-square transition-all hover:scale-105 hover:shadow-lg cursor-pointer border border-black/5 dark:border-white/5"
          [style.background-color]="item.value"
          [style.color]="getContrastColor(item.value)"
          (click)="copyToClipboard(item.value)"
        >
          <div class="flex flex-col items-start gap-0.5">
            <span class="text-xs font-bold opacity-80">{{ item.key }}</span>
          </div>
          <div class="flex flex-col items-end gap-0.5">
            <span class="text-[10px] font-mono opacity-70">{{
              item.value
            }}</span>
          </div>

          @if (item.value === scale().DEFAULT) {
          <div
            class="absolute inset-0 border-2 border-foreground/50 rounded-lg pointer-events-none"
          ></div>
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

  scaleItems = computed(() => {
    const s = this.scale();
    const keys = [
      50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950,
    ] as const;
    return keys.map((key) => ({
      key,
      value: s[key],
    }));
  });

  getContrastColor(hex: string): string {
    return calculateContrast(hex, "#ffffff") >= 4.5 ? "#ffffff" : "#000000";
  }

  async copyToClipboard(hex: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(hex);
      // Optional: Toast or feedback (omitted for simplicity as strict dependency wasn't requested)
    } catch (err) {
      console.error("Failed to copy", err);
    }
  }
}
