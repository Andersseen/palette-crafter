import { Component, computed, inject } from "@angular/core";
import ColorPalette from "@services/color-palette";
import type { ColorTokenMode, StatusColorName } from "@shared/types";

@Component({
  selector: "app-theme-options",
  template: `
    <section class="mb-8 sm:mb-12">
      <div class="mb-4 sm:mb-6">
        <h2 class="text-xl sm:text-2xl font-semibold">Theme Options</h2>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div class="rounded-lg border border-foreground/20 p-4 space-y-4">
          <h3 class="text-base font-semibold">Brand Colors</h3>

          @for (token of brandTokens; track token) {
            <div
              class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            >
              <span class="text-sm font-medium capitalize">{{ token }}</span>
              <div
                class="inline-grid grid-cols-2 rounded-lg border border-foreground/20 p-1 text-sm"
              >
                <button
                  type="button"
                  class="rounded-md px-3 py-1.5 transition-colors"
                  [class.bg-primary]="colorModes()[token] === 'single'"
                  [class.text-primary-contrast]="colorModes()[token] === 'single'"
                  (click)="setColorMode(token, 'single')"
                >
                  Single
                </button>
                <button
                  type="button"
                  class="rounded-md px-3 py-1.5 transition-colors"
                  [class.bg-primary]="colorModes()[token] === 'scale'"
                  [class.text-primary-contrast]="colorModes()[token] === 'scale'"
                  (click)="setColorMode(token, 'scale')"
                >
                  Scale
                </button>
              </div>
            </div>
          }
        </div>

        <div class="rounded-lg border border-foreground/20 p-4 space-y-4">
          <h3 class="text-base font-semibold">Status Colors</h3>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            @for (status of statusTokens; track status) {
              <label
                class="flex cursor-pointer items-center gap-2 rounded-md border border-foreground/20 px-3 py-2 text-sm hover:bg-foreground/10"
              >
                <input
                  class="h-4 w-4 accent-current"
                  type="checkbox"
                  [checked]="enabledStatusColors()[status]"
                  (change)="toggleStatusColor(status, $event)"
                />
                <span class="capitalize">{{ status }}</span>
              </label>
            }
          </div>
        </div>
      </div>
    </section>
  `,
})
export default class ThemeOptions {
  private readonly colorService = inject(ColorPalette);

  readonly brandTokens = ["primary", "secondary"] as const;
  readonly statusTokens = ["info", "success", "warning", "danger"] as const;

  colorModes = computed(() => this.colorService.selectedColorModes());
  enabledStatusColors = computed(() => this.colorService.enabledStatusColors());

  setColorMode(token: "primary" | "secondary", mode: ColorTokenMode): void {
    this.colorService.setColorTokenMode(token, mode);
  }

  toggleStatusColor(status: StatusColorName, event: Event): void {
    const input = event.target as HTMLInputElement;
    this.colorService.setStatusColorEnabled(status, input.checked);
  }
}
