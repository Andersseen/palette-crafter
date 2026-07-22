import { Component, input } from "@angular/core";
import { VoltCard, VoltCardContent } from "@voltui/components";
import { MOVEMENT_DIRECTIVES } from "angular-movement";
import type { ColorSwatchType } from "@shared/types";

@Component({
  selector: "app-color-swatch",
  imports: [VoltCard, VoltCardContent, ...MOVEMENT_DIRECTIVES],
  template: `
    <volt-card
      class="group block cursor-pointer hover:shadow-md"
      moveInView="fade-up"
      [moveWhileHover]="{ scale: [1, 0.98] }"
      [moveWhileTap]="{ scale: [1, 0.95] }"
      [moveDuration]="180"
      (click)="copyToClipboard()"
    >
      <!-- oklab and hsl are the longest strings here and the first to overflow
           a phone; they reappear once there is room for them. -->
      @if (layout() === "row") {
        <volt-card-content class="flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
          <div
            class="h-12 w-14 shrink-0 rounded-md border shadow-inner border-foreground/10 sm:h-16 sm:w-32"
            [style.background-color]="swatch().hex"
          ></div>

          <div class="min-w-0 flex-1 space-y-1">
            <h4 class="font-semibold text-xs sm:text-sm">
              {{ swatch().name }}
            </h4>
            <div class="space-y-0.5 text-[10px] sm:text-xs opacity-70">
              <p class="font-mono">{{ swatch().hex.toUpperCase() }}</p>
              <p class="hidden font-mono truncate sm:block">
                {{ swatch().hsl }}
              </p>
              <p class="hidden font-mono truncate md:block">
                {{ swatch().oklab }}
              </p>
              <p class="font-mono truncate">{{ swatch().cssVar }}</p>
            </div>
          </div>

          <span
            class="hidden text-[10px] font-medium text-primary opacity-0 transition-opacity duration-200 group-hover:opacity-100 sm:block"
          >
            {{ copied ? "Copied!" : "Copy" }}
          </span>
        </volt-card-content>
      } @else {
        <volt-card-content class="pt-4 sm:pt-6">
          <div
            class="w-full h-10 sm:h-16 rounded-md mb-2 sm:mb-3 border shadow-inner border-foreground/10"
            [style.background-color]="swatch().hex"
          ></div>

          <div class="space-y-1">
            <h4 class="font-semibold text-xs sm:text-sm">
              {{ swatch().name }}
            </h4>
            <div class="space-y-1 text-[10px] sm:text-xs opacity-70">
              <p class="font-mono">{{ swatch().hex.toUpperCase() }}</p>
              <p class="hidden font-mono truncate sm:block">
                {{ swatch().hsl }}
              </p>
              <p class="hidden font-mono truncate md:block">
                {{ swatch().oklab }}
              </p>
              <p class="font-mono truncate">{{ swatch().cssVar }}</p>
            </div>
          </div>

          <div
            class="mt-1 hidden opacity-0 transition-opacity duration-200 group-hover:opacity-100 sm:mt-2 sm:block"
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
