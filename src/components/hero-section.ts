import { Component, input, output } from "@angular/core";
import { VoltButton } from "@voltui/components";
import { MOVEMENT_DIRECTIVES } from "angular-movement";

@Component({
  selector: "app-hero-section",
  imports: [VoltButton, ...MOVEMENT_DIRECTIVES],
  template: `
    <section class="text-center mb-8 sm:mb-12 px-2">
      <!-- Hover/tap feedback comes from angular-movement rather than a
           hover:scale utility, so it obeys prefers-reduced-motion. -->
      <volt-button
        size="lg"
        class="w-full sm:w-auto"
        [disabled]="isLoading()"
        [moveWhileHover]="{ scale: [1, 1.04] }"
        [moveWhileTap]="{ scale: [1, 0.97] }"
        [moveDuration]="180"
        (click)="generatePalette.emit($event)"
      >
        <svg
          class="w-5 h-5 mr-2"
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
          ></path>
        </svg>
        {{ isLoading() ? "Generating..." : "Generate New Palette" }}
      </volt-button>

      <p class="mt-3 sm:mt-4 text-xs sm:text-sm opacity-60">
        {{ isDarkMode() ? "Dark" : "Light" }} mode • WCAG AA compliant •
        Harmonious colors
      </p>
    </section>
  `,
})
export default class HeroSection {
  isDarkMode = input();
  isLoading = input(false);
  generatePalette = output<MouseEvent>();
}
