import { Component, input, output } from "@angular/core";
import { VoltButton } from "@voltui/components";
import { MOVEMENT_DIRECTIVES } from "angular-movement";
import ThemeSwitcher from "./theme-switcher";

@Component({
  selector: "app-header",
  template: `
    <header class="border-b border-b-foreground/20">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <!-- Title and toggle stay on one row at every width: a full-bleed
             button wrapping a single icon read as a broken input on phones. -->
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <h1 class="text-xl sm:text-3xl lg:text-4xl font-bold">
              Palette Crafter
            </h1>
            <p class="text-sm sm:text-base lg:text-lg opacity-70 mt-1 sm:mt-2">
              Generate cohesive four-color themes instantly
            </p>
          </div>

          <volt-button
            variant="outline"
            size="icon"
            class="shrink-0"
            [disabled]="isLoading()"
            [moveWhileHover]="{ rotate: [0, 12] }"
            [moveWhileTap]="{ scale: [1, 0.9] }"
            [moveDuration]="200"
            [attr.aria-label]="
              isDarkMode() ? 'Switch to light mode' : 'Switch to dark mode'
            "
            [title]="
              isDarkMode() ? 'Switch to light mode' : 'Switch to dark mode'
            "
            (click)="toggleThemeMode.emit($event)"
          >
            <theme-switcher [isDarkMode]="isDarkMode()" />
          </volt-button>
        </div>
      </div>
    </header>
  `,
  imports: [ThemeSwitcher, VoltButton, ...MOVEMENT_DIRECTIVES],
})
export default class Header {
  isDarkMode = input();
  isLoading = input(false);
  toggleThemeMode = output<MouseEvent>();
}
