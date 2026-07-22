import { isPlatformBrowser } from "@angular/common";
import { Component, PLATFORM_ID, computed, inject } from "@angular/core";
import {
  VoltButton,
  VoltDialog,
  VoltDialogContent,
  VoltDialogDescription,
  VoltDialogOverlay,
  VoltDialogTitle,
  VoltSeparator,
  VoltSwitch,
  VoltToggleGroup,
  VoltToggleGroupItem,
} from "@voltui/components";
import { MOVEMENT_DIRECTIVES } from "angular-movement";
import ColorPalette from "@services/color-palette";
import type { ColorTokenMode, StatusColorName } from "@shared/types";

@Component({
  selector: "app-theme-options",
  imports: [
    VoltButton,
    VoltDialog,
    VoltDialogContent,
    VoltDialogDescription,
    VoltDialogOverlay,
    VoltDialogTitle,
    VoltSeparator,
    VoltSwitch,
    VoltToggleGroup,
    VoltToggleGroupItem,
    ...MOVEMENT_DIRECTIVES,
  ],
  template: `
    @if (isBrowser) {
      <div class="fixed bottom-4 right-4 z-40 sm:bottom-6 sm:right-6">
        <volt-button
          size="md"
          variant="outline"
          [voltDialog]="themeOptionsDialog"
        >
          Theme Options
        </volt-button>
      </div>

      <ng-template #themeOptionsDialog>
        <div voltDialogOverlay></div>

        <section
          voltDialogContent
          variant="drawer-right"
          class="flex w-full max-w-md flex-col bg-background text-foreground p-0"
        >
          <header
            class="flex items-center justify-between gap-3 border-b border-border px-5 py-4"
          >
            <div>
              <h2 voltDialogTitle class="text-foreground">Theme Options</h2>
              <p voltDialogDescription class="text-muted-foreground">
                Configure the preview and export.
              </p>
            </div>
          </header>

          <div class="flex-1 space-y-6 overflow-auto px-5 py-5">
            <section class="space-y-4">
              <h3 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Brand Colors
              </h3>

              @for (token of brandTokens; track token) {
                <div
                  class="grid grid-cols-[1fr_auto] items-center gap-4 rounded-lg border border-border px-3 py-3"
                >
                  <span class="text-sm font-medium capitalize text-foreground">
                    {{ token }}
                  </span>

                  <!-- A toggle group carries the "pick exactly one" semantics
                       that two independent buttons only imitated. -->
                  <volt-toggle-group
                    type="single"
                    [value]="[colorModes()[token]]"
                    (valueChange)="onColorMode(token, $event)"
                  >
                    <volt-toggle-group-item value="single" size="sm">
                      Single
                    </volt-toggle-group-item>
                    <volt-toggle-group-item value="scale" size="sm">
                      Scale
                    </volt-toggle-group-item>
                  </volt-toggle-group>
                </div>
              }
            </section>

            <volt-separator />

            <section class="space-y-4">
              <h3 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Status Colors
              </h3>

              <div class="grid gap-3 sm:grid-cols-2">
                @for (status of statusTokens; track status) {
                  <label
                    class="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border px-3 py-3 text-sm text-foreground hover:bg-accent"
                  >
                    <span class="capitalize">{{ status }}</span>
                    <volt-switch
                      [checked]="enabledStatusColors()[status]"
                      (checkedChange)="setStatusColor(status, $event)"
                    />
                  </label>
                }
              </div>
            </section>
          </div>
        </section>
      </ng-template>
    }
  `,
})
export default class ThemeOptions {
  private readonly colorService = inject(ColorPalette);
  private readonly platformId = inject(PLATFORM_ID);
  readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly brandTokens = ["primary", "secondary"] as const;
  readonly statusTokens = ["info", "success", "warning", "danger"] as const;

  colorModes = computed(() => this.colorService.selectedColorModes());
  enabledStatusColors = computed(() => this.colorService.enabledStatusColors());

  /**
   * `volt-toggle-group` always emits an array, even in `single` mode, and emits
   * an empty one when the active item is deselected — which we ignore so a
   * token always has a mode.
   */
  onColorMode(token: "primary" | "secondary", value: string[]): void {
    const mode = value[0] as ColorTokenMode | undefined;

    if (mode) {
      this.colorService.setColorTokenMode(token, mode);
    }
  }

  setStatusColor(status: StatusColorName, enabled: boolean): void {
    this.colorService.setStatusColorEnabled(status, enabled);
  }
}
