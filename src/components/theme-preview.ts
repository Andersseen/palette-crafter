import { Component } from "@angular/core";

@Component({
  selector: "app-theme-preview",
  template: `
    <div class="space-y-6 px-2 sm:px-0">
      <div class="text-center">
        <h2 class="text-2xl sm:text-3xl font-bold mb-2 sm:mb-4">
          Theme Preview
        </h2>
        <p class="text-base sm:text-lg opacity-80">
          See how your generated palette looks in action
        </p>
      </div>

      <!-- Sample Card -->
      <div class="p-4 sm:p-6 rounded-lg border shadow-sm border-foreground/20">
        <h3 class="text-lg sm:text-xl font-semibold mb-2 sm:mb-3">
          Sample Card Component
        </h3>
        <p class="mb-3 sm:mb-4 opacity-70 text-sm sm:text-base">
          This demonstrates how your theme will look with typical UI elements.
          The colors automatically maintain proper contrast ratios for
          accessibility.
        </p>

        <div
          class="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 items-stretch sm:items-center"
        >
          <button
            class="w-full sm:w-auto px-4 py-2 rounded-md font-medium transition-all duration-200 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 bg-primary focus:ring-primary text-primary-contrast"
          >
            Primary Action
          </button>

          <button
            class="w-full sm:w-auto px-4 py-2 rounded-md font-medium transition-all duration-200 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 bg-secondary focus:ring-primary text-secondary-contrast"
          >
            Secondary Action
          </button>

          <button
            class="w-full sm:w-auto px-4 py-2 rounded-md font-medium border transition-all duration-200 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 border-foreground/30 focus:ring-primary text-foreground"
          >
            Outline Button
          </button>
        </div>
      </div>

      <!-- Sample List -->
      <div class="p-4 sm:p-6 rounded-lg border shadow-sm border-foreground/20">
        <h3 class="text-base sm:text-lg font-semibold mb-3 sm:mb-4">
          Feature List
        </h3>
        <ul class="space-y-2">
          <li class="flex items-center">
            <span class="w-2 h-2 rounded-full mr-3 bg-primary"></span>
            <span class="text-xs sm:text-sm">WCAG AA contrast compliance</span>
          </li>
          <li class="flex items-center">
            <span class="w-2 h-2 rounded-full mr-3 bg-secondary"></span>
            <span class="text-xs sm:text-sm"
              >Harmonious color relationships</span
            >
          </li>
          <li class="flex items-center">
            <span class="w-2 h-2 rounded-full mr-3 bg-primary"></span>
            <span class="text-xs sm:text-sm">Dark and light mode support</span>
          </li>
        </ul>
      </div>
    </div>
  `,
})
export default class ThemePreview {}
