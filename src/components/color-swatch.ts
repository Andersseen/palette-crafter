import { Component, input } from "@angular/core";
import { VoltCard, VoltCardContent } from "@voltui/components";
import { MOVEMENT_DIRECTIVES } from "angular-movement";
import type { ColorSwatchType } from "@shared/types";

@Component({
  selector: "app-color-swatch",
  imports: [VoltCard, VoltCardContent, ...MOVEMENT_DIRECTIVES],
  template: `
    <!-- A real button, not a clickable card: it was reachable only by mouse and
         announced as an unnamed generic element. -->
    <button
      type="button"
      class="group block w-full cursor-pointer text-left"
      moveEnter="fade-up"
      [moveWhileHover]="{ scale: [1, 0.98] }"
      [moveWhileTap]="{ scale: [1, 0.95] }"
      [moveDuration]="180"
      [attr.aria-label]="
        'Copy ' + swatch().name + ' color ' + swatch().hex.toUpperCase()
      "
      (click)="copyToClipboard()"
    >
    <volt-card class="block hover:shadow-md">
      <!-- oklab and hsl are the longest strings here and the first to overflow
           a phone; they reappear once there is room for them. -->
      <!-- Row layout lives in a ~280px rail, so it stays to two lines: the
           name and the hex. Longer notations are on the scale cards. -->
      @if (layout() === "row") {
        <volt-card-content class="flex items-center gap-2.5 p-2.5">
          <div
            class="h-9 w-9 shrink-0 rounded-md ring-1 ring-inset ring-foreground/10"
            [style.background-color]="swatch().hex"
          ></div>

          <div class="min-w-0 flex-1">
            <h4 class="truncate text-xs font-medium">{{ swatch().name }}</h4>
            <p class="truncate font-mono text-[11px] tabular-nums opacity-60">
              {{ copied ? "Copied!" : swatch().hex.toUpperCase() }}
            </p>
          </div>

          <!-- Hover affordance only: hidden on touch widths, where it just
               stole room from the label and truncated it. -->
          <svg
            class="hidden h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-50 lg:block"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
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
    </button>
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
