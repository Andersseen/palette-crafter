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
    <!-- Lives in the command bar now. The old fixed bottom-right button
         covered the last section on small screens. -->
    @if (isBrowser) {
      <volt-button size="sm" variant="outline" [voltDialog]="themeOptionsDialog">
        <svg
          class="h-3.5 w-3.5 sm:mr-1.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <span class="hidden sm:inline">Options</span>
      </volt-button>

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
