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
      @if (layout() === "row") {
        <volt-card-content class="flex items-center gap-4 p-4">
          <div
            class="h-16 w-24 shrink-0 rounded-md border shadow-inner border-foreground/10 sm:w-32"
            [style.background-color]="swatch().hex"
          ></div>

          <div class="min-w-0 flex-1 space-y-1">
            <h4 class="font-semibold text-xs sm:text-sm">
              {{ swatch().name }}
            </h4>
            <div class="space-y-0.5 text-[10px] sm:text-xs opacity-70">
              <p class="font-mono">{{ swatch().hex.toUpperCase() }}</p>
              <p class="font-mono truncate">{{ swatch().hsl }}</p>
              <p class="font-mono truncate">{{ swatch().oklab }}</p>
              <p class="font-mono">{{ swatch().cssVar }}</p>
            </div>
          </div>

          <span
            class="hidden text-[10px] font-medium text-primary opacity-0 transition-opacity duration-200 group-hover:opacity-100 sm:block"
          >
            {{ copied ? "Copied!" : "Copy" }}
          </span>
        </volt-card-content>
      } @else {
        <volt-card-content class="pt-6">
          <div
            class="w-full h-12 sm:h-16 rounded-md mb-2 sm:mb-3 border shadow-inner border-foreground/10"
            [style.background-color]="swatch().hex"
          ></div>

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

          <div
            class="mt-1 sm:mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          >
            <p class="text-[10px] sm:text-xs font-medium text-primary">
              {{ copied ? "Copied!" : "Click to copy" }}
            </p>
          </div>
        </volt-card-content>
      }
    </volt-card>
  `,
})
export default class ColorSwatch {
  swatch = input.required<ColorSwatchType>();
  layout = input<"card" | "row">("card");
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
