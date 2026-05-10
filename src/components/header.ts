import { Component, input, output } from "@angular/core";
import ThemeSwitcher from "./theme-switcher";

@Component({
  selector: "app-header",
  template: `
    <header class="border-b border-b-foreground/20">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div
          class="flex flex-col sm:flex-row items-center sm:justify-between gap-4 sm:gap-0"
        >
          <div class="w-full sm:w-auto text-center sm:text-left">
            <h1 class="text-2xl sm:text-4xl font-bold">Palette Crafter</h1>
            <p class="text-base sm:text-lg opacity-70 mt-1 sm:mt-2">
              Generate cohesive four-color themes instantly
            </p>
          </div>
          <button
            class="mt-2 sm:mt-0 p-2 rounded-lg border transition-all duration-200 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 w-full sm:w-auto disabled:cursor-not-allowed disabled:opacity-60"
            style="border-color: rgb(var(--fg) / 0.3); color: rgb(var(--fg) / 1); focus:ring-color: rgb(var(--primary) / 1)"
            (click)="toggleThemeMode.emit($event)"
            [disabled]="isLoading()"
            [title]="
              isDarkMode() ? 'Switch to light mode' : 'Switch to dark mode'
            "
          >
            <theme-switcher [isDarkMode]="isDarkMode()" />
          </button>
        </div>
      </div>
    </header>
  `,
  imports: [ThemeSwitcher],
})
export default class Header {
  isDarkMode = input();
  isLoading = input(false);
  toggleThemeMode = output<MouseEvent>();
}
