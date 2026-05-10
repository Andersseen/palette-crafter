import { Component, computed, inject } from "@angular/core";
import {
  VoltCard,
  VoltCardContent,
  VoltCardHeader,
  VoltCardTitle,
} from "@voltui/components";
import ColorPalette from "@services/color-palette";
import type { ColorTokenMode, StatusColorName } from "@shared/types";

@Component({
  selector: "app-theme-options",
  imports: [
    VoltCard,
    VoltCardContent,
    VoltCardHeader,
    VoltCardTitle,
  ],
  template: `
    <section class="mb-8 sm:mb-12">
      <div class="mb-4 sm:mb-6">
        <h2 class="text-xl sm:text-2xl font-semibold">Theme Options</h2>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <volt-card>
          <volt-card-header>
            <volt-card-title>Brand Colors</volt-card-title>
          </volt-card-header>

          <volt-card-content class="space-y-4">
            @for (token of brandTokens; track token) {
              <div
                class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <span class="text-sm font-medium capitalize">{{ token }}</span>
                <div
                  class="inline-grid grid-cols-2 rounded-lg border border-border p-1 text-sm"
                >
                  <button
                    type="button"
                    class="rounded-md px-3 py-1.5 transition-colors"
                    [class.bg-primary]="colorModes()[token] === 'single'"
                    [class.text-primary-foreground]="colorModes()[token] === 'single'"
                    (click)="setColorMode(token, 'single')"
                  >
                    Single
                  </button>
                  <button
                    type="button"
                    class="rounded-md px-3 py-1.5 transition-colors"
                    [class.bg-primary]="colorModes()[token] === 'scale'"
                    [class.text-primary-foreground]="colorModes()[token] === 'scale'"
                    (click)="setColorMode(token, 'scale')"
                  >
                    Scale
                  </button>
                </div>
              </div>
            }
          </volt-card-content>
        </volt-card>

        <volt-card>
          <volt-card-header>
            <volt-card-title>Status Colors</volt-card-title>
          </volt-card-header>

          <volt-card-content>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              @for (status of statusTokens; track status) {
                <label
                  class="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
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
          </volt-card-content>
        </volt-card>
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
