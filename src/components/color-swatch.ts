import { Component, input } from "@angular/core";
import { VoltCard, VoltCardContent } from "@voltui/components";
import type { ColorSwatchType } from "@shared/types";

@Component({
  selector: "app-color-swatch",
  imports: [VoltCard, VoltCardContent],
  template: `
    <volt-card
      class="group cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-95"
      (click)="copyToClipboard()"
    >
      <volt-card-content class="pt-6">
        <!-- Color Preview -->
        <div
          class="w-full h-12 sm:h-16 rounded-md mb-2 sm:mb-3 border shadow-inner border-foreground/10"
          [style.background-color]="swatch().hex"
        ></div>

        <!-- Color Info -->
        <div class="space-y-1">
          <h4 class="font-semibold text-xs sm:text-sm">
            {{ swatch().name }}
          </h4>
          <div class="space-y-1 text-[10px] sm:text-xs opacity-70">
            <p class="font-mono">{{ swatch().hex.toUpperCase() }}</p>
            <p class="font-mono">{{ swatch().hsl }}</p>
            <p class="font-mono">{{ swatch().oklab }}</p>
            <p class="font-mono">{{ swatch().cssVar }}</p>
          </div>
        </div>

        <!-- Copy Indicator -->
        <div
          class="mt-1 sm:mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        >
          <p class="text-[10px] sm:text-xs font-medium text-primary">
            {{ copied ? "Copied!" : "Click to copy" }}
          </p>
        </div>
      </volt-card-content>
    </volt-card>
  `,
})
export default class ColorSwatch {
  swatch = input.required<ColorSwatchType>();
  copied = false;

  async copyToClipboard(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.swatch().hex);
      this.copied = true;
      setTimeout(() => {
        this.copied = false;
      }, 2000);
    } catch (err) {
      console.error("Failed to copy color:", err);
    }
  }
}
